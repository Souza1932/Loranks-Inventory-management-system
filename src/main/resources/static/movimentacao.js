/**
 * ============================================================
 * RASCUNHO - Movimentação de estoque (entrada/saída)
 * ------------------------------------------------------------
 * Página nova no dashboard, seguindo o mesmo padrão de PaginaPerfil
 * (perfil.js): a classe abre/fecha a própria página e alterna com
 * "paginaPainel", destacando o item certo no menu lateral.
 *
 * Suporta bipagem e digitação manual no MESMO campo de código:
 * um leitor USB de código de barras se comporta como um teclado,
 * digitando o código e disparando "Enter" sozinho no final. Então
 * o campo "campoCodigo" escuta o evento Enter e reage do mesmo
 * jeito, não importa se foi o leitor ou o dedo do usuário que
 * digitou.
 *
 * Fluxo:
 *   1) Usuário bipa OU digita o código + Enter -> busca o produto
 *      (GET /api/estoque/produtos/codigo/{codigo}) e mostra os
 *      dados na tela pra confirmação visual (evita dar saída no
 *      produto errado por erro de leitura/digitação).
 *   2) Usuário informa a quantidade e o tipo (entrada/saída).
 *   3) Confirma -> POST /api/estoque/movimentacoes -> mostra o
 *      resultado, incluindo alertas de estoque crítico/superlotado
 *      já calculados pelo backend na mesma chamada.
 *
 * Histórico: a tabela "Histórico de movimentações" é GERAL (todos os
 * produtos, GET /api/estoque/historico) e persistente na tela - ela é
 * carregada assim que a página abre (não depende de bipar nada antes)
 * e recarregada de novo depois de cada movimentação confirmada, pra já
 * aparecer no topo. Os dados em si sempre estiveram persistidos no
 * banco (tabela movimentacao_estoque, uma linha por movimentação); o
 * que mudou aqui foi só a tela sempre consultar e mostrar tudo, em vez
 * de só o extrato de um produto buscado na hora.
 *
 * Depende de api.js (requisicaoApi, obterCookie) e painel.js
 * (Sanitizacao) já carregados antes deste arquivo, mesmo esquema
 * usado por cadastro.js/perfil.js.
 *
 * ATENÇÃO: isto é um RASCUNHO. Os IDs abaixo batem com o HTML de
 * exemplo que também estou te passando (seção "Movimentação" no
 * dashboard-loranks.html) - ajuste se você mudar algum id lá.
 * ============================================================
 */

// Mesma convenção de FORMATADOR_MOEDA (planilha.js): formatação fixa em
// pt-BR independente do idioma da interface selecionado - datas de
// movimentação de estoque seguem o padrão brasileiro dd/mm/aaaa.
const FORMATADOR_DATA_HORA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

class MovimentacaoEstoque {
  constructor({
    idBotaoNavegacao,
    idBotaoTelaInicial,
    idPagina,
    idOutraPagina,
    idCampoCodigo,
    idCampoQuantidade,
    idSeletorTipo,
    idProdutoEncontrado,
    idBotaoConfirmar,
    idMensagem,
    idCartaoHistorico,
    idCorpoHistorico,
  }) {
    // Navegação: mesmo padrão de PaginaPerfil (perfil.js) - cada página
    // sabe abrir a si mesma e esconder a "outra página" (o Painel).
    this.botaoNavegacao = Sanitizacao.ehIdDomValido(idBotaoNavegacao) ? document.getElementById(idBotaoNavegacao) : null;
    this.botaoTelaInicial = Sanitizacao.ehIdDomValido(idBotaoTelaInicial) ? document.getElementById(idBotaoTelaInicial) : null;
    this.pagina = Sanitizacao.ehIdDomValido(idPagina) ? document.getElementById(idPagina) : null;
    this.outraPagina = Sanitizacao.ehIdDomValido(idOutraPagina) ? document.getElementById(idOutraPagina) : null;

    this.campoCodigo = Sanitizacao.ehIdDomValido(idCampoCodigo) ? document.getElementById(idCampoCodigo) : null;
    this.campoQuantidade = Sanitizacao.ehIdDomValido(idCampoQuantidade) ? document.getElementById(idCampoQuantidade) : null;
    this.seletorTipo = Sanitizacao.ehIdDomValido(idSeletorTipo) ? document.getElementById(idSeletorTipo) : null;
    this.elementoProdutoEncontrado = Sanitizacao.ehIdDomValido(idProdutoEncontrado) ? document.getElementById(idProdutoEncontrado) : null;
    this.botaoConfirmar = Sanitizacao.ehIdDomValido(idBotaoConfirmar) ? document.getElementById(idBotaoConfirmar) : null;
    this.elementoMensagem = Sanitizacao.ehIdDomValido(idMensagem) ? document.getElementById(idMensagem) : null;
    this.cartaoHistorico = Sanitizacao.ehIdDomValido(idCartaoHistorico) ? document.getElementById(idCartaoHistorico) : null;
    this.corpoHistorico = Sanitizacao.ehIdDomValido(idCorpoHistorico) ? document.getElementById(idCorpoHistorico) : null;

    if (!this.pagina || !this.campoCodigo || !this.campoQuantidade || !this.seletorTipo) {
      console.error('MovimentacaoEstoque: elementos essenciais (página/campos) não encontrados no DOM.');
      return;
    }

    // Produto confirmado pela busca de código - só existe entre o passo
    // 1 (busca) e o passo 3 (confirmar). Nada é enviado sem isto preenchido.
    this.produtoEncontrado = null;
    // Última lista do histórico GERAL carregada - guardada só para poder
    // re-renderizar (rótulos ENTRADA/SAÍDA) se o idioma mudar com o
    // histórico já na tela, mesmo padrão de produtoEncontrado acima.
    this.historicoCarregado = null;

    this._vincularEventos();
    this._definirEstadoInicial();
  }

