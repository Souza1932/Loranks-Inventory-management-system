/**
 * ============================================================
 * Sanitizacao / Validacao
 * ------------------------------------------------------------
 * Camada única de defesa usada por todo o painel antes de
 * qualquer valor (vindo de dados de exemplo hoje, e do backend
 * via ConsultasProduto no futuro) tocar o DOM. Mesmo com o uso
 * exclusivo de textContent/createElement (que já impede a
 * interpretação de HTML/script), mantemos esta camada para:
 *   - normalizar tipos (evitar NaN, undefined, objetos soltos);
 *   - impedir strings absurdamente longas de quebrar o layout;
 *   - remover caracteres de controle invisíveis;
 *   - garantir que valores usados em atributos de estilo (cor)
 *     sigam um formato estritamente conhecido, já que ali um
 *     valor malicioso poderia interferir no CSS.
 * ============================================================
 */
const Sanitizacao = {
  // Tetos generosos por design: existem só para barrar o que é claramente
  // inválido (Infinity, overflow numérico, payload corrompido) — nunca para
  // limitar cadastro real. Nome de produto, quantidade em estoque e tamanho
  // de catálogo não têm limite de negócio aqui; o teto é só uma rede de
  // segurança várias ordens de grandeza acima do que qualquer uso real chega.
  TAMANHO_MAXIMO_TEXTO_PADRAO: 300, // nomes de produto bem descritivos cabem tranquilamente
  NUMERO_MAXIMO_PADRAO: Number.MAX_SAFE_INTEGER, // maior inteiro que o JS representa com precisão — não é um limite de negócio, é o limite do próprio tipo numérico
  TAMANHO_MAXIMO_LISTA_PADRAO: 50_000, // muito acima de qualquer catálogo real; protege só contra payload corrompido/ataque

  /**
   * Garante uma string "segura para exibição": converte para
   * string, remove caracteres de controle/zero-width e os
   * caracteres `<` `>` (segunda camada de defesa contra HTML/script
   * — mesmo usando apenas textContent/createElement no restante do
   * código, não dependemos de um único mecanismo de proteção),
   * colapsa espaços e corta no tamanho máximo permitido.
   * Nunca lança erro — na dúvida, retorna o valor de reserva.
   */
  sanitizarTexto(valor, { tamanhoMaximo = this.TAMANHO_MAXIMO_TEXTO_PADRAO, valorReserva = '' } = {}) {
    if (typeof valor !== 'string' && typeof valor !== 'number') {
      return valorReserva;
    }

    const comoTexto = String(valor)
      // remove caracteres de controle (inclui quebras de linha) e zero-width
      .replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g, '')
      // remove marcadores de tag HTML como camada extra de defesa
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (comoTexto.length === 0) {
      return valorReserva;
    }

    return comoTexto.length > tamanhoMaximo
      ? `${comoTexto.slice(0, tamanhoMaximo - 1)}…`
      : comoTexto;
  },

  /**
   * Valida um número finito, restrito por padrão a um intervalo
   * plausível [0, NUMERO_MAXIMO_PADRAO]. Retorna null quando o
   * valor é inválido ou está fora do intervalo, para que o
   * chamador decida como reagir (descartar registro, usar um
   * padrão etc.) em vez de deixar NaN/Infinity/valores absurdos
   * vazarem para a tela ou para cálculos de percentual.
   */
  paraNumeroFinito(valor, { permitirNegativo = false, maximo = this.NUMERO_MAXIMO_PADRAO } = {}) {
    // Precisa vir antes da conversão: Number(null) === 0, Number('') === 0,
    // Number(undefined) === NaN via coerção "silenciosa" — sem esta checagem,
    // um valor ausente (ex.: preço não informado) seria tratado como "0"
    // válido em vez de "sem valor", escondendo a ausência do dado.
    if (valor === null || valor === undefined || valor === '') {
      return null;
    }

    const numero = typeof valor === 'number' ? valor : Number(valor);

    if (!Number.isFinite(numero)) {
      return null;
    }

    if (!permitirNegativo && numero < 0) {
      return null;
    }

    if (numero > maximo) {
      return null;
    }

    return numero;
  },

  /**
   * Interpreta um valor monetário digitado livremente pelo usuário, em
   * qualquer um dos formatos comuns, e devolve um número puro (com ponto
   * decimal), pronto pra API - que só aceita esse formato (ex.: 1700.5),
   * nunca "1.700,50" ou "1700,5".
   *
   * Aceita, todos apontando pro mesmo valor 1700.5:
   *   "1.700,50"  (padrão BR: ponto de milhar, vírgula decimal)
   *   "1700,50"   (BR sem milhar)
   *   "1,700.50"  (padrão EN: vírgula de milhar, ponto decimal)
   *   "1700.50"   (EN sem milhar)
   *   "1700.5" / "1700,5"
   *
   * Regra para decidir o que é separador decimal x de milhar:
   *   - Se o texto tem ',' E '.': o que aparecer por último é o decimal
   *     (o outro é sempre milhar, não importa quantas vezes se repita).
   *   - Se só tem UM dos dois símbolos: olha os dígitos depois da ÚLTIMA
   *     ocorrência. Exatamente 3 dígitos → é milhar (ex.: "1.700" = 1700,
   *     "1,700" = 1700). Qualquer outra quantidade → é decimal (ex.:
   *     "1.700" continuaria ambíguo só neste ramo, mas "17.5" = 17.5,
   *     "19,90" = 19.90). Preço em reais nunca tem 3 casas decimais, então
   *     esse "3 dígitos = milhar" não colide com centavos de verdade.
   *
   * Retorna null se, depois de limpo, não sobrar um número válido -
   * mesmo contrato de paraNumeroFinito, pro chamador tratar do mesmo jeito.
   */
  paraNumeroMonetario(valor, opcoes = {}) {
    if (typeof valor !== 'string' && typeof valor !== 'number') {
      return null;
    }

    // Já é number (ex.: reaproveitando um valor que veio do backend) - só
    // valida, sem tentar reinterpretar separadores.
    if (typeof valor === 'number') {
      return this.paraNumeroFinito(valor, opcoes);
    }

    // Mantém só dígitos, ',', '.' e '-' - descarta "R$", espaços etc.,
    // pra aceitar tanto "1.700,00" quanto "R$ 1.700,00".
    let texto = valor.trim().replace(/[^0-9,.\-]/g, '');
    if (texto === '') {
      return null;
    }

    const negativo = texto.startsWith('-');
    texto = texto.replace(/-/g, '');

    const temVirgula = texto.includes(',');
    const temPonto = texto.includes('.');
    let normalizado;

    if (temVirgula && temPonto) {
      const decimal = texto.lastIndexOf(',') > texto.lastIndexOf('.') ? ',' : '.';
      const milhar = decimal === ',' ? '.' : ',';
      const partes = texto.split(milhar).join('').split(decimal);
      const casas = partes.pop();
      normalizado = `${partes.join('')}.${casas}`;
    } else if (temVirgula || temPonto) {
      const separador = temVirgula ? ',' : '.';
      const partes = texto.split(separador);
      const ultimaParte = partes[partes.length - 1];
      normalizado = ultimaParte.length === 3
        ? partes.join('') // separador de milhar
        : `${partes.slice(0, -1).join('')}.${ultimaParte}`; // separador decimal
    } else {
      normalizado = texto;
    }

    const numero = Number(normalizado);
    if (!Number.isFinite(numero)) {
      return null;
    }

    return this.paraNumeroFinito(negativo ? -numero : numero, opcoes);
  },

  /** Formato estrito de cor hexadecimal (#rgb ou #rrggbb). */
  ehCorHexValida(valor) {
    return typeof valor === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(valor);
  },

  /**
   * Valida um id de elemento DOM (usado pelos construtores dos
   * componentes de renderização). Precisa ser uma string não vazia
   * e razoavelmente curta — nunca deve vir de entrada do usuário
   * nesta tela, mas validamos assim mesmo por consistência.
   */
  ehIdDomValido(valor) {
    return typeof valor === 'string' && valor.trim().length > 0 && valor.length <= 128;
  },

  /**
   * Normaliza uma lista de entrada: garante que é um array e limita
   * seu tamanho, para impedir que uma resposta anormalmente grande
   * (erro de integração, dado malicioso etc.) trave a renderização.
   */
  paraListaLimitada(valor, { tamanhoMaximo = this.TAMANHO_MAXIMO_LISTA_PADRAO, rotulo = 'lista' } = {}) {
    if (!Array.isArray(valor)) {
      if (valor !== undefined && valor !== null) {
        console.warn(`Valor recebido para "${rotulo}" não é uma lista; ignorando.`, valor);
      }
      return [];
    }

    if (valor.length > tamanhoMaximo) {
      console.warn(`Lista "${rotulo}" excede o tamanho máximo permitido (${tamanhoMaximo}); truncando.`);
      return valor.slice(0, tamanhoMaximo);
    }

    return valor;
  },

  /** Usada apenas como último recurso quando uma cor é inválida. */
  COR_RESERVA: '#7c6b76',
};

