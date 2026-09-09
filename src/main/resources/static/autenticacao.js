/**
 * ============================================================
 * Autenticação — login e encerramento de sessão
 * ------------------------------------------------------------
 * Único ponto de integração com o backend de autenticação do
 * Loranks. Compartilhado entre a tela de login (index.html, via
 * script.js) e o painel (dashboard-loranks.html, botão "SAIR").
 * Pode ser incluído nas duas páginas sem problema: cada função só
 * age se o que ela precisa (formulário, botão) existir na página
 * atual.
 *
 * `autenticarUsuario()`, `cadastrarUsuario()` e `encerrarSessao()` já estão
 * integradas com o backend real (POST /api/auth/login, POST
 * /api/auth/cadastro e POST /logout, respectivamente).
 * ============================================================
 */

const CAMINHO_PAINEL = 'dashboard-loranks.html';
const CAMINHO_LOGIN = 'index.html';

/**
 * Autentica um usuário já sanitizado/validado — a validação de
 * formato (tamanho, caracteres permitidos) acontece em script.js
 * antes de chamar esta função; aqui só cuidamos da integração com
 * o backend (POST /api/auth/login). A sessão HTTP criada aqui é a
 * mesma usada pelo restante da API (/api/estoque/**, /api/perfil).
 *
 * @param {string} usuario
 * @param {string} senha
 * @returns {Promise<{nomeUsuario: string}>}
 */
/**
 * Lê o cookie XSRF-TOKEN que o Spring Security define (via
 * CookieCsrfTokenRepository) na primeira resposta desta página. Mesmo
 * mecanismo usado pelo api.js do dashboard - repetido aqui porque
 * index.html não carrega api.js (só autenticacao.js e script.js).
 */
function obterTokenCsrf() {
  const alvo = 'XSRF-TOKEN=';
  for (let parte of document.cookie.split(';')) {
    parte = parte.trim();
    if (parte.startsWith(alvo)) {
      return decodeURIComponent(parte.slice(alvo.length));
    }
  }
  return null;
}

async function autenticarUsuario(usuario, senha) {
  const cabecalhos = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  const tokenCsrf = obterTokenCsrf();
  if (tokenCsrf) {
    cabecalhos['X-XSRF-TOKEN'] = tokenCsrf;
  }

  const resposta = await fetch('/api/auth/login', {
    method: 'POST',
    headers: cabecalhos,
    credentials: 'same-origin',
    body: JSON.stringify({ usuario, senha }),
  });

  if (!resposta.ok) {
    throw new Error(resposta.status === 401
      ? 'Usuário ou senha inválidos.'
      : `Não foi possível entrar agora (HTTP ${resposta.status}).`);
  }

  // Defesa extra: se por algum motivo o servidor devolver 2xx com um corpo
  // que não é JSON (ex.: página de erro/redirecionamento inesperado), mostra
  // um erro compreensível em vez de deixar o JSON.parse falhar de forma crua.
  const tipoConteudo = resposta.headers.get('content-type') || '';
  if (!tipoConteudo.includes('application/json')) {
    throw new Error('Resposta inesperada do servidor ao entrar. Tente novamente.');
  }

  return await resposta.json(); // { nomeUsuario }
}

/** Leva o usuário ao painel — chamado só depois de `autenticarUsuario` confirmar o login. */
function irParaPainel() {
  window.location.href = CAMINHO_PAINEL;
}

/** Volta para a tela de login — usado pelo botão "Voltar" de Criar Conta e por `encerrarSessao`. */
function irParaLogin() {
  window.location.href = CAMINHO_LOGIN;
}

/**
 * Chave usada para repassar, via sessionStorage, o aviso de que uma conta
 * acabou de ser criada — a tela de login (script.js) lê isso ao carregar
 * e mostra o aviso. sessionStorage (não localStorage) de propósito: é um
 * recado de uma navegação para a próxima, não algo que deva sobreviver
 * indefinidamente no navegador.
 */
const CHAVE_AVISO_CADASTRO_REALIZADO = 'loranks:avisoCadastroRealizado';

/**
 * Chamado só depois que `cadastrarUsuario` confirma sucesso. Toda conta
 * nova é criada SEM privilégio de administrador (ver PrivilegioService,
 * backend) — promover exige a senha de privilégios, na tela de
 * Privilégios do painel. Se esta conta for a do administrador, alguém
 * com acesso a essa tela/senha precisa fazer essa troca antes dela ser
 * útil como admin; daí o aviso explícito na volta ao login, em vez de
 * deixar a pessoa descobrir isso sozinha na hora que algo travar por
 * falta de permissão.
 */
function irParaLoginComAvisoDeCadastro() {
  sessionStorage.setItem(
    CHAVE_AVISO_CADASTRO_REALIZADO,
    'Conta criada com sucesso! Peça a alguém com acesso à tela de Privilégios para marcá-la como administradora ou caso você seja o proprietário mude seu privilégio para administrador, depois clique em sair  e insira seu login e senha novamente — toda conta nova começa sem esse privilégio.'
  );
  irParaLogin();
}

/**
 * Registra um novo usuário. Os campos já chegam sanitizados/validados
 * (formato) por criar-conta.js — aqui só cuidamos da integração com
 * o backend (POST /api/auth/cadastro), seguindo o mesmo padrão de
 * `autenticarUsuario` (mesmo cabeçalho CSRF, mesma sessão).
 *
 * @param {string} nomeCompleto
 * @param {string} usuario
 * @param {string} senha
 * @returns {Promise<void>}
 */
