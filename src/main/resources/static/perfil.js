

/**
 * ============================================================
 * Página de Perfil (dados de acesso do usuário)
 * ------------------------------------------------------------
 * Segue o mesmo padrão de painel.js: um dado que entra ou sai do
 * sistema vira uma classe de domínio que se auto-sanitiza no
 * construtor (aqui, `PerfilUsuario`) — assim nenhum valor bruto
 * (do backend OU do formulário) circula pelo resto do código sem
 * já ter passado pelo "porteiro" de `Sanitizacao`.
 *
 * Perfil não é um modal: é uma página completa dentro de
 * `area-conteudo`, igual ao Painel de Estoque, alternada pelo item
 * "Perfil" da barra lateral.
 *
 * Reaproveita `Sanitizacao`, definida em painel.js — mesmo padrão
 * de cadastro.js/planilha.js (scripts clássicos no mesmo escopo
 * léxico de topo). painel.js precisa ser carregado ANTES deste
 * arquivo (ver dashboard-loranks.html).
 *
 * O campo Idioma troca o idioma da interface de fato: ao salvar,
 * chama `window.Idioma.definir(idioma)` (exposto por i18n.js, que
 * também precisa ser carregado antes deste arquivo). Se i18n.js não
 * estiver presente por algum motivo, a página de Perfil continua
 * funcionando normalmente — só a troca de idioma fica inativa.
 *
 * A senha é tratada como opcional: campo em branco significa
 * "não alterar a senha atual".
 *
 * Toda escrita no DOM usa textContent/atribuição de `.value` —
 * nunca innerHTML — então nenhum dado (nome de usuário, mensagem
 * de erro etc.) é interpretado como HTML/script, mesmo que um
 * valor malicioso chegue a escapar da sanitização.
 * ============================================================
 */

/**
 * Idiomas aceitos pelo formulário de Perfil. Mantido em sincronia
 * "de fato" com i18n.js: se `window.Idioma` estiver disponível,
 * usamos a lista de idiomas suportados de lá (fonte única de
 * verdade); senão, caímos neste conjunto local como reserva, para
 * a página de Perfil continuar funcionando mesmo sem i18n.js.
 */
// Nome próprio (sufixo _PERFIL) para não colidir com a constante
// homônima declarada em i18n.js: scripts clássicos compartilham o
// mesmo escopo de topo e uma redeclaração com `const` quebraria este
// arquivo inteiro.
const IDIOMA_PADRAO_PERFIL = 'pt-BR';
const IDIOMAS_PERMITIDOS_RESERVA = Object.freeze(['pt-BR', 'en-US', 'es-ES']);

function obterIdiomasSuportados() {
  if (window.Idioma && typeof window.Idioma.obterSuportados === 'function') {
    const suportados = window.Idioma.obterSuportados();
    if (Array.isArray(suportados) && suportados.length > 0) {
      return new Set(suportados);
    }
  }
  return new Set(IDIOMAS_PERMITIDOS_RESERVA);
}

/**
 * Tetos e limites de negócio do Perfil, centralizados aqui pelo
 * mesmo motivo de Sanitizacao.TAMANHO_MAXIMO_TEXTO_PADRAO: existem
 * só para barrar o que é claramente inválido ou um payload
 * corrompido/malicioso, nunca para restringir um uso real.
 */
const LIMITES_PERFIL = Object.freeze({
  TAMANHO_MAXIMO_NOME_USUARIO: 150,
  TAMANHO_MINIMO_SENHA: 6,
  TAMANHO_MAXIMO_SENHA: 128, // teto generoso; nenhuma senha real chega perto disso
});

/**
 * Porteiro dedicado para senha: só diz se o valor é aceitável,
 * NUNCA o transforma. `Sanitizacao.sanitizarTexto` colapsa espaços,
 * remove caracteres de controle e corta o tamanho — comportamento
 * certo para texto exibido na tela, mas errado para senha, onde
 * qualquer caractere (inclusive espaços) pode ser intencional e
 * alterar o valor mudaria silenciosamente a senha que o usuário quis
 * definir. Por isso a senha nunca passa por Sanitizacao.
 */