  /**
   * Mostra a página de Movimentação e esconde as demais. O histórico é
   * recarregado aqui, TODA VEZ que o usuário clica em "Movimentação" no
   * menu - a tabela reflete o estado atual do banco, não fica com dados
   * antigos de quando a página foi aberta da última vez.
   */
  abrir() {
    mostrarPagina('paginaMovimentacao', 'botaoAbrirMovimentacao');
    this._resetarParaProximaMovimentacao();
    this._carregarHistoricoGeral();
  }

  /** Volta para o Painel, tirando o destaque de "Movimentação". */
  fechar() {
    mostrarPagina('paginaPainel', 'botaoAbrirTelaInicial');
    // Por segurança: se o usuário voltar pra Tela Inicial depois de uma ou
    // mais movimentações, os cartões (indicadores, gráfico, críticos)
    // devem refletir os números atuais, não os de quando a página carregou.
    this._atualizarPainelSeDisponivel();
  }

  /**
   * Recarrega os dados do Painel (indicadores, gráfico, lista de críticos).
   * inicializarPainel() já existe em painel.js e é idempotente - cada
   * chamada busca tudo de novo e re-renderiza do zero - então é seguro
   * chamar de novo aqui, sem duplicar nenhuma lógica de renderização.
   */
  _atualizarPainelSeDisponivel() {
    if (typeof window.inicializarPainel === 'function') {
      window.inicializarPainel().catch((erro) => {
        console.error('Falha ao atualizar o Painel após movimentação:', erro);
      });
    }
  }