// Congela o utilitário para que nada em runtime altere as regras de
// sanitização/validação (defesa contra adulteração acidental ou maliciosa).
Object.freeze(Sanitizacao);

/**
 * Um produto e sua quantidade atualmente armazenada,
 * usado para calcular sua participação no estoque total.
 * Todo dado é sanitizado/validado na construção: um registro
 * malformado nunca chega a ser renderizado com valores brutos.
 */
class ProdutoEmEstoque {
  constructor(nome, quantidadeArmazenada) {
    this.nome = Sanitizacao.sanitizarTexto(nome, { valorReserva: 'Produto sem nome' });

    const quantidadeValidada = Sanitizacao.paraNumeroFinito(quantidadeArmazenada);
    this.quantidadeArmazenada = quantidadeValidada === null ? 0 : quantidadeValidada;
  }
}

/**
 * Calcula, a partir de uma lista de produtos, o percentual que
 * cada um representa em relação à quantidade total armazenada.
 */
class DistribuicaoDeEstoquePorProduto {
  constructor(produtosEmEstoque) {
    // Aceita apenas instâncias válidas de ProdutoEmEstoque; qualquer
    // outra coisa na lista é descartada silenciosamente (com aviso).
    const listaLimitada = Sanitizacao.paraListaLimitada(produtosEmEstoque, { rotulo: 'produtosEmEstoque' });
    this.produtosEmEstoque = listaLimitada.filter((produto) => {
      const valido = produto instanceof ProdutoEmEstoque;
      if (!valido) {
        console.warn('Registro de produto ignorado por não ser um ProdutoEmEstoque válido:', produto);
      }
      return valido;
    });
  }

