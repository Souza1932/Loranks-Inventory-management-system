/**
 * ============================================================
 * Modal de cadastro de produto
 * ------------------------------------------------------------
 * Reaproveita a camada de sanitização/validação (`Sanitizacao`) e a
 * whitelist de unidades de medida (`UNIDADES_DE_MEDIDA_PERMITIDAS`)
 * já definidas em painel.js — como os dois arquivos são carregados
 * como scripts clássicos (não módulos) na mesma página, compartilham
 * o mesmo escopo léxico de topo, então essas constantes ficam
 * visíveis aqui sem precisar duplicá-las. painel.js precisa ser
 * carregado ANTES deste arquivo (ver dashboard-loranks.html).
 *
 * Todos os 10 atributos reais do produto são coletados aqui, exceto
 * "id" — que é gerado pelo backend, nunca preenchido pelo usuário.
 * ============================================================
 */
class ModalCadastroProduto {
  constructor({ idGatilho, idSobreposicao, idFormulario, idBotaoFechar, idBotaoSalvar, idMensagem }) {
    this.gatilho = Sanitizacao.ehIdDomValido(idGatilho) ? document.getElementById(idGatilho) : null;
    this.sobreposicao = Sanitizacao.ehIdDomValido(idSobreposicao) ? document.getElementById(idSobreposicao) : null;
    this.formulario = Sanitizacao.ehIdDomValido(idFormulario) ? document.getElementById(idFormulario) : null;
    this.botaoFechar = Sanitizacao.ehIdDomValido(idBotaoFechar) ? document.getElementById(idBotaoFechar) : null;
    this.botaoSalvar = Sanitizacao.ehIdDomValido(idBotaoSalvar) ? document.getElementById(idBotaoSalvar) : null;
    this.elementoMensagem = Sanitizacao.ehIdDomValido(idMensagem) ? document.getElementById(idMensagem) : null;

    if (!this.sobreposicao || !this.formulario) {
      console.error('ModalCadastroProduto: elementos essenciais (sobreposição/formulário) não encontrados no DOM.');
      return;
    }

    this.campos = {
      marca: document.getElementById('campoMarca'),
      nomeProduto: document.getElementById('campoNomeProduto'),
      quantidade: document.getElementById('campoQuantidade'),
      codigo: document.getElementById('campoCodigo'),
      data: document.getElementById('campoData'),
      tipo: document.getElementById('campoTipo'),
      fornecedor: document.getElementById('campoFornecedor'),
      unidadeMedida: document.getElementById('campoUnidadeMedida'),
      precoCusto: document.getElementById('campoPrecoCusto'),
      precoVenda: document.getElementById('campoPrecoVenda'),
      estoqueMinimo: document.getElementById('campoEstoqueMinimo'),
      estoqueMaximo: document.getElementById('campoEstoqueMaximo'),
    };

    this.tituloModal = document.getElementById('tituloModalCadastro');
    this.containerPrecoCusto = document.getElementById('containerPrecoCusto');
    // null enquanto cadastrando um produto novo; id do produto quando o
    // modal foi aberto em modo de edição (ver abrirParaEdicao).
    this.produtoEmEdicaoId = null;

    const camposFaltando = Object.entries(this.campos).filter(([, elemento]) => !elemento);
    if (camposFaltando.length > 0) {
      console.error('ModalCadastroProduto: campos ausentes no DOM:', camposFaltando.map(([nome]) => nome));
    }

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
    this.formulario.addEventListener('submit', (evento) => {
      evento.preventDefault();
      this._validarESalvar();
    });
  }

  abrir() {
    this._limparMensagem();
    this._aplicarVisibilidadePrecoCusto();
    this.sobreposicao.hidden = false;
    PilhaSobreposicoes.abrir(this.sobreposicao);
    if (this.campos.marca) {
      this.campos.marca.focus();
    }
  }

  /**
   * Esconde o campo de preço de custo para quem não é administrador. Só
   * afeta a exibição - a regra de verdade (quem pode gravar/ler esse
   * valor) já é aplicada no servidor (ProdutoService/EstoqueController),
   * então mesmo que este método falhe silenciosamente por algum motivo,
   * nenhum dado sensível vaza nem é gravável por engano.
   */
  async _aplicarVisibilidadePrecoCusto() {
    if (!this.containerPrecoCusto) return;
    const administrador = await souAdministrador();
    this.containerPrecoCusto.hidden = !administrador;
  }