  _vincularEventos() {
    if (this.botaoNavegacao) {
      this.botaoNavegacao.addEventListener('click', () => this.abrir());
    }
    if (this.botaoTelaInicial) {
      this.botaoTelaInicial.addEventListener('click', () => this.fechar());
    }

    this.campoCodigo.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') {
        evento.preventDefault();
        this._buscarProdutoPorCodigo();
      }
    });

    if (this.botaoConfirmar) {
      this.botaoConfirmar.addEventListener('click', () => this._confirmarMovimentacao());
    }

    this.campoQuantidade.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') {
        evento.preventDefault();
        this._confirmarMovimentacao();
      }
    });

    // "Produto encontrado" é texto gerado em JS (Idioma.traduzir), não
    // passa pelo data-i18n automático - se o idioma mudar com um produto
    // já exibido na tela, re-renderiza esse texto no novo idioma.
    window.addEventListener('idioma:alterado', () => {
      if (this.produtoEncontrado) {
        this._exibirProdutoEncontrado(this.produtoEncontrado);
      }
      // Idem para o histórico: re-renderiza os rótulos ENTRADA/SAÍDA já
      // carregados no novo idioma, sem precisar buscar tudo de novo no
      // servidor.
      this._renderizarHistorico(this.historicoCarregado || []);
    });
  }

  _definirEstadoInicial() {
    this._limparMensagem();
    this._exibirProdutoEncontrado(null);
    // Sem carregar o histórico aqui: a página começa oculta (hidden), e
    // abrir() já cuida de buscar o histórico assim que o usuário
    // realmente navega pra essa tela.
  }

  async _buscarProdutoPorCodigo() {
    const produto = await this._obterProdutoPorCodigo(this.campoCodigo.value);
    if (!produto) {
      this.produtoEncontrado = null;
      this._exibirProdutoEncontrado(null);
      this._mostrarErro(Idioma.traduzir('movimentacao.mensagens.produtoNaoEncontrado'));
      return;
    }
    this._limparMensagem();
    this.produtoEncontrado = produto;
    this._exibirProdutoEncontrado(produto);
    this.campoQuantidade.focus();
  }

  /**
   * Busca o produto por código sem mexer em UI - usado tanto pelo Enter no
   * campo (_buscarProdutoPorCodigo, feedback imediato) quanto pelo clique
   * em Confirmar (_confirmarMovimentacao, que faz a busca na hora se o
   * usuário não tiver apertado Enter antes - fluxo comum quando não se usa
   * leitor físico e o usuário só preenche o formulário e clica).
   */
  async _obterProdutoPorCodigo(codigoBruto) {
    const codigo = Sanitizacao.sanitizarTexto(codigoBruto, { tamanhoMaximo: 100, valorReserva: '' });
    if (!codigo) return null;
    try {
      const resposta = await requisicaoApi(`/api/estoque/produtos/codigo/${encodeURIComponent(codigo)}`);
      return await resposta.json();
    } catch (erro) {
      console.error('Falha ao buscar produto por código:', erro);
      return null;
    }
  }

  /**
   * Mostra os dados do produto encontrado (ou limpa a área, se null).
   * Usa apenas textContent - nunca innerHTML - então nenhum valor vindo
   * do backend é interpretado como HTML.
   */
  _exibirProdutoEncontrado(produto) {
    if (!this.elementoProdutoEncontrado) return;

    if (!produto) {
      this.elementoProdutoEncontrado.textContent = '';
      this.elementoProdutoEncontrado.hidden = true;
      return;
    }

    const nome = Sanitizacao.sanitizarTexto(produto.nomeProduto, { tamanhoMaximo: 300, valorReserva: Idioma.traduzir('movimentacao.produtoSemNome') });
    const marca = Sanitizacao.sanitizarTexto(produto.marca, { tamanhoMaximo: 300, valorReserva: '' });
    const unidade = Sanitizacao.sanitizarTexto(produto.unidadeMedida, { tamanhoMaximo: 6, valorReserva: 'un' });

    this.elementoProdutoEncontrado.hidden = false;
    this.elementoProdutoEncontrado.textContent = Idioma.traduzir('movimentacao.produtoEncontrado', {
      nome: `${nome}${marca ? ' - ' + marca : ''}`,
      quantidade: produto.quantidadeAtual,
      unidade,
    });
  }

  /**
   * Busca e mostra o histórico GERAL de movimentações - TODOS os
   * produtos (GET /api/estoque/historico, equivalente a um
   * "SELECT * FROM movimentacao_estoque ORDER BY data_movimentacao
   * DESC"). Chamado assim que a página de Movimentação abre (toda vez
   * que o usuário clica em "Movimentação" no menu) e de novo depois de
   * cada movimentação confirmada, pra já aparecer no topo da lista.
   */
  async _carregarHistoricoGeral() {
    if (!this.cartaoHistorico || !this.corpoHistorico) return;
    try {
      const resposta = await requisicaoApi('/api/estoque/historico');
      const itens = await resposta.json();
      this.historicoCarregado = itens;
      this._renderizarHistorico(itens);
    } catch (erro) {
      console.error('Falha ao carregar histórico de movimentações:', erro);
      this.historicoCarregado = null;
      this.corpoHistorico.innerHTML = '';
      const linha = document.createElement('tr');
      const celula = document.createElement('td');
      celula.colSpan = 4;
      celula.className = 'tabela-historico-movimentacao__vazio';
      celula.textContent = Idioma.traduzir('movimentacao.historico.erroCarregar');
      linha.appendChild(celula);
      this.corpoHistorico.appendChild(linha);
    }
  }

  /**
   * Renderiza a lista de movimentações já carregada. Só textContent (nunca
   * innerHTML) nas células com dado do backend, mesma regra do resto da
   * tela - nenhum valor vindo da API é interpretado como HTML.
   */
  _renderizarHistorico(itens) {
    if (!this.cartaoHistorico || !this.corpoHistorico) return;
    this.corpoHistorico.innerHTML = '';

    if (!itens || itens.length === 0) {
      const linha = document.createElement('tr');
      const celula = document.createElement('td');
      celula.colSpan = 4;
      celula.className = 'tabela-historico-movimentacao__vazio';
      celula.textContent = Idioma.traduzir('movimentacao.historico.vazio');
      linha.appendChild(celula);
      this.corpoHistorico.appendChild(linha);
      return;
    }

    for (const item of itens) {
      const linha = document.createElement('tr');

      const celulaProduto = document.createElement('td');
      celulaProduto.textContent = Sanitizacao.sanitizarTexto(item.nomeProduto, { tamanhoMaximo: 300, valorReserva: Idioma.traduzir('movimentacao.produtoSemNome') });
      linha.appendChild(celulaProduto);

      const celulaData = document.createElement('td');
      celulaData.textContent = this._formatarDataHistorico(item.dataMovimentacao);
      linha.appendChild(celulaData);

      const celulaTipo = document.createElement('td');
      const chaveTipo = item.tipo === 'SAIDA' ? 'movimentacao.tipoSaida' : 'movimentacao.tipoEntrada';
      celulaTipo.textContent = Idioma.traduzir(chaveTipo);
      linha.appendChild(celulaTipo);

      const celulaQuantidade = document.createElement('td');
      celulaQuantidade.className = 'coluna-numerica';
      celulaQuantidade.textContent = String(item.quantidade);
      linha.appendChild(celulaQuantidade);

      this.corpoHistorico.appendChild(linha);
    }
  }

  /** Converte o ISO (aaaa-mm-ddThh:mm:ss, já formatado pelo backend) para dd/mm/aaaa hh:mm. */
  _formatarDataHistorico(dataIso) {
    if (!dataIso) return '';
    const data = new Date(dataIso);
    if (Number.isNaN(data.getTime())) return dataIso;
    return FORMATADOR_DATA_HORA.format(data);
  }

  async _confirmarMovimentacao() {
    const codigoDigitado = Sanitizacao.sanitizarTexto(this.campoCodigo.value, { tamanhoMaximo: 100, valorReserva: '' });
    if (!codigoDigitado) {
      this._mostrarErro(Idioma.traduzir('movimentacao.mensagens.codigoObrigatorio'));
      return;
    }

    const quantidade = Sanitizacao.paraNumeroFinito(this.campoQuantidade.value);
    if (quantidade === null || !Number.isInteger(quantidade) || quantidade <= 0) {
      this._mostrarErro(Idioma.traduzir('movimentacao.mensagens.quantidadeInvalida'));
      return;
    }

    if (this.botaoConfirmar) {
      this.botaoConfirmar.disabled = true;
    }
    this._limparMensagem();

    try {
      // Reaproveita a busca já feita (ex.: usuário apertou Enter no código)
      // só se o código na tela ainda for o mesmo; senão busca de novo agora -
      // cobre o caso comum de preencher tudo e clicar direto em Confirmar,
      // sem passar pelo Enter no campo de código antes.
      let produto = this.produtoEncontrado;
      if (!produto || produto.codigo !== codigoDigitado) {
        produto = await this._obterProdutoPorCodigo(codigoDigitado);
        if (!produto) {
          this._mostrarErro(Idioma.traduzir('movimentacao.mensagens.produtoNaoEncontrado'));
          return;
        }
        this.produtoEncontrado = produto;
        this._exibirProdutoEncontrado(produto);
      }

      const tipo = this.seletorTipo.value === 'SAIDA' ? 'SAIDA' : 'ENTRADA';
      const resultado = await this._enviarMovimentacao(produto.id, tipo, quantidade);

      if (!resultado.sucesso) {
        // resultado.mensagemErro vem do backend (validação de negócio,
        // ex.: "Estoque insuficiente...") e continua em português mesmo
        // com o idioma trocado - traduzir texto gerado pelo servidor
        // exigiria internacionalização também no backend (Accept-Language
        // + message bundles no Spring), fora do escopo desta correção.
        this._mostrarErro(resultado.mensagemErro || Idioma.traduzir('movimentacao.mensagens.erroGenerico'));
        return;
      }

      // Alertas de estoque crítico/superlotado já vêm calculados pelo
      // backend na mesma resposta - exibidos aqui como aviso. Se não
      // houver alerta nenhum, mostra a confirmação de que deu certo -
      // sem isso, o formulário só limpava silenciosamente, sem dar
      // nenhum retorno visível de que a movimentação foi registrada.
      if (resultado.alertaCritico) {
        this._mostrarAviso(resultado.alertaCritico);
      } else if (resultado.alertaSuperlotado) {
        this._mostrarAviso(resultado.alertaSuperlotado);
      } else {
        const chaveSucesso = tipo === 'SAIDA' ? 'movimentacao.mensagens.saidaSucesso' : 'movimentacao.mensagens.entradaSucesso';
        this._mostrarSucesso(Idioma.traduzir(chaveSucesso, { quantidade }));
      }

      // Recarrega o histórico geral pra já mostrar a movimentação recém-
      // -registrada no topo, antes de resetar o formulário pro próximo bip.
      this._carregarHistoricoGeral();

      this._resetarParaProximaMovimentacao();
      // Atualiza o Painel em segundo plano - não bloqueia o próximo bip.
      this._atualizarPainelSeDisponivel();
    } catch (erro) {
      console.error('Falha ao registrar movimentação:', erro);
      this._mostrarErro(Idioma.traduzir('movimentacao.mensagens.erroGenerico'));
    } finally {
      if (this.botaoConfirmar) {
        this.botaoConfirmar.disabled = false;
      }
    }
  }

  /**
   * Faz o POST manualmente (em vez de requisicaoApi) porque aqui
   * precisamos ler o corpo JSON da resposta mesmo quando o backend
   * responde 400 (ex.: "Estoque insuficiente para esta saída") -
   * requisicaoApi lança a exceção antes de expor esse corpo.
   */
  async _enviarMovimentacao(produtoId, tipo, quantidade) {
    const tokenCsrf = obterCookie('XSRF-TOKEN');
    const resposta = await fetch('/api/estoque/movimentacoes', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(tokenCsrf ? { 'X-XSRF-TOKEN': tokenCsrf } : {}),
      },
      body: JSON.stringify({ produtoId, tipo, quantidade }),
    });
    return resposta.json();
  }

  _resetarParaProximaMovimentacao() {
    this.produtoEncontrado = null;
    this.campoCodigo.value = '';
    this.campoQuantidade.value = '';
    this._exibirProdutoEncontrado(null);
    // Foco de volta no código - próxima bipagem já pode acontecer sem
    // o usuário precisar clicar em nada.
    this.campoCodigo.focus();
  }

  _limparMensagem() {
    if (!this.elementoMensagem) return;
    this.elementoMensagem.hidden = true;
    this.elementoMensagem.textContent = '';
    this.elementoMensagem.classList.remove('cartao--perfil__mensagem--sucesso');
  }

  /** Erro/alerta - usa a cor padrão (vermelha) de .cartao--perfil__mensagem, sem modificador. */
  _mostrarErro(texto) {
    if (!this.elementoMensagem) return;
    this.elementoMensagem.hidden = false;
    this.elementoMensagem.textContent = texto;
    this.elementoMensagem.classList.remove('cartao--perfil__mensagem--sucesso');
  }

  /** Alerta de estoque crítico/superlotado - mesma cor de erro, é algo que pede atenção. */
  _mostrarAviso(texto) {
    this._mostrarErro(texto);
  }

  /** Confirmação de sucesso - mesmo modificador que perfil.js já usa para "Dados atualizados". */
  _mostrarSucesso(texto) {
    if (!this.elementoMensagem) return;
    this.elementoMensagem.hidden = false;
    this.elementoMensagem.textContent = texto;
    this.elementoMensagem.classList.add('cartao--perfil__mensagem--sucesso');
  }
}

function inicializarPaginaMovimentacao() {
  return new MovimentacaoEstoque({
    idBotaoNavegacao: 'botaoAbrirMovimentacao',
    idBotaoTelaInicial: 'botaoAbrirTelaInicial',
    idPagina: 'paginaMovimentacao',
    idOutraPagina: 'paginaPainel',
    idCampoCodigo: 'campoCodigoMovimentacao',
    idCampoQuantidade: 'campoQuantidadeMovimentacao',
    idSeletorTipo: 'seletorTipoMovimentacao',
    idProdutoEncontrado: 'produtoEncontradoMovimentacao',
    idBotaoConfirmar: 'botaoConfirmarMovimentacao',
    idMensagem: 'mensagemMovimentacao',
    idCartaoHistorico: 'cartaoHistoricoMovimentacao',
    idCorpoHistorico: 'corpoHistoricoMovimentacao',
  });
}

inicializarPaginaMovimentacao();