  get quantidadeTotalArmazenada() {
    return this.produtosEmEstoque.reduce((total, produto) => total + produto.quantidadeArmazenada, 0);
  }

  calcularParticipacoes() {
    const total = this.quantidadeTotalArmazenada;

    return this.produtosEmEstoque.map((produto) => ({
      produto,
      percentual: total === 0 ? 0 : (produto.quantidadeArmazenada / total) * 100,
    }));
  }
}

/**
 * Controla a renderização do gráfico de pizza (via conic-gradient)
 * que mostra a participação de cada produto no estoque total,
 * junto de sua legenda com nome, quantidade e percentual.
 *
 * Toda a legenda é construída via createElement + textContent —
 * nenhum dado de produto passa por innerHTML.
 */
class GraficoPizzaDistribuicaoEstoque {
  constructor(idPizza, idLegenda) {
    if (!Sanitizacao.ehIdDomValido(idPizza) || !Sanitizacao.ehIdDomValido(idLegenda)) {
      console.error('GraficoPizzaDistribuicaoEstoque recebeu id(s) inválido(s):', { idPizza, idLegenda });
    }

    this.elementoPizza = Sanitizacao.ehIdDomValido(idPizza) ? document.getElementById(idPizza) : null;
    this.elementoLegenda = Sanitizacao.ehIdDomValido(idLegenda) ? document.getElementById(idLegenda) : null;

    // getContext só existe em elementos <canvas>; validamos aqui para não
    // quebrar caso o id aponte para outro tipo de elemento por engano.
    this.contextoPizza = null;
    if (this.elementoPizza && typeof this.elementoPizza.getContext === 'function') {
      this.contextoPizza = this.elementoPizza.getContext('2d');
    }
    if (this.elementoPizza && !this.contextoPizza) {
      console.error('Elemento de id "%s" não é um <canvas> válido ou o navegador não suporta canvas 2D.', idPizza);
    }

    // Sem paleta fixa: as cores são geradas dinamicamente por índice (ver
    // _obterCorPorIndice), então o gráfico se adapta a qualquer quantidade
    // de produtos sem repetir cores nem precisar de um teto pré-definido.
  }

  renderizar(distribuicaoDeEstoque) {
    if (!this.elementoPizza || !this.elementoLegenda || !this.contextoPizza) {
      console.error('Elementos do gráfico de distribuição não encontrados ou inválidos no DOM.');
      return;
    }

    const participacoes = distribuicaoDeEstoque.calcularParticipacoes();

    this._desenharPizza(participacoes);
    this._montarLegenda(participacoes);
    this._atualizarDescricaoAcessivel(participacoes);
  }

  /**
   * Gera uma cor hex determinística para cada índice usando o ângulo áureo
   * (~137,508°) em HSL. Essa técnica maximiza a distância perceptual entre
   * matizes consecutivos, então funciona para QUALQUER quantidade de
   * produtos (3, 30 ou 300) sem repetir cores nem depender de uma paleta
   * fixa com tamanho limitado — requisito de não sabermos de antemão
   * quantos produtos serão cadastrados.
   */
  _obterCorPorIndice(indice) {
    const ANGULO_AUREO_GRAUS = 137.508;
    const SATURACAO = 62;
    const LUMINOSIDADE = 48;

    const indiceValidado = Number.isInteger(indice) && indice >= 0 ? indice : 0;
    const matiz = (indiceValidado * ANGULO_AUREO_GRAUS) % 360;

    const corGerada = this._hslParaHex(matiz, SATURACAO, LUMINOSIDADE);

    // Ainda validamos o resultado com o mesmo verificador usado em todo o
    // painel: se por algum motivo a conversão gerar algo fora do formato
    // hex esperado, cai na cor de reserva em vez de quebrar o desenho.
    return Sanitizacao.ehCorHexValida(corGerada) ? corGerada : Sanitizacao.COR_RESERVA;
  }

