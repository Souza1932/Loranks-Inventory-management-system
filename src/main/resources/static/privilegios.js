/**
 * ============================================================
 * Privilégios — promover/rebaixar administrador
 * ------------------------------------------------------------
 * Único ponto de integração com POST /api/administracao/privilegios e
 * GET /api/administracao/usuarios. Qualquer usuário autenticado pode
 * ABRIR esta tela e ver a lista de contas - quem realmente protege a
 * ação de promover/rebaixar é a senha de privilégios exigida no envio
 * (ver PrivilegioService no backend), não uma checagem de papel aqui no
 * cliente. Mesmo assim, o gatilho deste modal só existe dentro da
 * Planilha (campo sensível), então na prática não fica exposto solto
 * em qualquer tela.
 * ============================================================
 */
class ModalPrivilegios {
  constructor() {
    this.sobreposicao = document.getElementById('sobreposicaoPrivilegios');
    this.gatilho = document.getElementById('botaoAbrirPrivilegios');
    this.botaoFechar = document.getElementById('botaoFecharModalPrivilegios');
    this.formulario = document.getElementById('modalPrivilegios');
    this.campoUsuario = document.getElementById('campoUsuarioPrivilegios');
    this.campoNivel = document.getElementById('campoNivelPrivilegios');
    this.campoSenha = document.getElementById('campoSenhaPrivilegios');
    this.elementoMensagem = document.getElementById('mensagemModalPrivilegios');
    this.botaoConfirmar = document.getElementById('botaoConfirmarPrivilegios');
    this.botaoExcluirConta = document.getElementById('botaoExcluirContaPrivilegios');

    if (!this.sobreposicao || !this.formulario) {
      console.error('ModalPrivilegios: elementos essenciais não encontrados no DOM.');
      return;
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
      this._confirmar();
    });
    if (this.botaoExcluirConta) {
      this.botaoExcluirConta.addEventListener('click', () => this._excluirConta());
    }
  }

  async abrir() {
    this._limparMensagem();
    this.campoSenha.value = '';
    this.sobreposicao.hidden = false;
    PilhaSobreposicoes.abrir(this.sobreposicao);
    await this._carregarUsuarios();
  }

  fechar() {
    this.sobreposicao.hidden = true;
    PilhaSobreposicoes.fechar(this.sobreposicao);
    this.campoSenha.value = '';
    this._limparMensagem();
  }

  async _carregarUsuarios() {
    this.campoUsuario.innerHTML = '';
    try {
      const resposta = await requisicaoApi('/api/administracao/usuarios');
      const usuarios = await resposta.json(); // [{ usuario, nomeCompleto, administrador }]

      usuarios.forEach((u) => {
        const opcao = document.createElement('option');
        opcao.value = u.usuario;
        const nivelAtual = u.administrador
          ? Idioma.traduzir('privilegios.opcaoAdmin')
          : Idioma.traduzir('privilegios.opcaoFuncionario');
        opcao.textContent = `${u.nomeCompleto} (${u.usuario}) — ${nivelAtual}`;
        opcao.dataset.administradorAtual = String(u.administrador);
        this.campoUsuario.appendChild(opcao);
      });

      this._sincronizarNivelComSelecao();
      this.campoUsuario.addEventListener('change', () => this._sincronizarNivelComSelecao());
    } catch (erro) {
      console.error('Falha ao carregar lista de usuários:', erro);
      this._mostrarErro(Idioma.traduzir('privilegios.mensagens.erroCarregarUsuarios'));
    }
  }

  /** Pré-seleciona no campo "Nível" o que a conta escolhida já tem hoje. */
  _sincronizarNivelComSelecao() {
    const opcaoSelecionada = this.campoUsuario.selectedOptions[0];
    if (!opcaoSelecionada) return;
    const jaEhAdmin = opcaoSelecionada.dataset.administradorAtual === 'true';
    this.campoNivel.value = jaEhAdmin ? 'admin' : 'funcionario';
  }

  async _confirmar() {
    this._limparMensagem();

    const usuario = this.campoUsuario.value;
    const administrador = this.campoNivel.value === 'admin';
    const senhaPrivilegios = this.campoSenha.value;

    if (!usuario) {
      this._mostrarErro(Idioma.traduzir('privilegios.mensagens.selecioneUsuario'));
      return;
    }
    if (!senhaPrivilegios) {
      this._mostrarErro(Idioma.traduzir('privilegios.mensagens.informeSenha'));
      return;
    }

    this.botaoConfirmar.disabled = true;
    try {
      const resultado = await this._enviarComSenhaDePrivilegios('/api/administracao/privilegios', {
        usuario,
        administrador,
        senhaPrivilegios,
      });
      if (!resultado.ok) {
        this._mostrarErro(resultado.mensagem);
        return;
      }

      this.campoSenha.value = '';
      this._mostrarSucesso(Idioma.traduzir('privilegios.mensagens.sucesso'));
      await this._carregarUsuarios();
    } catch (erro) {
      console.error('Falha ao atribuir privilégio:', erro);
      this._mostrarErro(Idioma.traduzir('privilegios.mensagens.erroGenerico'));
    } finally {
      this.botaoConfirmar.disabled = false;
    }
  }

  /**
   * Exclui definitivamente a conta selecionada (POST
   * /api/administracao/usuarios/excluir) - mesma senha de privilégios do
   * formulário acima, mesmo botão "Conta" já selecionado. Ação irreversível,
   * então pede confirmação nativa (window.confirm) antes de qualquer coisa,
   * mesmo padrão já usado para excluir produto na Planilha.
   */
  async _excluirConta() {
    this._limparMensagem();

    const usuario = this.campoUsuario.value;
    const senhaPrivilegios = this.campoSenha.value;

    if (!usuario) {
      this._mostrarErro(Idioma.traduzir('privilegios.mensagens.selecioneUsuario'));
      return;
    }
    if (!senhaPrivilegios) {
      this._mostrarErro(Idioma.traduzir('privilegios.mensagens.informeSenha'));
      return;
    }
    if (!window.confirm(Idioma.traduzir('privilegios.mensagens.confirmarExclusao', { usuario }))) {
      return;
    }

    this.botaoExcluirConta.disabled = true;
    try {
      const resultado = await this._enviarComSenhaDePrivilegios('/api/administracao/usuarios/excluir', {
        usuario,
        senhaPrivilegios,
      });
      if (!resultado.ok) {
        this._mostrarErro(resultado.mensagem);
        return;
      }

      this.campoSenha.value = '';
      this._mostrarSucesso(Idioma.traduzir('privilegios.mensagens.sucessoExclusao'));
      await this._carregarUsuarios();
    } catch (erro) {
      console.error('Falha ao excluir conta:', erro);
      this._mostrarErro(Idioma.traduzir('privilegios.mensagens.erroGenerico'));
    } finally {
      this.botaoExcluirConta.disabled = false;
    }
  }

  /**
   * fetch manual (não requisicaoApi) pra poder ler o corpo { erro } numa
   * resposta de erro - requisicaoApi já lança antes de expor isso. Uma
   * ÚNICA chamada de propósito, tanto aqui quanto nos dois métodos acima:
   * refazer o POST só pra ler o erro duplicaria a tentativa errada no
   * limite de bloqueio de PrivilegioService (ver ambos os métodos de lá,
   * que compartilham o mesmo contador).
   */
  async _enviarComSenhaDePrivilegios(caminho, corpo) {
    const tokenCsrf = obterCookie('XSRF-TOKEN');
    const resposta = await fetch(caminho, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(tokenCsrf ? { 'X-XSRF-TOKEN': tokenCsrf } : {}),
      },
      body: JSON.stringify(corpo),
    });

    if (resposta.ok) {
      return { ok: true };
    }

    let mensagem = Idioma.traduzir('privilegios.mensagens.erroGenerico');
    try {
      const corpoErro = await resposta.json();
      if (corpoErro && typeof corpoErro.erro === 'string') {
        mensagem = corpoErro.erro;
      }
    } catch {
      // Corpo vazio/não-JSON - mantém a mensagem genérica.
    }
    return { ok: false, mensagem };
  }

  _mostrarErro(texto) {
    this.elementoMensagem.textContent = texto;
    this.elementoMensagem.hidden = false;
    this.elementoMensagem.classList.remove('modal-cadastro__mensagem--sucesso');
  }

  _mostrarSucesso(texto) {
    this.elementoMensagem.textContent = texto;
    this.elementoMensagem.hidden = false;
    this.elementoMensagem.classList.add('modal-cadastro__mensagem--sucesso');
  }

  _limparMensagem() {
    this.elementoMensagem.textContent = '';
    this.elementoMensagem.hidden = true;
    this.elementoMensagem.classList.remove('modal-cadastro__mensagem--sucesso');
  }
}

window.modalPrivilegiosInstancia = new ModalPrivilegios();





























