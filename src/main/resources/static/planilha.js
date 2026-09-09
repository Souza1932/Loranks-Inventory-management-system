/**
 * ============================================================
 * Planilha de produtos
 * ------------------------------------------------------------
 * Reaproveita `Sanitizacao`, `UNIDADES_DE_MEDIDA_PERMITIDAS` e
 * `CORES_INDICADORES` de painel.js (mesmo escopo léxico de topo — ver
 * cadastro.js para a mesma explicação). painel.js precisa ser carregado
 * ANTES deste arquivo.
 *
 * Diferente do formulário de cadastro, aqui o "id" é mostrado como
 * coluna — porque esta é uma tela de LEITURA de produtos já
 * cadastrados (o id vem do banco, nunca é editado pelo usuário),
 * não o formulário de cadastro em si, onde o id continua de fora.
 * ============================================================
 */

/**
 * Rótulo/cor por status de estoque (ver StatusEstoque.java, backend -
 * enum é a fonte única da verdade; aqui só traduzimos pra exibição).
 * Reaproveita as MESMAS 4 cores de CORES_INDICADORES já usadas nos
 * cartões do Painel, para o selo da Planilha não introduzir uma paleta
 * nova e destoante.
 */
const CONFIGURACAO_STATUS_ESTOQUE = Object.freeze({
  ESGOTADO: { chaveTraducao: 'planilha.status.esgotado', cor: CORES_INDICADORES.critico },
  CRITICO: { chaveTraducao: 'planilha.status.critico', cor: CORES_INDICADORES.alerta },
  SUPERLOTADO: { chaveTraducao: 'planilha.status.superlotado', cor: CORES_INDICADORES.destaque },
  NORMAL: { chaveTraducao: 'planilha.status.normal', cor: CORES_INDICADORES.sucesso },
});
const STATUS_ESTOQUE_PADRAO = 'NORMAL';

/**
 * Paginação client-side: evita renderizar centenas/milhares de <tr> de
 * uma vez só, que é o que de fato trava a aba do navegador em bases
 * grandes (não é o carregamento em si, é o DOM ficando gigante). Para uma
 * escala realmente grande (dezenas de milhares de produtos), o próximo
 * passo seria paginação no backend também - CadastroProdutoRepository já
 * suporta Pageable, então dá pra evoluir para isso sem reescrever a
 * consulta; por ora, buscar tudo de uma vez e paginar a EXIBIÇÃO no
 * cliente resolve o problema de performance de renderização, que é o
 * mais imediato, sem precisar tornar busca/ordenação também remotas.
 */
const ITENS_POR_PAGINA_PLANILHA = 25;

/** Um produto com todos os campos, prontos para exibição na tabela. */
class ProdutoCompleto {
  constructor({ id, marca, nomeProduto, quantidade, codigo, data, tipo, fornecedor, unidadeMedida, precoCusto, precoVenda, estoqueMinimo, estoqueMaximo, statusEstoque } = {}) {
    this.id = Sanitizacao.paraNumeroFinito(id);
    this.marca = Sanitizacao.sanitizarTexto(marca, { tamanhoMaximo: 300, valorReserva: '' });
    this.nomeProduto = Sanitizacao.sanitizarTexto(nomeProduto, { tamanhoMaximo: 300, valorReserva: 'Produto sem nome' });

    const quantidadeValidada = Sanitizacao.paraNumeroFinito(quantidade);
    this.quantidade = quantidadeValidada === null ? 0 : quantidadeValidada;

    this.codigo = Sanitizacao.sanitizarTexto(codigo, { tamanhoMaximo: 100, valorReserva: '' });
    // "data" já chega formatada do backend (ex.: "2026-06-15"); tratamos
    // como texto sanitizado, não como Date, pois não fazemos cálculo com ela aqui.
    this.data = Sanitizacao.sanitizarTexto(data, { tamanhoMaximo: 20, valorReserva: '' });
    this.tipo = Sanitizacao.sanitizarTexto(tipo, { tamanhoMaximo: 100, valorReserva: '' });
    this.fornecedor = Sanitizacao.sanitizarTexto(fornecedor, { tamanhoMaximo: 300, valorReserva: '' });

    const unidadeSanitizada = Sanitizacao.sanitizarTexto(unidadeMedida, { tamanhoMaximo: 6, valorReserva: 'un' }).toLowerCase();
    this.unidadeMedida = UNIDADES_DE_MEDIDA_PERMITIDAS.has(unidadeSanitizada) ? unidadeSanitizada : 'un';

    this.precoCusto = Sanitizacao.paraNumeroFinito(precoCusto);
    this.precoVenda = Sanitizacao.paraNumeroFinito(precoVenda);
    // Opcionais: null quando o produto não tem limite cadastrado (ver
    // ProdutoService.sincronizarLimites no backend).
    this.estoqueMinimo = Sanitizacao.paraNumeroFinito(estoqueMinimo);
    this.estoqueMaximo = Sanitizacao.paraNumeroFinito(estoqueMaximo);

    // Contra lista branca, igual unidadeMedida acima: um valor
    // desconhecido/ausente vindo do backend não deve quebrar o selo,
    // só cair no status mais neutro.
    this.statusEstoque = Object.prototype.hasOwnProperty.call(CONFIGURACAO_STATUS_ESTOQUE, statusEstoque)
      ? statusEstoque
      : STATUS_ESTOQUE_PADRAO;
  }