  /** Converte HSL (matiz em graus, saturação/luminosidade em %) para hex. */
  _hslParaHex(matiz, saturacaoPercentual, luminosidadePercentual) {
    const s = saturacaoPercentual / 100;
    const l = luminosidadePercentual / 100;
    const k = (n) => (n + matiz / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const paraHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
    return `#${paraHex(f(0))}${paraHex(f(8))}${paraHex(f(4))}`;
  }

  /**
   * Lê uma variável de cor do CSS (definida em estilo.css) para uso
   * dentro do canvas — o contexto 2D não entende `var(--cor-x)`, então
   * precisamos resolver o valor computado manualmente. Sanitizamos o
   * resultado com o mesmo validador de cor hex usado no resto do
   * painel: se a variável não existir ou vier corrompida, cai no
   * valor de reserva em vez de quebrar o desenho.
   */
  _obterCorVariavelCss(nomeVariavel, corReserva) {
    try {
      const valor = getComputedStyle(document.documentElement).getPropertyValue(nomeVariavel).trim();
      return Sanitizacao.ehCorHexValida(valor) ? valor : corReserva;
    } catch (erro) {
      return corReserva;
    }
  }

  /**
   * Desenha o gráfico de pizza pixel a pixel no canvas (Canvas 2D API),
   * substituindo o antigo truque via CSS conic-gradient por um gráfico
   * real. Ajusta a resolução interna pelo devicePixelRatio para o
   * desenho sair nítido também em telas retina/alta densidade.
   */
  _desenharPizza(participacoes) {
    const canvas = this.elementoPizza;
    const contexto = this.contextoPizza;

    // Tamanho visual (CSS) do canvas — não confundir com canvas.width/height,
    // que controlam a resolução interna do bitmap.
    const tamanhoCss = canvas.clientWidth || parseInt(canvas.getAttribute('width'), 10) || 220;
    const razaoPixel = Math.max(1, window.devicePixelRatio || 1);

    canvas.width = tamanhoCss * razaoPixel;
    canvas.height = tamanhoCss * razaoPixel;
    contexto.setTransform(razaoPixel, 0, 0, razaoPixel, 0, 0);
    contexto.clearRect(0, 0, tamanhoCss, tamanhoCss);

    const centro = tamanhoCss / 2;
    const raio = centro;

    // Estoque vazio (sem produtos): desenha um círculo neutro em vez de
    // deixar o canvas em branco, para o usuário entender que não há dados.
    if (participacoes.length === 0) {
      contexto.beginPath();
      contexto.arc(centro, centro, raio, 0, Math.PI * 2);
      contexto.fillStyle = this._obterCorVariavelCss('--cor-borda', '#e7dde3');
      contexto.fill();
      return;
    }

    const DUAS_VEZES_PI = Math.PI * 2;
    let anguloInicial = -Math.PI / 2; // começa às 12h, igual ao conic-gradient anterior

    participacoes.forEach((participacao, indice) => {
      // Percentuais já vêm calculados como número finito; ainda assim
      // garantimos que nunca desenhamos um ângulo fora do intervalo válido.
      const percentual = Math.min(100, Math.max(0, participacao.percentual || 0));
      const anguloVarredura = (percentual / 100) * DUAS_VEZES_PI;
      const anguloFinal = anguloInicial + anguloVarredura;

      contexto.beginPath();
      contexto.moveTo(centro, centro);
      contexto.arc(centro, centro, raio, anguloInicial, anguloFinal);
      contexto.closePath();
      contexto.fillStyle = this._obterCorPorIndice(indice);
      contexto.fill();

      anguloInicial = anguloFinal;
    });
  }

  /**
   * Define um rótulo acessível (aria-label) resumindo a distribuição em
   * texto, já que o conteúdo de um <canvas> não é lido por leitores de
   * tela. O texto é montado a partir de dados já sanitizados (nome do
   * produto passa por Sanitizacao.sanitizarTexto lá em ProdutoEmEstoque),
   * então é seguro concatenar aqui.
   */
  _atualizarDescricaoAcessivel(participacoes) {
    const resumo = participacoes
      .map((p) => `${p.produto.nome}: ${Math.round(p.percentual)}%`)
      .join(', ');

    this.elementoPizza.setAttribute('role', 'img');
    this.elementoPizza.setAttribute(
      'aria-label',
      resumo ? `Gráfico de distribuição de estoque por produto: ${resumo}.` : 'Gráfico de distribuição de estoque: sem produtos cadastrados.'
    );
  }

  _montarLegenda(participacoes) {
    // Limpa a legenda de forma segura (sem innerHTML = '').
    this.elementoLegenda.replaceChildren();

    if (participacoes.length === 0) {
      const vazio = document.createElement('p');
      vazio.className = 'legenda-distribuicao-estoque__vazio';
      vazio.textContent = Idioma.traduzir('painel.grafico.semProdutos');
      this.elementoLegenda.appendChild(vazio);
      return;
    }

    const fragmento = document.createDocumentFragment();

    participacoes.forEach((participacao, indice) => {
      fragmento.appendChild(this._criarItemLegenda(participacao, indice));
    });

    this.elementoLegenda.appendChild(fragmento);
  }

  _criarItemLegenda(participacao, indice) {
    const item = document.createElement('div');
    item.className = 'legenda-distribuicao-estoque__item';

    const marcador = document.createElement('span');
    marcador.className = 'legenda-distribuicao-estoque__marcador';
    marcador.style.background = this._obterCorPorIndice(indice);

    const nome = document.createElement('span');
    nome.className = 'legenda-distribuicao-estoque__nome';
    nome.textContent = participacao.produto.nome;

    const quantidade = document.createElement('span');
    quantidade.className = 'legenda-distribuicao-estoque__quantidade';
    quantidade.textContent = `${participacao.produto.quantidadeArmazenada} un`;

    const percentualNumero = Number.isFinite(participacao.percentual) ? participacao.percentual : 0;
    const percentual = document.createElement('span');
    percentual.className = 'legenda-distribuicao-estoque__percentual';
    percentual.textContent = `${percentualNumero.toFixed(0)}%`;

    item.append(marcador, nome, quantidade, percentual);
    return item;
  }
}

/**
 * Unidades de medida aceitas na lista de produtos críticos.
 * Qualquer unidade fora desta lista é substituída por "un" —
 * evita que um valor inesperado vaze para a tela sem contexto.
 */
// Nota: Object.freeze não torna um Set verdadeiramente imutável (não bloqueia
// .add()/.delete()), então a garantia real aqui é o escopo: esta constante
// nunca é exposta fora deste módulo nem reatribuída em nenhum outro ponto.
const UNIDADES_DE_MEDIDA_PERMITIDAS = new Set(['un', 'l', 'ml', 'kg', 'g', 'm', 'cm', 'cx', 'pct']);

/**
 * Um produto cujo estoque atual está abaixo do mínimo definido
 * em EstoqueMinimo, usado para alimentar a lista de atenção.
 */
class ProdutoAbaixoDoMinimo {
  constructor(nome, unidadeMedida, quantidadeAtual, quantidadeMinima) {
    this.nome = Sanitizacao.sanitizarTexto(nome, { valorReserva: 'Produto sem nome' });

    const unidadeSanitizada = Sanitizacao.sanitizarTexto(unidadeMedida, { tamanhoMaximo: 6, valorReserva: 'un' });
    this.unidadeMedida = UNIDADES_DE_MEDIDA_PERMITIDAS.has(unidadeSanitizada.toLowerCase())
      ? unidadeSanitizada.toLowerCase()
      : 'un';

    const atualValidada = Sanitizacao.paraNumeroFinito(quantidadeAtual);
    this.quantidadeAtual = atualValidada === null ? 0 : atualValidada;

    const minimaValidada = Sanitizacao.paraNumeroFinito(quantidadeMinima);
    this.quantidadeMinima = minimaValidada === null ? 0 : minimaValidada;
  }