const ValidadorSenha = Object.freeze({
  /** Verdadeiro apenas para string dentro do intervalo de tamanho aceito. */
  ehValida(valor) {
    return (
      typeof valor === 'string' &&
      valor.length >= LIMITES_PERFIL.TAMANHO_MINIMO_SENHA &&
      valor.length <= LIMITES_PERFIL.TAMANHO_MAXIMO_SENHA
    );
  },
});

/**
 * Dados de perfil do usuário, sempre sanitizados na construção —
 * seja a origem o backend (`obterPerfilUsuario`) ou o formulário
 * (`PaginaPerfil._validarCampos`). Um objeto `PerfilUsuario` nunca
 * carrega um nome de usuário ou idioma "cru".
 *
 * A senha é tratada à parte (ver `ValidadorSenha`) e nunca vive
 * dentro desta classe: perfil é um dado que se exibe na tela,
 * senha não é e não deve ser guardada além do tempo de envio.
 */
class PerfilUsuario {
  constructor({ nomeUsuario, idioma } = {}) {
    this.nomeUsuario = Sanitizacao.sanitizarTexto(nomeUsuario, {
      tamanhoMaximo: LIMITES_PERFIL.TAMANHO_MAXIMO_NOME_USUARIO,
      valorReserva: '',
    });

    const idiomasPermitidos = obterIdiomasSuportados();
    const idiomaSanitizado = Sanitizacao.sanitizarTexto(idioma, { tamanhoMaximo: 10, valorReserva: IDIOMA_PADRAO_PERFIL });
    this.idioma = idiomasPermitidos.has(idiomaSanitizado) ? idiomaSanitizado : IDIOMA_PADRAO_PERFIL;
  }

  /** Um perfil só é válido para envio se tiver nome de usuário depois de sanitizado. */
  get valido() {
    return this.nomeUsuario.length > 0;
  }
}

class PaginaPerfil {
  constructor({ idBotaoNavegacao, idBotaoTelaInicial, idPagina, idOutraPagina, idFormulario, idBotaoSalvar, idMensagem }) {
    this.botaoNavegacao = Sanitizacao.ehIdDomValido(idBotaoNavegacao) ? document.getElementById(idBotaoNavegacao) : null;
    this.botaoTelaInicial = Sanitizacao.ehIdDomValido(idBotaoTelaInicial) ? document.getElementById(idBotaoTelaInicial) : null;
    this.pagina = Sanitizacao.ehIdDomValido(idPagina) ? document.getElementById(idPagina) : null;
    this.outraPagina = Sanitizacao.ehIdDomValido(idOutraPagina) ? document.getElementById(idOutraPagina) : null;
    this.formulario = Sanitizacao.ehIdDomValido(idFormulario) ? document.getElementById(idFormulario) : null;
    this.botaoSalvar = Sanitizacao.ehIdDomValido(idBotaoSalvar) ? document.getElementById(idBotaoSalvar) : null;
    this.elementoMensagem = Sanitizacao.ehIdDomValido(idMensagem) ? document.getElementById(idMensagem) : null;

    if (!this.pagina || !this.formulario) {
      console.error('PaginaPerfil: elementos essenciais (página/formulário) não encontrados no DOM.');
      return;
    }

    this.campos = {
      nomeUsuario: document.getElementById('campoNomeUsuario'),
      novaSenha: document.getElementById('campoNovaSenha'),
      idioma: document.getElementById('campoIdioma'),
    };

    const camposFaltando = Object.entries(this.campos).filter(([, elemento]) => !elemento);
    if (camposFaltando.length > 0) {
      console.error('PaginaPerfil: campos ausentes no DOM:', camposFaltando.map(([nome]) => nome));
    }

    this._vincularEventos();
  }

