

'use strict';

/**
 * LORANKS — Login form controller
 *
 * Regra de ouro: NUNCA confiar no que o usuário envia.
 * - Toda entrada é sanitizada (trim + remoção de caracteres de controle)
 *   antes de qualquer validação ou uso.
 * - Toda saída de texto para o DOM usa `textContent`, nunca `innerHTML`,
 *   para que qualquer marcação/script enviado pelo usuário seja
 *   automaticamente neutralizado (tratado como texto puro, não como HTML).
 */

(function () {
  // ---------------------------------------------------------------------
  // Configuração / regras de validação
  // ---------------------------------------------------------------------
  const RULES = Object.freeze({
    username: {
      minLength: 3,
      maxLength: 40,
      // Letras, números, ponto, underscore, hífen e @ (para permitir e-mail)
      pattern: /^[a-zA-Z0-9._@-]+$/,
    },
    password: {
      minLength: 6,
      maxLength: 64,
    },
  });

  // ---------------------------------------------------------------------
  // Referências ao DOM (buscadas uma única vez)
  // ---------------------------------------------------------------------
  const form = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const usernameError = document.getElementById('username-error');
  const passwordError = document.getElementById('password-error');
  const formAlert = document.getElementById('form-alert');
  const submitBtn = document.getElementById('submit-btn');
  const togglePasswordBtn = document.getElementById('toggle-password');

  // ---------------------------------------------------------------------
  // Sanitização
  // ---------------------------------------------------------------------

  /**
   * Sanitiza uma string recebida do usuário:
   * - Garante que é string (evita erro se algo inesperado chegar).
   * - Remove caracteres de controle invisíveis (ex.: NUL, backspace).
   * - Remove espaços nas extremidades.
   * - Corta o valor no tamanho máximo permitido, como defesa extra
   *   (independente do atributo maxlength do HTML, que pode ser burlado).
   *
   * @param {unknown} rawValue - valor bruto vindo de um input.
   * @param {number} maxLength - tamanho máximo aceito.
   * @returns {string} valor limpo e seguro para validação/uso.
   */
  function sanitizeInput(rawValue, maxLength) {
    const asString = typeof rawValue === 'string' ? rawValue : String(rawValue ?? '');
    const withoutControlChars = asString.replace(/[\u0000-\u001F\u007F]/g, '');
    const trimmed = withoutControlChars.trim();
    return trimmed.slice(0, maxLength);
  }

  /**
   * Exibe uma mensagem de erro em um elemento usando textContent,
   * o que impede qualquer HTML/script embutido na mensagem de ser
   * interpretado pelo navegador.
   *
   * @param {HTMLElement} element
   * @param {string} message
   */
  function setFieldError(element, message) {
    element.textContent = message;
  }

  function clearFieldError(element) {
    element.textContent = '';
  }

  function setInvalid(input, isInvalid) {
    input.setAttribute('aria-invalid', String(isInvalid));
  }

  function showFormAlert(message, { sucesso = false } = {}) {
    formAlert.textContent = message;
    formAlert.classList.toggle('form-alert--sucesso', sucesso);
    formAlert.hidden = false;
  }

  function hideFormAlert() {
    formAlert.textContent = '';
    formAlert.classList.remove('form-alert--sucesso');
    formAlert.hidden = true;
  }

  /**
   * Se a pessoa acabou de se cadastrar (ver irParaLoginComAvisoDeCadastro
   * em autenticacao.js), mostra aqui o aviso sobre privilégio de admin.
   * removeItem logo em seguida: é um aviso de UMA navegação só - se a
   * pessoa recarregar a tela de login depois, não deve reaparecer.
   */
  function mostrarAvisoDeCadastroSeHouver() {
    const aviso = sessionStorage.getItem(CHAVE_AVISO_CADASTRO_REALIZADO);
    if (!aviso) return;
    sessionStorage.removeItem(CHAVE_AVISO_CADASTRO_REALIZADO);
    showFormAlert(aviso, { sucesso: true });
  }
  mostrarAvisoDeCadastroSeHouver();

  // ---------------------------------------------------------------------
  // Validação
  // ---------------------------------------------------------------------

  /**
   * Valida o campo de usuário já sanitizado.
   * @param {string} value
   * @returns {string} mensagem de erro, ou string vazia se válido.
   */
  function validateUsername(value) {
    if (value.length === 0) {
      return 'Informe seu usuário.';
    }
    if (value.length < RULES.username.minLength) {
      return `O usuário deve ter pelo menos ${RULES.username.minLength} caracteres.`;
    }
    if (value.length > RULES.username.maxLength) {
      return `O usuário deve ter no máximo ${RULES.username.maxLength} caracteres.`;
    }
    if (!RULES.username.pattern.test(value)) {
      return 'Use apenas letras, números e os símbolos . _ - @';
    }
    return '';
  }

  /**
   * Valida o campo de senha já sanitizado.
   * @param {string} value
   * @returns {string} mensagem de erro, ou string vazia se válido.
   */
  function validatePassword(value) {
    if (value.length === 0) {
      return 'Informe sua senha.';
    }
    if (value.length < RULES.password.minLength) {
      return `A senha deve ter pelo menos ${RULES.password.minLength} caracteres.`;
    }
    if (value.length > RULES.password.maxLength) {
      return `A senha deve ter no máximo ${RULES.password.maxLength} caracteres.`;
    }
    return '';
  }

  /**
   * Lê, sanitiza e valida um campo, atualizando a UI de erro.
   * @param {HTMLInputElement} input
   * @param {HTMLElement} errorEl
   * @param {(value: string) => string} validatorFn
   * @param {number} maxLength
   * @returns {{ value: string, isValid: boolean }}
   */
  function processField(input, errorEl, validatorFn, maxLength) {
    const sanitized = sanitizeInput(input.value, maxLength);
    const errorMessage = validatorFn(sanitized);
    const isValid = errorMessage === '';

    setInvalid(input, !isValid);
    if (isValid) {
      clearFieldError(errorEl);
    } else {
      setFieldError(errorEl, errorMessage);
    }

    return { value: sanitized, isValid };
  }

  // ---------------------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------------------

  // Validação em tempo real, limpando o erro assim que o usuário corrige.
  usernameInput.addEventListener('input', () => {
    processField(usernameInput, usernameError, validateUsername, RULES.username.maxLength);
  });

  passwordInput.addEventListener('input', () => {
    processField(passwordInput, passwordError, validatePassword, RULES.password.maxLength);
  });

  // Alternar visibilidade da senha sem expor lógica insegura.
  togglePasswordBtn.addEventListener('click', () => {
    const isCurrentlyHidden = passwordInput.type === 'password';
    passwordInput.type = isCurrentlyHidden ? 'text' : 'password';
    togglePasswordBtn.textContent = isCurrentlyHidden ? 'Ocultar' : 'Mostrar';
    togglePasswordBtn.setAttribute('aria-pressed', String(isCurrentlyHidden));
    togglePasswordBtn.setAttribute(
      'aria-label',
      isCurrentlyHidden ? 'Ocultar senha' : 'Mostrar senha'
    );
  });

  // "Criar conta" e "Esqueci a senha" agora têm destino real (href no
  // próprio HTML: criar-conta.html e /esqueci-senha) - não precisam mais
  // de handler placeholder aqui.

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    hideFormAlert();

    const username = processField(
      usernameInput,
      usernameError,
      validateUsername,
      RULES.username.maxLength
    );
    const password = processField(
      passwordInput,
      passwordError,
      validatePassword,
      RULES.password.maxLength
    );

    if (!username.isValid || !password.isValid) {
      showFormAlert('Corrija os campos destacados antes de continuar.');
      // Move o foco para o primeiro campo inválido, ajudando leitores de tela.
      (username.isValid ? passwordInput : usernameInput).focus();
      return;
    }

    // A partir daqui, username.value e password.value já estão
    // sanitizados e validados — seguros para envio ao backend
    // (nunca para inserção direta em HTML).
    submitLogin(username.value, password.value);
  });

  // ---------------------------------------------------------------------
  // Envio
  // ---------------------------------------------------------------------

  /**
   * Autentica as credenciais (via `autenticarUsuario`, definido em
   * autenticacao.js) e, se confirmadas pelo backend, leva o usuário
   * ao painel. Se a autenticação falhar, mostra o erro real — nunca
   * finge sucesso.
   *
   * @param {string} username - já sanitizado e validado.
   * @param {string} password - já sanitizado e validado.
   */
  async function submitLogin(username, password) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    try {
      await autenticarUsuario(username, password);
      // Login confirmado pelo backend: segue para o painel. Não
      // reabilita o botão aqui de propósito — a navegação já está a
      // caminho, então não há por que voltar a permitir clique.
      irParaPainel();
    } catch (erro) {
      console.error('Falha ao autenticar:', erro);
      // showFormAlert usa textContent internamente, então a mensagem de
      // erro nunca é interpretada como HTML, mesmo vinda de uma exceção.
      showFormAlert(erro instanceof Error ? erro.message : 'Não foi possível entrar agora. Tente novamente.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
    }

    // A senha nunca é logada, exibida ou persistida no cliente.
    void password;
  }
})();






