async function cadastrarUsuario(nomeCompleto, usuario, senha, perguntaSeguranca, respostaSeguranca) {
  const cabecalhos = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  const tokenCsrf = obterTokenCsrf();
  if (tokenCsrf) {
    cabecalhos['X-XSRF-TOKEN'] = tokenCsrf;
  }

  // Log de diagnóstico temporário: se isso NÃO aparecer no console do
  // navegador ao clicar em "Cadastrar", o problema está antes do fetch
  // (ex.: erro de JS em outro lugar do arquivo, listener não anexado).
  console.log('[DEBUG] Enviando POST /api/auth/cadastro para usuario=', usuario);

  const resposta = await fetch('/api/auth/cadastro', {
    method: 'POST',
    headers: cabecalhos,
    credentials: 'same-origin',
    body: JSON.stringify({ nomeCompleto, usuario, senha, perguntaSeguranca, respostaSeguranca }),
  });

  if (!resposta.ok) {
    let mensagem = resposta.status === 409
      ? 'Esse usuário já existe. Escolha outro.'
      : `Não foi possível criar a conta agora (HTTP ${resposta.status}).`;
    try {
      const corpo = await resposta.json();
      if (corpo && typeof corpo.erro === 'string') {
        // Formato { erro: "..." } — usado pelos erros de negócio (409, etc.).
        mensagem = corpo.erro;
      } else if (corpo && typeof corpo === 'object') {
        // Formato { campo: "mensagem" } — devolvido pelo ApiExceptionHandler
        // quando a validação de Bean Validation do servidor rejeita algo que,
        // por algum motivo, passou pela validação do cliente (ver
        // CadastroUsuarioRequest). Mostra a primeira mensagem encontrada.
        const primeiraMensagem = Object.values(corpo).find((valor) => typeof valor === 'string');
        if (primeiraMensagem) {
          mensagem = primeiraMensagem;
        }
      }
    } catch {
      // Corpo não era JSON válido — mantém a mensagem genérica acima.
    }
    throw new Error(mensagem);
  }
}

/**
 * Descobre se o usuário logado é administrador (Cadastro.administrador =
 * true), via GET /api/perfil (mesmo endpoint que perfil.js usa para
 * popular a tela de Perfil). Cacheia a promessa: essa informação não muda
 * sem um novo login, então cadastro.js/planilha.js podem chamar isto toda
 * vez que abrem o modal sem gerar uma requisição nova a cada clique.
 *
 * Usado só para decidir o que MOSTRAR na interface (esconder preço de
 * custo, esconder botão de excluir) - a aplicação real da regra é sempre
 * no servidor (EstoqueController/ProdutoService), então isto nunca é, por
 * si só, uma checagem de segurança.
 */
let _promessaSouAdministrador = null;
async function souAdministrador() {
  if (_promessaSouAdministrador === null) {
    _promessaSouAdministrador = (async () => {
      try {
        const resposta = await requisicaoApi('/api/perfil');
        const corpo = await resposta.json();
        return corpo.administrador === true;
      } catch (erro) {
        console.error('Falha ao verificar permissão de administrador:', erro);
        return false;
      }
    })();
  }
  return _promessaSouAdministrador;
}

/**
 * Encerra a sessão do usuário e volta para a tela de login.
 * Hoje só faz a navegação — quando existir um backend com sessão
 * real (token, cookie httpOnly etc.), o lugar certo para invalidá-la
 * é aqui, ANTES do redirecionamento.
 */
/**
 * Encerra a sessão do usuário e volta para a tela de login.
 * Chama POST /logout (endpoint padrão do Spring Security, habilitado via
 * `.logout(LogoutConfigurer::permitAll)` em SecurityConfig) ANTES de
 * redirecionar - sem isso, a sessão continuava válida no servidor mesmo
 * depois do "SAIR" (bastava um back do navegador, ou reutilizar o cookie
 * de sessão, pra continuar autenticado). Mesmo protocolo CSRF das outras
 * chamadas que alteram estado (cookie->header via obterTokenCsrf).
 *
 * Redireciona pro login mesmo se a chamada falhar (rede fora do ar,
 * sessão já expirada no servidor etc.) - o objetivo aqui é tirar a
 * PESSOA da tela protegida; o pior cenário de uma falha é a sessão no
 * servidor durar até expirar sozinha pelo timeout normal, não travar o
 * usuário na tela.
 */
async function encerrarSessao() {
  try {
    const cabecalhos = {};
    const tokenCsrf = obterTokenCsrf();
    if (tokenCsrf) {
      cabecalhos['X-XSRF-TOKEN'] = tokenCsrf;
    }
    await fetch('/logout', { method: 'POST', credentials: 'same-origin', headers: cabecalhos });
  } catch (erro) {
    console.error('Falha ao encerrar sessão no servidor:', erro);
  }
  irParaLogin();
}

/**
 * Liga o botão "SAIR" ao encerramento de sessão, se ele existir na
 * página atual. Em index.html este arquivo é carregado mas não
 * encontra o botão — a função simplesmente não faz nada.
 */
function inicializarBotaoSair() {
  const botaoSair = document.getElementById('botaoSair');
  if (!botaoSair) return;
  botaoSair.addEventListener('click', () => encerrarSessao());
}

inicializarBotaoSair();
