  /**
   * Projeção de venda (quantidade × preço de venda) - quanto o proprietário
   * arrecadaria se vendesse todo o estoque atual pelo preço de venda
   * cadastrado. Só multiplica AQUI, e não no custo: precoCusto já é o
   * valor investido tal como o proprietário informou (não um preço
   * unitário a projetar), enquanto precoVenda é o preço pelo qual ele
   * ainda pretende vender - a multiplicação é a projeção dessa venda
   * futura, não uma reconstrução do que já foi gasto.
   * Getter, não um campo guardado no construtor: assim nunca corre o
   * risco de ficar dessincronizado se quantidade/precoVenda mudarem por
   * qualquer motivo depois da instância criada - sempre recalcula na hora.
   * null quando não há preço de venda cadastrado (produto sem esse dado),
   * para não fingir um valor de R$ 0,00 que não reflete a realidade.
   */
  get projecaoVenda() {
    if (this.precoVenda === null) return null;
    return this.quantidade * this.precoVenda;
  }
}

/** Definição das colunas: ordem de exibição, rótulo e se é numérica (alinhamento/ordenação). */
const COLUNAS_PLANILHA = Object.freeze([
  { chave: 'id', numerica: true },
  { chave: 'marca', numerica: false },
  { chave: 'nomeProduto', numerica: false },
  { chave: 'quantidade', numerica: true },
  // Lado a lado com a quantidade atual, de propósito: é o contexto que
  // falta pra alguém olhar a planilha e já entender se aquele número é
  // pouco ou muito, sem precisar ir consultar outra tela.
  { chave: 'estoqueMinimo', numerica: true },
  { chave: 'estoqueMaximo', numerica: true },
  { chave: 'codigo', numerica: false },
  { chave: 'data', numerica: false },
  { chave: 'tipo', numerica: false },
  { chave: 'fornecedor', numerica: false },
  { chave: 'unidadeMedida', numerica: false },
  { chave: 'precoCusto', numerica: true },
  { chave: 'precoVenda', numerica: true },
  // Derivada (getter, não vem do backend) - quantidade × precoVenda.
  { chave: 'projecaoVenda', numerica: true },
]);

/** Rótulo traduzido de uma coluna, na hora (nunca guardado em cache -
 *  senão ficaria desatualizado se o idioma mudar no meio da sessão). */
function rotuloDaColuna(coluna) {
  return Idioma.traduzir(`planilha.colunas.${coluna.chave}`);
}

const FORMATADOR_MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

