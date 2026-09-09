/**
 * ============================================================
 * Helper de integração com o backend (Spring Security + CSRF)
 * ------------------------------------------------------------
 * O Spring Security está configurado com CookieCsrfTokenRepository:
 * a cada requisição autenticada, o navegador recebe um cookie
 * "XSRF-TOKEN" legível por JS. Toda chamada que MUDA estado (POST,
 * PUT, DELETE) precisa reenviar esse valor no header
 * "X-XSRF-TOKEN", ou o Spring rejeita com 403.
 *
 * Este arquivo deve ser carregado ANTES de painel.js/cadastro.js/
 * planilha.js/perfil.js (mesmo escopo léxico de topo usado por eles).
 * ============================================================
 */

function obterCookie(nome) {
  const alvo = `${nome}=`;
  const partes = document.cookie.split(';');
  for (let parte of partes) {
    parte = parte.trim();
    if (parte.startsWith(alvo)) {
      return decodeURIComponent(parte.slice(alvo.length));
    }
  }
  return null;
}

/**
 * Wrapper fino sobre fetch(): injeta o header CSRF em métodos que
 * alteram estado e lança erro no formato `HTTP <status>` quando a
 * resposta não é 2xx, para ficar consistente com os exemplos já
 * deixados nos comentários de integração de cada tela.
 */
async function requisicaoApi(caminho, opcoes = {}) {
  const metodo = (opcoes.method || 'GET').toUpperCase();
  const cabecalhos = { ...(opcoes.headers || {}) };

  if (metodo !== 'GET' && metodo !== 'HEAD') {
    const tokenCsrf = obterCookie('XSRF-TOKEN');
    if (tokenCsrf) {
      cabecalhos['X-XSRF-TOKEN'] = tokenCsrf;
    }
  }

  const resposta = await fetch(caminho, { ...opcoes, headers: cabecalhos, credentials: 'same-origin' });
  if (!resposta.ok) {
    throw new Error(`HTTP ${resposta.status}`);
  }
  return resposta;
}

/**
 * Pilha simples de sobreposições (modais) abertas ao mesmo tempo.
 *
 * Todo modal do sistema usa a mesma classe .sobreposicao-modal, com
 * z-index FIXO definido no CSS - então, com duas sobreposições visíveis
 * ao mesmo tempo (ex.: "Privilégios" aberto de dentro da "Planilha"),
 * quem aparecia na frente era só quem vinha depois no HTML, não quem foi
 * aberta por último. Esta pilha resolve isso: cada abrir() empilha o
 * elemento e recalcula o z-index de todos pela posição na pilha (o topo
 * da pilha sempre fica com o maior z-index); fechar() desempilha.
 *
 * Compartilhado entre cadastro.js, planilha.js e privilegios.js - por
 * isso mora aqui em api.js, o primeiro script carregado.
 */
const PilhaSobreposicoes = (() => {
  const Z_INDEX_BASE = 100;
  const pilha = [];

  function _recalcular() {
    pilha.forEach((elemento, indice) => {
      elemento.style.zIndex = String(Z_INDEX_BASE + indice * 10);
    });
  }

  function abrir(elemento) {
    const indiceExistente = pilha.indexOf(elemento);
    if (indiceExistente !== -1) {
      pilha.splice(indiceExistente, 1);
    }
    pilha.push(elemento);
    _recalcular();
  }

  function fechar(elemento) {
    const indice = pilha.indexOf(elemento);
    if (indice !== -1) {
      pilha.splice(indice, 1);
    }
    elemento.style.zIndex = '';
    _recalcular();
  }

  return { abrir, fechar };
})();