  /**
   * Abre o mesmo modal, mas em modo de edição: pré-preenche todos os
   * campos a partir de um produto já existente (vindo da Planilha) e faz
   * o próximo "Salvar" chamar PUT em vez de POST. `produto` é a instância
   * de ProdutoCompleto (planilha.js) - mesmos nomes de campo usados aqui.
   */
  abrirParaEdicao(produto) {
    this._limparMensagem();
    this._aplicarVisibilidadePrecoCusto();
    this.produtoEmEdicaoId = produto.id;

    this.campos.marca.value = produto.marca || '';
    this.campos.nomeProduto.value = produto.nomeProduto || '';
    this.campos.quantidade.value = produto.quantidade ?? '';
    this.campos.codigo.value = produto.codigo || '';
    this.campos.data.value = this._converterDataIsoParaBr(produto.data);
    this.campos.tipo.value = produto.tipo || '';
    this.campos.fornecedor.value = produto.fornecedor || '';
    this.campos.unidadeMedida.value = produto.unidadeMedida || 'un';
    this.campos.precoCusto.value = this._formatarPrecoParaEdicao(produto.precoCusto);
    this.campos.precoVenda.value = this._formatarPrecoParaEdicao(produto.precoVenda);
    this.campos.estoqueMinimo.value = produto.estoqueMinimo ?? '';
    this.campos.estoqueMaximo.value = produto.estoqueMaximo ?? '';

    if (this.tituloModal) {
      this.tituloModal.textContent = Idioma.traduzir('cadastro.tituloModalEdicao');
    }
    if (this.botaoSalvar) {
      this.botaoSalvar.textContent = Idioma.traduzir('cadastro.botaoSalvarAlteracoes');
    }

    this.sobreposicao.hidden = false;
    PilhaSobreposicoes.abrir(this.sobreposicao);
    this.campos.marca.focus();
  }