  _vincularEventos() {
    if (this.botaoNavegacao) {
      this.botaoNavegacao.addEventListener('click', () => this.abrir());
    }
    if (this.botaoTelaInicial) {
      this.botaoTelaInicial.addEventListener('click', () => this.fechar());
    }
    this.formulario.addEventListener('submit', (evento) => {
      evento.preventDefault();
      this._validarESalvar();
    });
  }

  /** Mostra a página de Perfil, esconde as demais e carrega os dados atuais. */
  async abrir() {
    this._limparMensagem();
    mostrarPagina('paginaPerfil', 'botaoAbrirPerfil');
    this._definirCarregando(true);

    try {
      const perfil = await obterPerfilUsuario();
      this._preencherFormulario(perfil);
    } catch (erro) {
      console.error('Falha ao carregar dados do perfil:', erro);
      this._mostrarErro('Não foi possível carregar seus dados agora. Tente novamente.');
    } finally {
      this._definirCarregando(false);
    }
  }

  /** Volta para o Painel, tirando o destaque de "Perfil". */
  fechar() {
    mostrarPagina('paginaPainel', 'botaoAbrirTelaInicial');
    // Se o idioma foi trocado enquanto o Perfil estava aberto, o Painel
    // (que ficou escondido, e por isso não reagiu ao evento
    // 'idioma:alterado' em painel.js) precisa se atualizar agora, ao
    // voltar a ficar visível - mesmo padrão já usado em movimentacao.js.
    if (typeof window.inicializarPainel === 'function') {
      window.inicializarPainel().catch((erro) => {
        console.error('Falha ao atualizar o Painel ao voltar do Perfil:', erro);
      });
    }
  }

  _definirCarregando(carregando) {
    if (this.botaoSalvar) {
      this.botaoSalvar.disabled = carregando;
    }
  }

  /**
   * Preenche o formulário a partir de um `PerfilUsuario` já
   * sanitizado. A senha nunca é preenchida — nem o backend deveria
   * devolvê-la, e o campo é sempre tratado como "nova senha".
   */
  _preencherFormulario(perfil) {
    const perfilValidado = perfil instanceof PerfilUsuario ? perfil : new PerfilUsuario(perfil);
    const idiomasPermitidos = obterIdiomasSuportados();

    // Atribuição a `.value`, não a innerHTML/textContent de um elemento
    // de exibição — não há risco de interpretação como HTML aqui.
    this.campos.nomeUsuario.value = perfilValidado.nomeUsuario;
    this.campos.novaSenha.value = '';
    this.campos.idioma.value = idiomasPermitidos.has(perfilValidado.idioma) ? perfilValidado.idioma : IDIOMA_PADRAO_PERFIL;
  }

  _limparMensagem() {
    if (!this.elementoMensagem) return;
    this.elementoMensagem.hidden = true;
    this.elementoMensagem.textContent = '';
    this.elementoMensagem.classList.remove('cartao--perfil__mensagem--sucesso');
  }

  _mostrarErro(texto) {
    if (!this.elementoMensagem) return;
    this.elementoMensagem.hidden = false;
    this.elementoMensagem.classList.remove('cartao--perfil__mensagem--sucesso');
    this.elementoMensagem.textContent = texto;
  }

  _mostrarSucesso(texto) {
    if (!this.elementoMensagem) return;
    this.elementoMensagem.hidden = false;
    this.elementoMensagem.classList.add('cartao--perfil__mensagem--sucesso');
    this.elementoMensagem.textContent = texto;
  }

  async _validarESalvar() {
    const resultado = this._validarCampos();
    if (!resultado) return;

    this._definirCarregando(true);
    try {
      await salvarPerfilUsuario(resultado);
      this.campos.novaSenha.value = '';
      this._aplicarIdiomaEscolhido(resultado.idioma);
      this._mostrarSucesso('Dados atualizados com sucesso.');
    } catch (erro) {
      console.error('Falha ao salvar perfil:', erro);
      this._mostrarErro('Não foi possível salvar as alterações agora. Tente novamente.');
    } finally {
      this._definirCarregando(false);
    }
  }