  get estaEsgotado() {
    return this.quantidadeAtual <= 0;
  }
}

/**
 * Renderiza a lista de produtos que estão abaixo do estoque
 * mínimo, destacando os que já estão esgotados.
 *
 * Toda a lista é construída via createElement + textContent —
 * nenhum dado de produto passa por innerHTML.
 */
class ListaProdutosCriticos {
  constructor(idLista) {
    if (!Sanitizacao.ehIdDomValido(idLista)) {
      console.error('ListaProdutosCriticos recebeu id inválido:', idLista);
    }

    this.elementoLista = Sanitizacao.ehIdDomValido(idLista) ? document.getElementById(idLista) : null;
  }

  renderizar(produtosAbaixoDoMinimo) {
    if (!this.elementoLista) {
      console.error('Elemento da lista de produtos críticos não encontrado no DOM.');
      return;
    }

    const listaLimitada = Sanitizacao.paraListaLimitada(produtosAbaixoDoMinimo, { rotulo: 'produtosAbaixoDoMinimo' });
    const produtosValidos = listaLimitada.filter((produto) => {
      const valido = produto instanceof ProdutoAbaixoDoMinimo;
      if (!valido) {
        console.warn('Registro de produto crítico ignorado por não ser um ProdutoAbaixoDoMinimo válido:', produto);
      }
      return valido;
    });

    this.elementoLista.replaceChildren();

    if (produtosValidos.length === 0) {
      const vazio = document.createElement('li');
      vazio.className = 'lista-produtos-criticos__vazio';
      vazio.textContent = Idioma.traduzir('painel.criticos.semProdutos');
      this.elementoLista.appendChild(vazio);
      return;
    }

    const fragmento = document.createDocumentFragment();
    produtosValidos.forEach((produto) => fragmento.appendChild(this._criarItem(produto)));
    this.elementoLista.appendChild(fragmento);
  }