  /**
   * Pré-preenchimento do campo de preço ao editar: mostra no formato
   * brasileiro legível (ex.: "1.700,50"), não o número cru do backend
   * (ex.: "1700.5") - Sanitizacao.paraNumeroMonetario aceita de volta
   * qualquer formato que o usuário digite ou deixe como está daqui.
   */
  _formatarPrecoParaEdicao(valor) {
    if (valor === null || valor === undefined) return '';
    return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  fechar() {
    this.sobreposicao.hidden = true;
    PilhaSobreposicoes.fechar(this.sobreposicao);
    this._limparCampos();
    this._limparMensagem();
    this.produtoEmEdicaoId = null;
    // Restaura os textos padrão de "cadastrar" - caso tenham sido trocados
    // por abrirParaEdicao(). Usa as MESMAS chaves de tradução do HTML
    // (cadastro.tituloModal/cadastro.botaoSalvar), não um texto fixo em
    // português, para não haver duas "fontes da verdade" divergentes se o
    // idioma atual não for português.
    if (this.tituloModal) {
      this.tituloModal.textContent = Idioma.traduzir('cadastro.tituloModal');
    }
    if (this.botaoSalvar) {
      this.botaoSalvar.textContent = Idioma.traduzir('cadastro.botaoSalvar');
    }
    if (this.gatilho) {
      this.gatilho.focus();
    }
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

  _limparCampos() {
    Object.values(this.campos).forEach((campo) => {
      if (!campo) return;
      if (campo.tagName === 'SELECT') {
        campo.selectedIndex = 0;
      } else {
        campo.value = '';
      }
    });
  }

  async _validarESalvar() {
    const produto = this._validarCampos();
    if (!produto) return;

    if (this.botaoSalvar) {
      this.botaoSalvar.disabled = true;
    }
    try {
      if (this.produtoEmEdicaoId !== null) {
        await atualizarProdutoNoServidor(this.produtoEmEdicaoId, produto);
      } else {
        await cadastrarProdutoNoServidor(produto);
      }
      this.fechar();
      // Atualiza os cards/gráfico do painel e a tabela da planilha (se
      // estiver aberta) com o produto recém-salvo, sem precisar recarregar
      // a página. Ambas as funções já existem e são idempotentes.
      if (typeof inicializarPainel === 'function') {
        inicializarPainel().catch((erro) => {
          console.error('Falha ao atualizar o painel após salvar produto:', erro);
        });
      }
      if (typeof window.recarregarPlanilhaSeAberta === 'function') {
        window.recarregarPlanilhaSeAberta();
      }
    } catch (erro) {
      console.error('Falha ao salvar produto:', erro);
      this._mostrarErro(Idioma.traduzir('cadastro.mensagens.erroSalvarGenerico'));
    } finally {
      if (this.botaoSalvar) {
        this.botaoSalvar.disabled = false;
      }
    }
  }

  /**
   * Valida todos os campos e retorna um objeto pronto para envio, ou
   * `null` se algo estiver inválido (a mensagem de erro já é exibida
   * dentro deste método). Nada é enviado enquanto algo for inválido.
   */
  _validarCampos() {
    const marca = Sanitizacao.sanitizarTexto(this.campos.marca.value, { tamanhoMaximo: 300, valorReserva: '' });
    const nomeProduto = Sanitizacao.sanitizarTexto(this.campos.nomeProduto.value, { tamanhoMaximo: 300, valorReserva: '' });
    const codigo = Sanitizacao.sanitizarTexto(this.campos.codigo.value, { tamanhoMaximo: 100, valorReserva: '' });
    const tipo = Sanitizacao.sanitizarTexto(this.campos.tipo.value, { tamanhoMaximo: 100, valorReserva: '' });
    const fornecedor = Sanitizacao.sanitizarTexto(this.campos.fornecedor.value, { tamanhoMaximo: 300, valorReserva: '' });

    if (!nomeProduto || !codigo || !tipo || this.campos.quantidade.value.trim() === '') {
      this._mostrarErro(Idioma.traduzir('cadastro.mensagens.camposObrigatorios'));
      return null;
    }

    const quantidade = Sanitizacao.paraNumeroFinito(this.campos.quantidade.value);
    if (quantidade === null || !Number.isInteger(quantidade)) {
      this._mostrarErro(Idioma.traduzir('cadastro.mensagens.quantidadeInvalida'));
      return null;
    }

    const dataTexto = this.campos.data.value.trim();
    let dataISO;
    if (dataTexto === '') {
      dataISO = this._formatarDataISO(new Date());
    } else {
      const dataInterpretada = this._interpretarData(dataTexto);
      if (!dataInterpretada) {
        this._mostrarErro(Idioma.traduzir('cadastro.mensagens.dataInvalida'));
        return null;
      }
      dataISO = this._formatarDataISO(dataInterpretada);
    }

    const unidadeSelecionada = this.campos.unidadeMedida.value;
    const unidadeMedida = UNIDADES_DE_MEDIDA_PERMITIDAS.has(unidadeSelecionada) ? unidadeSelecionada : 'un';

    const precoCustoTexto = this.campos.precoCusto.value.trim();
    let precoCusto = null;
    if (precoCustoTexto !== '') {
      precoCusto = Sanitizacao.paraNumeroMonetario(precoCustoTexto);
      if (precoCusto === null) {
        this._mostrarErro(Idioma.traduzir('cadastro.mensagens.precoCustoInvalido'));
        return null;
      }
    }

    const precoVendaTexto = this.campos.precoVenda.value.trim();
    let precoVenda = null;
    if (precoVendaTexto !== '') {
      precoVenda = Sanitizacao.paraNumeroMonetario(precoVendaTexto);
      if (precoVenda === null) {
        this._mostrarErro(Idioma.traduzir('cadastro.mensagens.precoVendaInvalido'));
        return null;
      }
    }

    // Estoque mínimo/máximo são opcionais: em branco significa que este
    // produto não entra na checagem automática de crítico/superlotado
    // (ver MovimentacaoResultadoResponse/ProdutoService no backend).
    const estoqueMinimoTexto = this.campos.estoqueMinimo.value.trim();
    let estoqueMinimo = null;
    if (estoqueMinimoTexto !== '') {
      estoqueMinimo = Sanitizacao.paraNumeroFinito(estoqueMinimoTexto);
      if (estoqueMinimo === null || !Number.isInteger(estoqueMinimo) || estoqueMinimo < 0) {
        this._mostrarErro(Idioma.traduzir('cadastro.mensagens.estoqueMinimoInvalido'));
        return null;
      }
    }

    const estoqueMaximoTexto = this.campos.estoqueMaximo.value.trim();
    let estoqueMaximo = null;
    if (estoqueMaximoTexto !== '') {
      estoqueMaximo = Sanitizacao.paraNumeroFinito(estoqueMaximoTexto);
      if (estoqueMaximo === null || !Number.isInteger(estoqueMaximo) || estoqueMaximo < 0) {
        this._mostrarErro(Idioma.traduzir('cadastro.mensagens.estoqueMaximoInvalido'));
        return null;
      }
    }

    if (estoqueMinimo !== null && estoqueMaximo !== null && estoqueMinimo > estoqueMaximo) {
      this._mostrarErro(Idioma.traduzir('cadastro.mensagens.minimoMaiorQueMaximo'));
      return null;
    }

    this._limparMensagem();

    // Nenhum "id" é incluído aqui de propósito — é gerado pelo backend.
    return {
      marca: marca || null,
      nomeProduto,
      quantidade,
      codigo,
      data: dataISO,
      tipo,
      fornecedor: fornecedor || null,
      unidadeMedida,
      precoCusto,
      precoVenda,
      estoqueMinimo,
      estoqueMaximo,
    };
  }

  /** Inverso de _formatarDataISO: "aaaa-mm-dd" (vindo do backend) -> "dd/mm/aaaa" (formato do campo). */
  _converterDataIsoParaBr(dataIso) {
    const partida = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataIso || '');
    if (!partida) return '';
    const [, ano, mes, dia] = partida;
    return `${dia}/${mes}/${ano}`;
  }

  /** Interpreta "dd/mm/aaaa" e rejeita datas inexistentes (ex.: 31/02/2026). */
  _interpretarData(texto) {
    const partida = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
    if (!partida) return null;

    const dia = Number(partida[1]);
    const mes = Number(partida[2]);
    const ano = Number(partida[3]);
    const data = new Date(ano, mes - 1, dia);

    if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
      return null;
    }
    return data;
  }