class TabelaPlanilhaProdutos {
  constructor({ idGatilho, idSobreposicao, idBotaoFechar, idBusca, idCabecalho, idCorpo, idContagem, idMensagem, idBotaoExportarCsv, idBotaoPaginaAnterior, idBotaoProximaPagina, idIndicadorPagina, idPainel, idBotaoTelaCheia }) {
    this.gatilho = Sanitizacao.ehIdDomValido(idGatilho) ? document.getElementById(idGatilho) : null;
    this.sobreposicao = Sanitizacao.ehIdDomValido(idSobreposicao) ? document.getElementById(idSobreposicao) : null;
    this.botaoFechar = Sanitizacao.ehIdDomValido(idBotaoFechar) ? document.getElementById(idBotaoFechar) : null;
    this.campoBusca = Sanitizacao.ehIdDomValido(idBusca) ? document.getElementById(idBusca) : null;
    this.linhaCabecalho = Sanitizacao.ehIdDomValido(idCabecalho) ? document.getElementById(idCabecalho) : null;
    this.corpoTabela = Sanitizacao.ehIdDomValido(idCorpo) ? document.getElementById(idCorpo) : null;
    this.elementoContagem = Sanitizacao.ehIdDomValido(idContagem) ? document.getElementById(idContagem) : null;
    this.elementoMensagem = Sanitizacao.ehIdDomValido(idMensagem) ? document.getElementById(idMensagem) : null;
    this.botaoExportarCsv = Sanitizacao.ehIdDomValido(idBotaoExportarCsv) ? document.getElementById(idBotaoExportarCsv) : null;
    this.botaoPaginaAnterior = Sanitizacao.ehIdDomValido(idBotaoPaginaAnterior) ? document.getElementById(idBotaoPaginaAnterior) : null;
    this.botaoProximaPagina = Sanitizacao.ehIdDomValido(idBotaoProximaPagina) ? document.getElementById(idBotaoProximaPagina) : null;
    this.indicadorPagina = Sanitizacao.ehIdDomValido(idIndicadorPagina) ? document.getElementById(idIndicadorPagina) : null;
    this.painel = Sanitizacao.ehIdDomValido(idPainel) ? document.getElementById(idPainel) : null;
    this.botaoTelaCheia = Sanitizacao.ehIdDomValido(idBotaoTelaCheia) ? document.getElementById(idBotaoTelaCheia) : null;

    if (!this.sobreposicao || !this.linhaCabecalho || !this.corpoTabela) {
      console.error('TabelaPlanilhaProdutos: elementos essenciais não encontrados no DOM.');
      return;
    }

    this.produtos = [];
    this.colunaOrdenacao = null;
    this.direcaoOrdenacao = 'ascending';
    this.thPorColuna = {};
    this.paginaAtual = 1;
    this.telaCheia = false;
    // Resolvido em abrir() antes de renderizar linhas - cache síncrono
    // porque _criarCelulaAcoes() (chamado por linha) não é async.
    this._administrador = false;

    this._renderizarCabecalho();
    this._vincularEventos();
  }