  _criarItem(produto) {
    const item = document.createElement('li');
    item.className = 'produto-critico';

    const info = document.createElement('div');

    const nome = document.createElement('div');
    nome.className = 'produto-critico__nome';
    nome.textContent = produto.nome;

    const unidade = document.createElement('div');
    unidade.className = 'produto-critico__unidade';
    unidade.textContent = `${produto.quantidadeAtual} ${produto.unidadeMedida} · mínimo: ${produto.quantidadeMinima} ${produto.unidadeMedida}`;

    info.append(nome, unidade);

    const selo = document.createElement('span');
    selo.classList.add('selo-situacao', produto.estaEsgotado ? 'selo-situacao--esgotado' : 'selo-situacao--baixo');
    selo.textContent = produto.estaEsgotado ? 'Esgotado' : 'Baixo';

    item.append(info, selo);
    return item;
  }
}

/**
 * Um indicador numérico exibido na faixa de resumo do painel
 * (ex.: total de produtos, valor investido em estoque).
 */
class IndicadorEstoque {
  constructor(rotulo, valorFormatado, corDestaque) {
    this.rotulo = Sanitizacao.sanitizarTexto(rotulo, { tamanhoMaximo: 60, valorReserva: 'Indicador' });
    this.valorFormatado = Sanitizacao.sanitizarTexto(valorFormatado, { tamanhoMaximo: 40, valorReserva: '—' });

    // Cor usada em atributo de estilo: só aceitamos hex estrito.
    // Qualquer outro valor (inclusive tentativa de injeção via
    // "; background:url(...)" etc.) cai na cor de reserva.
    this.corDestaque = Sanitizacao.ehCorHexValida(corDestaque) ? corDestaque : Sanitizacao.COR_RESERVA;
  }
}

/**
 * Renderiza a faixa de indicadores gerais no topo do painel.
 *
 * Construído via createElement + textContent — nenhum dado de
 * indicador passa por innerHTML. A cor é aplicada via
 * style.setProperty, já validada como hex estrito em IndicadorEstoque.
 */
class GradeIndicadoresEstoque {
  constructor(idContainer) {
    if (!Sanitizacao.ehIdDomValido(idContainer)) {
      console.error('GradeIndicadoresEstoque recebeu id inválido:', idContainer);
    }

    this.elementoContainer = Sanitizacao.ehIdDomValido(idContainer) ? document.getElementById(idContainer) : null;
  }

  renderizar(indicadores) {
    if (!this.elementoContainer) {
      console.error('Elemento da grade de indicadores não encontrado no DOM.');
      return;
    }

    const listaLimitada = Sanitizacao.paraListaLimitada(indicadores, { tamanhoMaximo: 100, rotulo: 'indicadores' });
    const indicadoresValidos = listaLimitada.filter((indicador) => {
      const valido = indicador instanceof IndicadorEstoque;
      if (!valido) {
        console.warn('Indicador ignorado por não ser um IndicadorEstoque válido:', indicador);
      }
      return valido;
    });

    this.elementoContainer.replaceChildren();
    // Quantidade de indicadores varia (4 pra quem não é admin, até 6 pra
    // quem é) - a grade usa essa contagem pra abrir exatamente uma
    // coluna por indicador, então os cards ficam sempre lado a lado numa
    // única fileira, nunca quebrando linha (ver .grade-indicadores em
    // estilo.css).
    this.elementoContainer.style.setProperty('--total-indicadores', indicadoresValidos.length);

    const fragmento = document.createDocumentFragment();
    indicadoresValidos.forEach((indicador) => fragmento.appendChild(this._criarCartaoIndicador(indicador)));
    this.elementoContainer.appendChild(fragmento);
  }