  _formatarDataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}

/**
 * ============================================================
 * Integração com o backend
 * ------------------------------------------------------------
 * Mesmo padrão de painel.js: ponto de integração único e claramente
 * marcado. Hoje só avisa no console e falha de propósito — não
 * fabrica um "sucesso" falso. Substitua pela chamada real, por
 * exemplo:
 *
 *   async function cadastrarProdutoNoServidor(produto) {
 *     const resposta = await fetch('/api/estoque/produtos', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(produto),
 *     });
 *     if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
 *   }
 * ============================================================
 */
async function cadastrarProdutoNoServidor(produto) {
  // Log de diagnóstico temporário: se isso NÃO aparecer no console do
  // navegador ao clicar em "Salvar", o problema está antes do fetch.
  console.log('[DEBUG] Enviando POST /api/estoque/produtos:', produto);
  await requisicaoApi('/api/estoque/produtos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(produto),
  });
}

async function atualizarProdutoNoServidor(id, produto) {
  console.log('[DEBUG] Enviando PUT /api/estoque/produtos/' + id + ':', produto);
  await requisicaoApi(`/api/estoque/produtos/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(produto),
  });
}

function inicializarModalCadastro() {
  const modal = new ModalCadastroProduto({
    idGatilho: 'botaoAbrirCadastro',
    idSobreposicao: 'sobreposicaoModalCadastro',
    idFormulario: 'modalCadastroProduto',
    idBotaoFechar: 'botaoFecharModalCadastro',
    idBotaoSalvar: 'botaoSalvarCadastro',
    idMensagem: 'mensagemModalCadastro',
  });
  // Exposto globalmente para a Planilha (planilha.js, carregado depois)
  // poder abrir este mesmo modal em modo de edição, sem duplicar toda a
  // lógica de formulário/validação numa segunda classe.
  window.modalCadastroProdutoInstancia = modal;
  return modal;
}

inicializarModalCadastro();




