  _vincularEventos() {
    if (this.gatilho) {
      this.gatilho.addEventListener('click', () => this.abrir());
    }
    if (this.botaoFechar) {
      this.botaoFechar.addEventListener('click', () => this.fechar());
    }
    this.sobreposicao.addEventListener('click', (evento) => {
      if (evento.target === this.sobreposicao) {
        this.fechar();
      }
    });
    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape' && !this.sobreposicao.hidden) {
        this.fechar();
      }
    });
    if (this.campoBusca) {
      this.campoBusca.addEventListener('input', () => {
        // Nova busca sempre volta pra página 1 - continuar na página 3,
        // por exemplo, poderia sobrar vazia se o filtro reduziu muito os resultados.
        this.paginaAtual = 1;
        this._renderizarLinhas();
      });
    }
    if (this.botaoExportarCsv) {
      this.botaoExportarCsv.addEventListener('click', () => this._exportarCsv());
    }
    if (this.botaoPaginaAnterior) {
      this.botaoPaginaAnterior.addEventListener('click', () => this._mudarPagina(-1));
    }
    if (this.botaoProximaPagina) {
      this.botaoProximaPagina.addEventListener('click', () => this._mudarPagina(1));
    }
    if (this.botaoTelaCheia) {
      this.botaoTelaCheia.addEventListener('click', () => this._alternarTelaCheia());
    }
    // Conteúdo desta tabela é 100% gerado em JS (cabeçalho, selos,
    // mensagens) - nada disso passa pelo data-i18n automático do
    // i18n.js, então precisa se re-renderizar manualmente quando o
    // idioma muda, se a planilha estiver aberta no momento da troca.
    window.addEventListener('idioma:alterado', () => {
      if (this.sobreposicao && !this.sobreposicao.hidden) {
        this._renderizarCabecalho();
        this._renderizarLinhas();
      }
    });
  }

  async abrir() {
    this.sobreposicao.hidden = false;
    PilhaSobreposicoes.abrir(this.sobreposicao);
    // Remonta o cabeçalho (não só as linhas) ao abrir: se o idioma mudou
    // com a planilha fechada, o listener de 'idioma:alterado' não
    // re-renderiza nada (ela nem estava visível) - isso garante que o
    // cabeçalho sempre reflete o idioma atual, não o de quando a página
    // carregou.
    this._renderizarCabecalho();
    if (this.campoBusca) {
      this.campoBusca.value = '';
      this.campoBusca.focus();
    }
    this.paginaAtual = 1;
    this._mostrarCarregando();

    // Resolvida antes de buscar os produtos: _criarCelulaAcoes() (chamado
    // por _renderizarLinhas logo abaixo) precisa saber se esconde o botão
    // "Excluir", e não é assíncrono.
    this._administrador = await souAdministrador().catch(() => false);

    this.produtos = await obterProdutosCompletos().catch((erro) => {
      console.error('Falha ao buscar produtos completos:', erro);
      return [];
    });

    this._renderizarLinhas();
  }

  fechar() {
    this.sobreposicao.hidden = true;
    PilhaSobreposicoes.fechar(this.sobreposicao);
    // Sempre volta pro tamanho normal da próxima vez que abrir - tela
    // cheia é um estado transitório da sessão de uso, não uma preferência
    // que precise persistir entre uma abertura e outra.
    if (this.telaCheia) {
      this._alternarTelaCheia();
    }
    if (this.gatilho) {
      this.gatilho.focus();
    }
  }

  _alternarTelaCheia() {
    this.telaCheia = !this.telaCheia;
    if (this.sobreposicao) {
      this.sobreposicao.classList.toggle('sobreposicao-modal--tela-cheia', this.telaCheia);
    }
    if (this.painel) {
      this.painel.classList.toggle('painel-planilha--tela-cheia', this.telaCheia);
    }
    if (this.botaoTelaCheia) {
      this.botaoTelaCheia.textContent = this.telaCheia ? '⤡' : '⤢';
      this.botaoTelaCheia.setAttribute('aria-label', Idioma.traduzir(this.telaCheia ? 'planilha.telaCheiaSairAria' : 'planilha.telaCheiaAria'));
      this.botaoTelaCheia.setAttribute('aria-pressed', String(this.telaCheia));
    }
  }

  _mostrarCarregando() {
    this.corpoTabela.replaceChildren();
    this.corpoTabela.appendChild(this._criarLinhaMensagem(Idioma.traduzir('planilha.mensagens.carregando')));
  }

  /**
   * Colunas efetivamente exibidas: igual a COLUNAS_PLANILHA, exceto que
   * "precoVenda" some por completo (cabeçalho, células e CSV) para quem
   * não é administrador - o servidor já manda esse campo como null nesse
   * caso (ver ProdutoService.listarProdutosCompletos), então aqui é só
   * questão de não desperdiçar uma coluna inteira mostrando traços.
   */
  _colunasVisiveis() {
    return this._administrador
      ? COLUNAS_PLANILHA
      : COLUNAS_PLANILHA.filter((coluna) => coluna.chave !== 'precoVenda');
  }

  _criarLinhaMensagem(texto) {
    const linha = document.createElement('tr');
    linha.className = 'tabela-planilha__vazio';
    const celula = document.createElement('td');
    celula.colSpan = this._colunasVisiveis().length + 2; // +2: colunas de Status e Ações, que não são data-driven
    celula.textContent = texto;
    linha.appendChild(celula);
    return linha;
  }

  _renderizarCabecalho() {
    this.linhaCabecalho.replaceChildren();
    this._colunasVisiveis().forEach((coluna) => {
      const th = document.createElement('th');
      th.textContent = rotuloDaColuna(coluna);
      th.setAttribute('scope', 'col');
      th.setAttribute('aria-sort', 'none');
      th.tabIndex = 0;
      th.addEventListener('click', () => this._ordenarPor(coluna.chave));
      th.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault();
          this._ordenarPor(coluna.chave);
        }
      });
      this.thPorColuna[coluna.chave] = th;
      this.linhaCabecalho.appendChild(th);
    });

    // Coluna de Status (selo colorido crítico/normal/esgotado/superlotado):
    // não é ordenável por enquanto (teria que definir uma ordem de
    // prioridade entre os 4 valores, não alfabética) - mesma simplificação
    // já usada na coluna de Ações.
    const thStatus = document.createElement('th');
    thStatus.textContent = Idioma.traduzir('planilha.colunas.status');
    thStatus.setAttribute('scope', 'col');
    this.linhaCabecalho.appendChild(thStatus);

    // Coluna de Ações (Editar/Excluir): não é ordenável, não faz parte de
    // COLUNAS_PLANILHA porque não corresponde a um campo do produto.
    const thAcoes = document.createElement('th');
    thAcoes.textContent = Idioma.traduzir('planilha.colunas.acoes');
    thAcoes.setAttribute('scope', 'col');
    this.linhaCabecalho.appendChild(thAcoes);
  }

  _ordenarPor(chave) {
    if (this.colunaOrdenacao === chave) {
      this.direcaoOrdenacao = this.direcaoOrdenacao === 'ascending' ? 'descending' : 'ascending';
    } else {
      this.colunaOrdenacao = chave;
      this.direcaoOrdenacao = 'ascending';
    }

    Object.entries(this.thPorColuna).forEach(([chaveColuna, th]) => {
      th.setAttribute('aria-sort', chaveColuna === this.colunaOrdenacao ? this.direcaoOrdenacao : 'none');
    });

    this.paginaAtual = 1;
    this._renderizarLinhas();
  }

  /** Normaliza texto para busca: minúsculas e sem acentos (ex.: "codigo" encontra "Código"). */
  _normalizar(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  _filtrarProdutos() {
    const termo = this.campoBusca ? this._normalizar(this.campoBusca.value.trim()) : '';
    if (termo === '') {
      return this.produtos;
    }
    return this.produtos.filter((produto) => {
      const alvo = [produto.marca, produto.nomeProduto, produto.codigo, produto.fornecedor]
        .map((valor) => this._normalizar(valor))
        .join(' ');
      return alvo.includes(termo);
    });
  }

  _ordenarLista(lista) {
    if (!this.colunaOrdenacao) {
      return lista;
    }

    const coluna = COLUNAS_PLANILHA.find((c) => c.chave === this.colunaOrdenacao);
    const sinal = this.direcaoOrdenacao === 'ascending' ? 1 : -1;

    return [...lista].sort((a, b) => {
      const valorA = a[this.colunaOrdenacao];
      const valorB = b[this.colunaOrdenacao];

      // Valores ausentes (null) sempre por último, em qualquer direção.
      const aEhNulo = valorA === null || valorA === '';
      const bEhNulo = valorB === null || valorB === '';
      if (aEhNulo && bEhNulo) return 0;
      if (aEhNulo) return 1;
      if (bEhNulo) return -1;

      if (coluna.numerica) {
        return (valorA - valorB) * sinal;
      }
      return String(valorA).localeCompare(String(valorB), 'pt-BR') * sinal;
    });
  }

  _renderizarLinhas() {
    const filtrados = this._filtrarProdutos();
    const ordenados = this._ordenarLista(filtrados);

    // Contagem/total no rodapé refletem TODOS os resultados filtrados,
    // não só os da página atual - é o "quanto capital está parado no
    // total dessa busca", não "quanto tem nessa página".
    this._atualizarContagem(ordenados);

    const totalPaginas = Math.max(1, Math.ceil(ordenados.length / ITENS_POR_PAGINA_PLANILHA));
    // Clampa a página atual dentro do intervalo válido - cobre o caso de
    // excluir um produto, ou refinar uma busca, e a página em que o
    // usuário estava deixar de existir (ex.: estava na página 3, sobrou só 1).
    this.paginaAtual = Math.min(Math.max(1, this.paginaAtual), totalPaginas);

    const indiceInicial = (this.paginaAtual - 1) * ITENS_POR_PAGINA_PLANILHA;
    const produtosDaPagina = ordenados.slice(indiceInicial, indiceInicial + ITENS_POR_PAGINA_PLANILHA);

    this._atualizarControlesPaginacao(totalPaginas);
    this.corpoTabela.replaceChildren();

    if (ordenados.length === 0) {
      const mensagem = this.produtos.length === 0
        ? Idioma.traduzir('planilha.mensagens.semProdutos')
        : Idioma.traduzir('planilha.mensagens.semResultadoBusca');
      this.corpoTabela.appendChild(this._criarLinhaMensagem(mensagem));
      return;
    }

    const fragmento = document.createDocumentFragment();
    produtosDaPagina.forEach((produto) => fragmento.appendChild(this._criarLinha(produto)));
    this.corpoTabela.appendChild(fragmento);
  }

  _mudarPagina(delta) {
    this.paginaAtual += delta;
    this._renderizarLinhas();
  }

  _atualizarControlesPaginacao(totalPaginas) {
    if (this.indicadorPagina) {
      this.indicadorPagina.textContent = Idioma.traduzir('planilha.mensagens.pagina', { atual: this.paginaAtual, total: totalPaginas });
    }
    if (this.botaoPaginaAnterior) {
      this.botaoPaginaAnterior.disabled = this.paginaAtual <= 1;
    }
    if (this.botaoProximaPagina) {
      this.botaoProximaPagina.disabled = this.paginaAtual >= totalPaginas;
    }
  }

  _criarLinha(produto) {
    const linha = document.createElement('tr');
    this._colunasVisiveis().forEach((coluna) => {
      const celula = document.createElement('td');
      if (coluna.numerica) {
        celula.classList.add('coluna-numerica');
      }
      celula.textContent = this._formatarValorCelula(coluna.chave, produto[coluna.chave]);
      linha.appendChild(celula);
    });
    linha.appendChild(this._criarCelulaStatus(produto));
    linha.appendChild(this._criarCelulaAcoes(produto));
    return linha;
  }

  /**
   * Selo colorido de status (Normal/Crítico/Esgotado/Superlotado). A cor
   * vem via CSS custom property, mesma técnica já usada pelos cartões do
   * Painel (`--indicador-cor`, ver painel.js) - evita depender de N
   * classes CSS fixas com cor embutida no seletor.
   */
  _criarCelulaStatus(produto) {
    const celula = document.createElement('td');
    const configuracao = CONFIGURACAO_STATUS_ESTOQUE[produto.statusEstoque];

    const selo = document.createElement('span');
    selo.className = 'selo-status-estoque';
    selo.style.setProperty('--selo-cor', configuracao.cor);
    selo.textContent = Idioma.traduzir(configuracao.chaveTraducao);

    celula.appendChild(selo);
    return celula;
  }

  _criarCelulaAcoes(produto) {
    const celula = document.createElement('td');
    celula.classList.add('tabela-planilha__acoes');

    const botaoEditar = document.createElement('button');
    botaoEditar.type = 'button';
    botaoEditar.className = 'tabela-planilha__botao-acao';
    botaoEditar.textContent = Idioma.traduzir('planilha.botaoEditar');
    botaoEditar.addEventListener('click', () => this._editarProduto(produto));

    const botaoExcluir = document.createElement('button');
    botaoExcluir.type = 'button';
    botaoExcluir.className = 'tabela-planilha__botao-acao tabela-planilha__botao-acao--excluir';
    botaoExcluir.textContent = Idioma.traduzir('planilha.botaoExcluir');
    botaoExcluir.addEventListener('click', () => this._excluirProduto(produto));

    // Só admin edita ou exclui produto (ver SecurityConfig - o servidor já
    // barra com 403/PUT-DELETE mesmo se estes botões aparecessem; aqui é
    // só pra não oferecer uma ação que sempre falharia pra quem não tem
    // permissão). Funcionário comum não vê nenhum botão nesta coluna.
    if (this._administrador) {
      celula.append(botaoEditar, botaoExcluir);
    }
    return celula;
  }

  /**
   * Abre o modal de Cadastro (cadastro.js) em modo de edição, pré-preenchido
   * com este produto. Fecha a planilha antes, para as duas sobreposições
   * não ficarem empilhadas na tela ao mesmo tempo.
   */
  _editarProduto(produto) {
    if (typeof window.modalCadastroProdutoInstancia === 'undefined' || !window.modalCadastroProdutoInstancia) {
      console.error('Planilha: modalCadastroProdutoInstancia não disponível - cadastro.js carregou?');
      return;
    }
    this.fechar();
    window.modalCadastroProdutoInstancia.abrirParaEdicao(produto);
  }

  /**
   * Confirmação nativa do navegador (window.confirm) por simplicidade -
   * suficiente para uma ação destrutiva pontual como esta. Um modal de
   * confirmação customizado, no mesmo estilo visual do resto do sistema,
   * é uma melhoria natural para depois, se quiser manter tudo consistente.
   */
  async _excluirProduto(produto) {
    const confirmou = window.confirm(Idioma.traduzir('planilha.mensagens.confirmarExclusao', { nome: produto.nomeProduto }));
    if (!confirmou) return;

    this._limparMensagem();
    try {
      await excluirProdutoNoServidor(produto.id);
      this.produtos = this.produtos.filter((p) => p.id !== produto.id);
      this._renderizarLinhas();
      if (typeof inicializarPainel === 'function') {
        inicializarPainel().catch((erro) => {
          console.error('Falha ao atualizar o painel após excluir produto:', erro);
        });
      }
    } catch (erro) {
      console.error('Falha ao excluir produto:', erro);
      this._mostrarErro(erro && erro.mensagemServidor
        ? erro.mensagemServidor
        : Idioma.traduzir('planilha.mensagens.erroExcluirGenerico'));
    }
  }

  /**
   * Exporta exatamente o que está sendo exibido na tela agora - mesma
   * busca e ordenação aplicadas - não a lista completa de produtos ainda
   * não filtrados. É gerado 100% no navegador, a partir de dados que já
   * foram carregados; não faz nenhuma chamada nova ao backend.
   *
   * Reaproveita _formatarValorCelula (mesma formatação de moeda/traço para
   * valores ausentes que já aparece na tabela) e CONFIGURACAO_STATUS_ESTOQUE
   * (mesmos rótulos do selo) para o CSV não divergir do que o usuário vê.
   */
  _exportarCsv() {
    const linhas = this._ordenarLista(this._filtrarProdutos());
    if (linhas.length === 0) {
      this._mostrarErro(Idioma.traduzir('planilha.mensagens.erroExportarSemDados'));
      return;
    }
    this._limparMensagem();

    const colunasVisiveis = this._colunasVisiveis();
    const cabecalho = [...colunasVisiveis.map((c) => rotuloDaColuna(c)), Idioma.traduzir('planilha.colunas.status')];
    const linhasCsv = linhas.map((produto) => [
      ...colunasVisiveis.map((coluna) => this._formatarValorCelula(coluna.chave, produto[coluna.chave])),
      Idioma.traduzir(CONFIGURACAO_STATUS_ESTOQUE[produto.statusEstoque].chaveTraducao),
    ]);

    // ";" como separador (não ","), de propósito: os valores monetários já
    // formatados usam vírgula decimal ("R$ 1.234,56" - padrão pt-BR), então
    // usar vírgula como separador de coluna quebraria essas células ao
    // abrir no Excel/planilhas.
    const linhasTexto = [cabecalho, ...linhasCsv].map((linha) =>
      linha.map((valor) => this._escaparCelulaCsv(valor)).join(';')
    );
    // BOM (\uFEFF) no início: sem isso, o Excel no Windows costuma
    // interpretar o arquivo como Latin-1 em vez de UTF-8 e exibe os
    // acentos quebrados (ex.: "Preço" vira "PreÃ§o").
    const conteudoCsv = '\uFEFF' + linhasTexto.join('\r\n');

    const nomeArquivo = `loranks-planilha-produtos-${new Date().toISOString().slice(0, 10)}.csv`;
    this._baixarArquivo(conteudoCsv, nomeArquivo);
  }

  _escaparCelulaCsv(valor) {
    const texto = String(valor);
    // Precisa de aspas se contiver o separador, aspas, ou quebra de linha;
    // aspas internas são escapadas dobrando ("" em vez de ").
    if (/[;"\r\n]/.test(texto)) {
      return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
  }

  _baixarArquivo(conteudo, nomeArquivo) {
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  _limparMensagem() {
    if (!this.elementoMensagem) return;
    this.elementoMensagem.hidden = true;
    this.elementoMensagem.textContent = '';
  }

  _mostrarErro(texto) {
    if (!this.elementoMensagem) return;
    this.elementoMensagem.hidden = false;
    this.elementoMensagem.textContent = texto;
  }

  _formatarValorCelula(chave, valor) {
    if (valor === null || valor === undefined || valor === '') {
      return '—';
    }
    if (chave === 'precoCusto' || chave === 'precoVenda' || chave === 'projecaoVenda') {
      return FORMATADOR_MOEDA.format(valor);
    }
    return String(valor);
  }

  /**
   * Recebe a lista já filtrada/ordenada (não só a contagem) porque agora
   * também soma a projeção de venda dos produtos EXIBIDOS - se o
   * usuário estiver filtrando a busca, o total reflete só o que está na
   * tela, não o estoque inteiro (comportamento esperado de um relatório
   * de inventário sendo filtrado).
   */
  _atualizarContagem(listaExibida) {
    if (!this.elementoContagem) return;
    const total = this.produtos.length;
    const quantidadeExibida = listaExibida.length;

    let textoContagem;
    if (quantidadeExibida === total) {
      textoContagem = Idioma.traduzir(total === 1 ? 'planilha.mensagens.contagemUnico' : 'planilha.mensagens.contagemMultiplo', { total });
    } else {
      textoContagem = Idioma.traduzir('planilha.mensagens.contagemFiltrada', { exibida: quantidadeExibida, total });
    }

    const valorTotal = listaExibida.reduce((soma, p) => soma + (p.projecaoVenda ?? 0), 0);
    // Chave de traducao renomeada de 'totalEmEstoque' para 'totalProjecaoVenda':
    // o texto tambem precisa mudar (era algo como "X em estoque", agora deve
    // dizer algo como "projecao de venda de X") - ver arquivo de idiomas.
    const totalProjecaoVenda = Idioma.traduzir('planilha.mensagens.totalProjecaoVenda', { valor: FORMATADOR_MOEDA.format(valorTotal) });
    this.elementoContagem.textContent = `${textoContagem} ${totalProjecaoVenda}`;
  }
}

/**
 * ============================================================
 * Integração com o backend — mesmo padrão de painel.js/cadastro.js:
 * ponto de integração único, claramente marcado, sem fabricar dados.
 * ============================================================
 */
async function obterProdutosCompletos() {
  const resposta = await requisicaoApi('/api/estoque/produtos-completos');
  const dados = await resposta.json();
  return dados.map((item) => new ProdutoCompleto(item));
}

/**
 * Faz o DELETE manualmente (em vez de requisicaoApi) porque aqui
 * precisamos ler o corpo JSON da resposta mesmo em erro (ex.: 409
 * "produto tem movimentações") - requisicaoApi lança a exceção antes de
 * expor esse corpo. Mesmo padrão usado em movimentacao.js.
 */
async function excluirProdutoNoServidor(id) {
  const tokenCsrf = obterCookie('XSRF-TOKEN');
  const resposta = await fetch(`/api/estoque/produtos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: tokenCsrf ? { 'X-XSRF-TOKEN': tokenCsrf } : {},
  });

  if (!resposta.ok) {
    let mensagemServidor = null;
    try {
      const corpo = await resposta.json();
      if (corpo && typeof corpo.erro === 'string') {
        mensagemServidor = corpo.erro;
      }
    } catch {
      // Corpo vazio/não-JSON (ex.: 404 sem corpo) - mantém mensagemServidor null,
      // o chamador cai na mensagem genérica.
    }
    const erro = new Error(`HTTP ${resposta.status}`);
    erro.mensagemServidor = mensagemServidor;
    throw erro;
  }
}

function inicializarTabelaPlanilha() {
  const tabela = new TabelaPlanilhaProdutos({
    idGatilho: 'botaoAbrirPlanilha',
    idSobreposicao: 'sobreposicaoPlanilha',
    idBotaoFechar: 'botaoFecharPlanilha',
    idBusca: 'planilhaBusca',
    idCabecalho: 'cabecalhoTabelaPlanilha',
    idCorpo: 'corpoTabelaPlanilha',
    idContagem: 'planilhaContagem',
    idMensagem: 'mensagemPlanilha',
    idBotaoExportarCsv: 'botaoExportarPlanilhaCsv',
    idBotaoPaginaAnterior: 'botaoPaginaAnterior',
    idBotaoProximaPagina: 'botaoProximaPagina',
    idIndicadorPagina: 'planilhaIndicadorPagina',
    idPainel: 'painelPlanilha',
    idBotaoTelaCheia: 'botaoTelaCheiaPlanilha',
  });

  // Exposto globalmente para cadastro.js chamar depois de salvar uma
  // edição - só recarrega de fato se a planilha estiver aberta na hora,
  // pra não gastar uma chamada de rede à toa quando ela está fechada.
  window.recarregarPlanilhaSeAberta = () => {
    if (tabela.sobreposicao && !tabela.sobreposicao.hidden) {
      tabela.abrir();
    }
  };

  return tabela;
}

inicializarTabelaPlanilha();    





