  /**
   * Troca o idioma da interface de fato, chamando a API pública de
   * i18n.js — só depois que o backend confirmou o salvamento, para
   * não mudar a tela se a gravação falhar. Se i18n.js não estiver
   * carregado, não faz nada (a página de Perfil continua funcional).
   */
  _aplicarIdiomaEscolhido(idioma) {
    if (window.Idioma && typeof window.Idioma.definir === 'function') {
      window.Idioma.definir(idioma);
    }
  }

  /**
   * O porteiro do formulário: nada sai desta função sem ter sido
   * validado. Retorna o payload pronto para envio, ou `null` se
   * algo estiver inválido (mensagem já exibida aqui). `novaSenha`
   * só entra no payload se o usuário de fato preencheu algo — em
   * branco significa "não alterar a senha atual".
   */
  _validarCampos() {
    const perfil = new PerfilUsuario({
      nomeUsuario: this.campos.nomeUsuario.value,
      idioma: this.campos.idioma.value,
    });

    if (!perfil.valido) {
      this._mostrarErro('Informe um nome de usuário.');
      return null;
    }

    const novaSenha = this.campos.novaSenha.value;
    const senhaFoiPreenchida = novaSenha !== '';

    if (senhaFoiPreenchida && !ValidadorSenha.ehValida(novaSenha)) {
      this._mostrarErro(`A senha deve ter no mínimo ${LIMITES_PERFIL.TAMANHO_MINIMO_SENHA} caracteres.`);
      return null;
    }

    this._limparMensagem();

    const payload = { nomeUsuario: perfil.nomeUsuario, idioma: perfil.idioma };
    if (senhaFoiPreenchida) {
      payload.novaSenha = novaSenha;
    }
    return payload;
  }
}

/**
 * ============================================================
 * Integração com o backend
 * ------------------------------------------------------------
 * Mesmo padrão de painel.js/cadastro.js/planilha.js: ponto de
 * integração único e claramente marcado. Hoje só avisam no console
 * e falham de propósito — não fabricam dados falsos. Substitua
 * pelas chamadas reais, por exemplo:
 *
 *   async function obterPerfilUsuario() {
 *     const resposta = await fetch('/api/perfil');
 *     if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
 *     const dados = await resposta.json();
 *     return new PerfilUsuario(dados); // sanitiza o que vier do backend
 *   }
 *
 *   async function salvarPerfilUsuario(payload) {
 *     const resposta = await fetch('/api/perfil', {
 *       method: 'PUT',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(payload),
 *     });
 *     if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
 *   }
 * ============================================================
 */
async function obterPerfilUsuario() {
  const resposta = await requisicaoApi('/api/perfil');
  const dados = await resposta.json();
  return new PerfilUsuario(dados); // sanitiza o que vier do backend
}

async function salvarPerfilUsuario(payload) {
  await requisicaoApi('/api/perfil', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function inicializarPaginaPerfil() {
  const pagina = new PaginaPerfil({
    idBotaoNavegacao: 'botaoAbrirPerfil',
    idBotaoTelaInicial: 'botaoAbrirTelaInicial',
    idPagina: 'paginaPerfil',
    idOutraPagina: 'paginaPainel',
    idFormulario: 'formularioPerfil',
    idBotaoSalvar: 'botaoSalvarPerfil',
    idMensagem: 'mensagemPerfil',
  });

  // CORREÇÃO: Escuta o evento global do i18n.js para atualizar a interface imediatamente
  window.addEventListener('idioma:alterado', async () => {
    try {
      const perfilAtualizado = await obterPerfilUsuario();
      pagina._preencherFormulario(perfilAtualizado);
    } catch (erro) {
      console.error('Erro ao re-renderizar o perfil após troca de idioma:', erro);
    }
  });

  const marca = document.querySelector('.barra-lateral__marca');
  if (marca) {
    marca.style.cursor = 'pointer';
    marca.addEventListener('click', () => pagina.fechar());
  }

  return pagina;
}

// Esta linha executa a função acima assim que o navegador termina de ler o arquivo
inicializarPaginaPerfil();























