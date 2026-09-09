'use strict';

/**
 * LORANKS — Formulário de Criar conta
 *
 * Mesma regra de ouro de script.js (login): NUNCA confiar no que o
 * usuário envia.
 * - Toda entrada é sanitizada (trim + remoção de caracteres de controle)
 *   antes de qualquer validação ou uso.
 * - Toda saída de texto para o DOM usa `textContent`, nunca `innerHTML`.
 *
 * As regras de usuário/senha são propositalmente as MESMAS de
 * script.js — é a mesma credencial que depois será usada para
 * entrar, então não faz sentido a tela de cadastro aceitar algo que
 * a tela de login rejeitaria.
 */

(function () {
  // ---------------------------------------------------------------------
  // Configuração / regras de validação
  // ---------------------------------------------------------------------
  const RULES = Object.freeze({
    nomeCompleto: {
      minLength: 3,
      maxLength: 150,
      // Letras (com acentos/unicode), espaços, apóstrofo e hífen —
      // cobre nomes compostos e sobrenomes como "D'Ávila", "Silva-Costa".
      pattern: /^[\p{L}\s'-]+$/u,
    },
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
    perguntaSeguranca: {
      minLength: 5,
      maxLength: 200,
    },
    respostaSeguranca: {
      minLength: 2,
      maxLength: 100,
    },
  });

  // ---------------------------------------------------------------------
  // Referências ao DOM (buscadas uma única vez)
  // ---------------------------------------------------------------------
  const form = document.getElementById('cadastro-form');
  const nomeCompletoInput = document.getElementById('nome-completo');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const perguntaSegurancaInput = document.getElementById('pergunta-seguranca');
  const respostaSegurancaInput = document.getElementById('resposta-seguranca');
  const nomeCompletoError = document.getElementById('nome-completo-error');
  const usernameError = document.getElementById('username-error');
  const passwordError = document.getElementById('password-error');
  const perguntaSegurancaError = document.getElementById('pergunta-seguranca-error');
  const respostaSegurancaError = document.getElementById('resposta-seguranca-error');
  const formAlert = document.getElementById('form-alert');
  const submitBtn = document.getElementById('submit-btn');
  const voltarBtn = document.getElementById('voltar-btn');
  const togglePasswordBtn = document.getElementById('toggle-password');

  // ---------------------------------------------------------------------
  // Sanitização
  // ---------------------------------------------------------------------

  /**
   * Sanitiza uma string recebida do usuário — mesma lógica de script.js:
   * garante string, remove caracteres de controle, corta espaços nas
   * extremidades e limita o tamanho (defesa extra além do maxlength do HTML).
   *
   * @param {unknown} rawValue
   * @param {number} maxLength
   * @returns {string}
   */
  function sanitizeInput(rawValue, maxLength) {
    const asString = typeof rawValue === 'string' ? rawValue : String(rawValue ?? '');
    const withoutControlChars = asString.replace(/[\u0000-\u001F\u007F]/g, '');
    const trimmed = withoutControlChars.trim();
    return trimmed.slice(0, maxLength);
  }

  function setFieldError(element, message) {
    element.textContent = message;
  }

  function clearFieldError(element) {
    element.textContent = '';
  }

  function setInvalid(input, isInvalid) {
    input.setAttribute('aria-invalid', String(isInvalid));
  }

  function showFormAlert(message) {
    formAlert.textContent = message;
    formAlert.hidden = false;
  }

  function hideFormAlert() {
    formAlert.textContent = '';
    formAlert.hidden = true;
  }

  // ---------------------------------------------------------------------
  // Validação
  // ---------------------------------------------------------------------

  /**
   * @param {string} value - já sanitizado.
   * @returns {string} mensagem de erro, ou string vazia se válido.
   */
  function validateNomeCompleto(value) {
    if (value.length === 0) {
      return 'Informe seu nome completo.';
    }
    if (value.length < RULES.nomeCompleto.minLength) {
      return `O nome deve ter pelo menos ${RULES.nomeCompleto.minLength} caracteres.`;
    }
    if (value.length > RULES.nomeCompleto.maxLength) {
      return `O nome deve ter no máximo ${RULES.nomeCompleto.maxLength} caracteres.`;
    }
    if (!RULES.nomeCompleto.pattern.test(value)) {
      return 'Use apenas letras e espaços.';
    }
    return '';
  }

  /** @param {string} value @returns {string} */
  function validateUsername(value) {
    if (value.length === 0) {
      return 'Escolha um nome de usuário.';
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

  /** @param {string} value @returns {string} */
  function validatePassword(value) {
    if (value.length === 0) {
      return 'Crie uma senha.';
    }
    if (value.length < RULES.password.minLength) {
      return `A senha deve ter pelo menos ${RULES.password.minLength} caracteres.`;
    }
    if (value.length > RULES.password.maxLength) {
      return `A senha deve ter no máximo ${RULES.password.maxLength} caracteres.`;
    }
    return '';
  }

  /** @param {string} value @returns {string} */
  function validatePerguntaSeguranca(value) {
    if (value.length === 0) {
      return 'Crie uma pergunta de segurança.';
    }
    if (value.length < RULES.perguntaSeguranca.minLength) {
      return `A pergunta deve ter pelo menos ${RULES.perguntaSeguranca.minLength} caracteres.`;
    }
    if (value.length > RULES.perguntaSeguranca.maxLength) {
      return `A pergunta deve ter no máximo ${RULES.perguntaSeguranca.maxLength} caracteres.`;
    }
    return '';
  }

  /** @param {string} value @returns {string} */
  function validateRespostaSeguranca(value) {
    if (value.length === 0) {
      return 'Informe a resposta da sua pergunta de segurança.';
    }
    if (value.length < RULES.respostaSeguranca.minLength) {
      return `A resposta deve ter pelo menos ${RULES.respostaSeguranca.minLength} caracteres.`;
    }
    if (value.length > RULES.respostaSeguranca.maxLength) {
      return `A resposta deve ter no máximo ${RULES.respostaSeguranca.maxLength} caracteres.`;
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

  nomeCompletoInput.addEventListener('input', () => {
    processField(nomeCompletoInput, nomeCompletoError, validateNomeCompleto, RULES.nomeCompleto.maxLength);
  });

  usernameInput.addEventListener('input', () => {
    processField(usernameInput, usernameError, validateUsername, RULES.username.maxLength);
  });

  passwordInput.addEventListener('input', () => {
    processField(passwordInput, passwordError, validatePassword, RULES.password.maxLength);
  });

  perguntaSegurancaInput.addEventListener('input', () => {
    processField(perguntaSegurancaInput, perguntaSegurancaError, validatePerguntaSeguranca, RULES.perguntaSeguranca.maxLength);
  });

  respostaSegurancaInput.addEventListener('input', () => {
    processField(respostaSegurancaInput, respostaSegurancaError, validateRespostaSeguranca, RULES.respostaSeguranca.maxLength);
  });

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

  // "Voltar" não envia nada — só navega de volta ao login, descartando
  // o que foi digitado (mesmo padrão de irParaLogin usado no logout).
  voltarBtn.addEventListener('click', () => {
    irParaLogin();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    hideFormAlert();

    const nomeCompleto = processField(
      nomeCompletoInput,
      nomeCompletoError,
      validateNomeCompleto,
      RULES.nomeCompleto.maxLength
    );
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
    const perguntaSeguranca = processField(
      perguntaSegurancaInput,
      perguntaSegurancaError,
      validatePerguntaSeguranca,
      RULES.perguntaSeguranca.maxLength
    );
    const respostaSeguranca = processField(
      respostaSegurancaInput,
      respostaSegurancaError,
      validateRespostaSeguranca,
      RULES.respostaSeguranca.maxLength
    );

    if (!nomeCompleto.isValid || !username.isValid || !password.isValid
        || !perguntaSeguranca.isValid || !respostaSeguranca.isValid) {
      showFormAlert('Corrija os campos destacados antes de continuar.');
      // Foca o primeiro campo inválido, na ordem em que aparecem no formulário.
      if (!nomeCompleto.isValid) {
        nomeCompletoInput.focus();
      } else if (!username.isValid) {
        usernameInput.focus();
      } else if (!password.isValid) {
        passwordInput.focus();
      } else if (!perguntaSeguranca.isValid) {
        perguntaSegurancaInput.focus();
      } else {
        respostaSegurancaInput.focus();
      }
      return;
    }

    // A partir daqui, todos os valores já estão sanitizados e validados.
    submitCadastro(nomeCompleto.value, username.value, password.value, perguntaSeguranca.value, respostaSeguranca.value);
  });

  // ---------------------------------------------------------------------
  // Envio
  // ---------------------------------------------------------------------

  /**
   * Registra a conta (via `cadastrarUsuario`, definido em
   * autenticacao.js) e, se confirmado pelo backend, leva o usuário
   * para o login. Se o cadastro falhar, mostra o erro real — nunca
   * finge sucesso.
   *
   * @param {string} nomeCompleto - já sanitizado e validado.
   * @param {string} username - já sanitizado e validado.
   * @param {string} password - já sanitizado e validado.
   * @param {string} perguntaSeguranca - já sanitizado e validado.
   * @param {string} respostaSeguranca - já sanitizado e validado.
   */
  async function submitCadastro(nomeCompleto, username, password, perguntaSeguranca, respostaSeguranca) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Cadastrando...';
    voltarBtn.disabled = true;

    try {
      await cadastrarUsuario(nomeCompleto, username, password, perguntaSeguranca, respostaSeguranca);
      // Cadastro confirmado pelo backend: volta ao login para o usuário
      // entrar com a conta recém-criada, já com o aviso sobre privilégio
      // de administrador (ver irParaLoginComAvisoDeCadastro em
      // autenticacao.js). Não reabilita os botões aqui de propósito — a
      // navegação já está a caminho.
      irParaLoginComAvisoDeCadastro();
    } catch (erro) {
      console.error('Falha ao cadastrar:', erro);
      // showFormAlert usa textContent internamente, então a mensagem de
      // erro nunca é interpretada como HTML, mesmo vinda de uma exceção.
      showFormAlert(erro instanceof Error ? erro.message : 'Não foi possível criar a conta agora. Tente novamente.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Cadastrar';
      voltarBtn.disabled = false;
    }

    // A senha e a resposta de segurança nunca são logadas, exibidas ou
    // persistidas no cliente.
    void password;
    void respostaSeguranca;
  }
})();

