  _criarCartaoIndicador(indicador) {
    const cartao = document.createElement('div');
    cartao.className = 'indicador-estoque';
    cartao.style.setProperty('--indicador-cor', indicador.corDestaque);

    const rotulo = document.createElement('div');
    rotulo.className = 'indicador-estoque__rotulo';
    rotulo.textContent = indicador.rotulo;

    const valor = document.createElement('div');
    valor.className = 'indicador-estoque__valor';
    valor.textContent = indicador.valorFormatado;

    cartao.append(rotulo, valor);
    return cartao;
  }
}

/**
 * Cores semânticas fixas usadas nos 4 indicadores de resumo do topo do
 * painel. Diferente da paleta do gráfico de pizza (que precisa ser
 * dinâmica porque a quantidade de produtos é ilimitada), aqui a
 * quantidade de indicadores é sempre a mesma (4 métricas fixas), então
 * cores fixas fazem sentido.
 */
/**
 * Roteador central das páginas de tela cheia (Painel, Perfil,
 * Movimentação - NÃO modais como Cadastro/Planilha, que continuam se
 * sobrepondo por cima, isso é intencional).
 *
 * Antes, cada página só sabia esconder A SI MESMA e "a outra página"
 * (sempre o Painel, fixo) - então navegar Painel -> Perfil ->
 * Movimentação deixava o Perfil visível por baixo da Movimentação, as
 * duas ao mesmo tempo na tela. Esta função resolve isso escondendo
 * TODA seção `.pagina` de uma vez e mostrando só a pedida - não importa
 * de qual página o usuário estava vindo.
 */
function mostrarPagina(idPaginaAlvo, idBotaoNavAtivo) {
  document.querySelectorAll('.pagina').forEach((pagina) => {
    pagina.hidden = pagina.id !== idPaginaAlvo;
  });
  document.querySelectorAll('.item-navegacao').forEach((botao) => {
    botao.classList.toggle('item-navegacao--ativo', botao.id === idBotaoNavAtivo);
  });
}

const CORES_INDICADORES = Object.freeze({
  destaque: '#a13c8a',
  sucesso: '#2f8f72',
  alerta: '#d69a1f',
  critico: '#c23c4d',
  financeiro: '#3d7a99',
});

/**
 * Calcula os indicadores de resumo a partir dos dados reais já
 * carregados — nenhum valor é inventado ou sorteado. Os quatro primeiros
 * indicadores vêm de ProdutoEmEstoque/ProdutoAbaixoDoMinimo (contagens);
 * os dois financeiros (valor investido/valor de venda) vêm à parte, de
 * /api/estoque/produtos-completos (mesma fonte que a Planilha usa), pois
 * é o único endpoint que carrega preço por produto.
 *
 * @param totaisFinanceiros { valorInvestido: number|null, valorVenda: number }
 *   valorInvestido vem null quando o usuário não é administrador (preço de
 *   custo é oculto pelo backend nesse caso - ver ProdutoService) ou quando
 *   nenhum produto tem preço de custo cadastrado; nesses casos o indicador
 *   correspondente nem é criado, em vez de mostrar "R$ 0,00" enganosamente.
 * @param isAdmin controla a exibição de "Valor de venda potencial" - o
 *   backend também oculta precoVenda pra usuário comum (ver ProdutoService
 *   e a Planilha, que agora esconde a coluna inteira pra quem não é
 *   admin), então essa gate aqui no Painel é redundante com a do servidor,
 *   mas mantida por clareza e porque totaisFinanceiros.valorVenda soma 0
 *   (não null) quando todos os precoVenda vêm null.
 */
function calcularIndicadoresReais(produtosEmEstoque, produtosAbaixoDoMinimo, totaisFinanceiros, isAdmin) {
  const totalDeProdutos = produtosEmEstoque.length;
  const quantidadeTotalEmEstoque = produtosEmEstoque.reduce((total, produto) => total + produto.quantidadeArmazenada, 0);
  const totalAbaixoDoMinimo = produtosAbaixoDoMinimo.length;
  const totalEsgotados = produtosAbaixoDoMinimo.filter((produto) => produto.estaEsgotado).length;

  const formatadorNumero = new Intl.NumberFormat('pt-BR');
  const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const indicadores = [
    new IndicadorEstoque(Idioma.traduzir('painel.indicadores.produtosCadastrados'), formatadorNumero.format(totalDeProdutos), CORES_INDICADORES.destaque),
    new IndicadorEstoque(Idioma.traduzir('painel.indicadores.unidadesEmEstoque'), formatadorNumero.format(quantidadeTotalEmEstoque), CORES_INDICADORES.sucesso),
    new IndicadorEstoque(Idioma.traduzir('painel.indicadores.abaixoDoMinimo'), formatadorNumero.format(totalAbaixoDoMinimo), CORES_INDICADORES.alerta),
    new IndicadorEstoque(Idioma.traduzir('painel.indicadores.esgotados'), formatadorNumero.format(totalEsgotados), CORES_INDICADORES.critico),
  ];

  if (totaisFinanceiros && totaisFinanceiros.valorInvestido !== null) {
    indicadores.push(new IndicadorEstoque(
      Idioma.traduzir('painel.indicadores.valorInvestido'),
      formatadorMoeda.format(totaisFinanceiros.valorInvestido),
      CORES_INDICADORES.financeiro,
    ));
  }
  if (isAdmin && totaisFinanceiros && totaisFinanceiros.valorVenda !== null) {
    indicadores.push(new IndicadorEstoque(
      Idioma.traduzir('painel.indicadores.valorVenda'),
      formatadorMoeda.format(totaisFinanceiros.valorVenda),
      CORES_INDICADORES.financeiro,
    ));
  }

  return indicadores;
}

/**
 * ============================================================
 * Integração com dados reais
 * ------------------------------------------------------------
 * Estas duas funções são o ÚNICO ponto de integração com a fonte de
 * dados real do sistema (Hibernate/ConsultasProduto, endpoint REST,
 * dado injetado pelo backend no template, etc.). De propósito, NÃO
 * fabricam dados de demonstração — o sistema vai para produção, então
 * até a integração real ser conectada, o painel mostra um estado vazio
 * (ver _mostrarEstadoVazio em cada componente) em vez de números
 * inventados.
 *
 * Ajuste o corpo de cada função para buscar os dados reais. Exemplo,
 * se a fonte for um endpoint REST:
 *
 *   async function obterProdutosEmEstoque() {
 *     const resposta = await fetch('/api/estoque/produtos');
 *     if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
 *     const dados = await resposta.json();
 *     return dados.map((item) => new ProdutoEmEstoque(item.nome, item.quantidadeArmazenada));
 *   }
 * ============================================================
 */
async function obterProdutosEmEstoque() {
  const resposta = await requisicaoApi('/api/estoque/produtos');
  const dados = await resposta.json();
  return dados.map((item) => new ProdutoEmEstoque(item.nome, item.quantidadeArmazenada));
}

async function obterProdutosQueExigemAtencao() {
  const resposta = await requisicaoApi('/api/estoque/produtos-criticos');
  const dados = await resposta.json();
  return dados.map((item) =>
    new ProdutoAbaixoDoMinimo(item.nome, item.unidadeMedida, item.quantidadeAtual, item.quantidadeMinima)
  );
}

/**
 * Soma o valor investido (preço de custo × quantidade) e o valor de venda
 * potencial (preço de venda × quantidade) de todo o estoque, a partir de
 * /api/estoque/produtos-completos - mesmo endpoint que a Planilha usa,
 * então os dois lugares nunca podem ficar dessincronizados quanto à
 * fonte do dado.
 *
 * valorInvestido sai null quando o backend não manda precoCusto em NENHUM
 * produto (usuário não-admin - ver ProdutoService.listarProdutosCompletos)
 * ou quando não há nenhum produto com custo cadastrado; nesse caso o
 * indicador correspondente simplesmente não é criado, em vez de mostrar
 * "R$ 0,00" de um jeito que parece dado real.
 */
async function obterTotaisFinanceiros() {
  const resposta = await requisicaoApi('/api/estoque/produtos-completos');
  const produtos = await resposta.json();

  let valorInvestido = null;
  let valorVenda = 0;

  for (const produto of produtos) {
    const quantidade = Sanitizacao.paraNumeroFinito(produto.quantidade) ?? 0;
    const precoCusto = Sanitizacao.paraNumeroFinito(produto.precoCusto);
    const precoVenda = Sanitizacao.paraNumeroFinito(produto.precoVenda);

    if (precoCusto !== null) {
      valorInvestido += quantidade * precoCusto;
      
    }
    if (precoVenda !== null) {
      valorVenda += quantidade * precoVenda;
    }
  }

  return { valorInvestido, valorVenda };
}

/**
 * Ponto de entrada do painel: busca os dados reais e renderiza cada
 * seção de forma independente, para que uma falha em uma delas não
 * impeça as demais de aparecer.
 */
async function inicializarPainel() {
  const [produtosEmEstoque, produtosAbaixoDoMinimo, totaisFinanceiros, isAdmin] = await Promise.all([
    obterProdutosEmEstoque().catch((erro) => {
      console.error('Falha ao buscar produtos em estoque:', erro);
      return [];
    }),
    obterProdutosQueExigemAtencao().catch((erro) => {
      console.error('Falha ao buscar produtos que exigem atenção:', erro);
      return [];
    }),
    obterTotaisFinanceiros().catch((erro) => {
      console.error('Falha ao calcular os indicadores financeiros:', erro);
      return { valorInvestido: null, valorVenda: null };
    }),
    // Padrão seguro em caso de falha: não-admin (false), então uma falha
    // aqui esconde "Valor de venda potencial" em vez de arriscar mostrar
    // informação financeira pra quem não deveria ver.
    souAdministrador().catch((erro) => {
      console.error('Falha ao verificar privilégio de administrador:', erro);
      return false;
    }),
  ]);

  try {
    const gradeIndicadoresEstoque = new GradeIndicadoresEstoque('gradeIndicadoresEstoque');
    gradeIndicadoresEstoque.renderizar(
      calcularIndicadoresReais(produtosEmEstoque, produtosAbaixoDoMinimo, totaisFinanceiros, isAdmin)
    );
  } catch (erro) {
    console.error('Falha ao renderizar a grade de indicadores:', erro);
  }

  try {
    const distribuicaoDeEstoque = new DistribuicaoDeEstoquePorProduto(produtosEmEstoque);
    const graficoPizzaDistribuicaoEstoque = new GraficoPizzaDistribuicaoEstoque(
      'pizzaDistribuicaoEstoque',
      'legendaDistribuicaoEstoque'
    );
    graficoPizzaDistribuicaoEstoque.renderizar(distribuicaoDeEstoque);
  } catch (erro) {
    console.error('Falha ao renderizar o gráfico de distribuição de estoque:', erro);
  }

  try {
    const listaProdutosCriticos = new ListaProdutosCriticos('listaProdutosCriticos');
    listaProdutosCriticos.renderizar(produtosAbaixoDoMinimo);
  } catch (erro) {
    console.error('Falha ao renderizar a lista de produtos críticos:', erro);
  }
}

inicializarPainel();

// Rótulos dos cartões/mensagens vazias são gerados em JS (Idioma.traduzir),
// não passam pelo data-i18n automático - se o idioma mudar com o Painel
// visível, re-renderiza tudo pra refletir na hora, sem esperar F5.
// inicializarPainel() é idempotente e já é chamado várias vezes em outros
// pontos do sistema após ações (movimentação, cadastro), então reaproveitar
// aqui segue o mesmo padrão já estabelecido.
window.addEventListener('idioma:alterado', () => {
  const paginaPainel = document.getElementById('paginaPainel');
  if (paginaPainel && !paginaPainel.hidden) {
    inicializarPainel().catch((erro) => {
      console.error('Falha ao atualizar o Painel após troca de idioma:', erro);
    });
  }
});

















































