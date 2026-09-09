const etapaUsuario = document.getElementById('etapa-usuario');
const etapaResposta = document.getElementById('etapa-resposta');
const textoPergunta = document.getElementById('texto-pergunta');
const msgErro = document.getElementById('mensagem-erro');
const msgSucesso = document.getElementById('mensagem-sucesso');
const inputResposta = document.getElementById('resposta');
const botaoConfirmarResposta = document.getElementById('botao-confirmar-resposta');
const camposNovaSenha = document.getElementById('campos-nova-senha');
const inputNovaSenha = document.getElementById('nova-senha');
const inputConfirmarSenha = document.getElementById('confirmar-senha');

let usuarioAtual = '';
// true só depois que /verificar-resposta confirmar a resposta no
// servidor - é o que efetivamente "libera o acesso" aos campos de
// nova senha.
let respostaConfirmada = false;

function limparMensagens() {
  msgErro.classList.remove('cartao-auth__mensagem--visivel');
  msgSucesso.classList.remove('cartao-auth__mensagem--visivel');
}

function mostrarErro(texto) {
  msgErro.textContent = texto;
  msgErro.classList.add('cartao-auth__mensagem--visivel');
}

function mostrarSucesso(texto) {
  msgSucesso.textContent = texto;
  msgSucesso.classList.add('cartao-auth__mensagem--visivel');
}

/**
 * Mesmo padrão de erro usado em criar-conta.js/autenticacao.js: tenta
 * extrair uma mensagem legível do corpo { erro: "..." } da resposta;
 * cai para uma mensagem genérica se o corpo não vier nesse formato.
 */
async function extrairMensagemErro(resposta, mensagemPadrao) {
  try {
    const corpo = await resposta.json();
    if (corpo && typeof corpo.erro === 'string') {
      return corpo.erro;
    }
  } catch {
    // Corpo não era JSON válido - usa a mensagem padrão abaixo.
  }
  return mensagemPadrao;
}

// ETAPA 1: POST /api/auth/recuperar-senha/pergunta { usuario } -> { pergunta }
document.getElementById('form-usuario').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limparMensagens();

  const usuario = document.getElementById('usuario').value.trim();
  const botao = document.getElementById('botao-buscar');
  botao.disabled = true;
  botao.textContent = 'Buscando...';

  try {
    const tokenCsrf = obterCookie('XSRF-TOKEN');
    const resposta = await fetch('/api/auth/recuperar-senha/pergunta', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(tokenCsrf ? { 'X-XSRF-TOKEN': tokenCsrf } : {}),
      },
      body: JSON.stringify({ usuario }),
    });

    if (!resposta.ok) {
      throw new Error(await extrairMensagemErro(resposta, 'Não foi possível continuar agora. Tente novamente.'));
    }

    const corpo = await resposta.json(); // { pergunta }
    usuarioAtual = usuario;
    textoPergunta.textContent = corpo.pergunta;
    etapaUsuario.hidden = true;
    etapaResposta.hidden = false;
    document.getElementById('resposta').focus();
  } catch (erro) {
    mostrarErro(erro instanceof Error ? erro.message : 'Não foi possível continuar agora. Tente novamente.');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Continuar';
  }
});

// ETAPA 2a: POST /api/auth/recuperar-senha/verificar-resposta { usuario, resposta }
// Só confere a resposta. Se estiver certa, libera (mostra e habilita)
// os campos de nova senha; se estiver errada, nega o acesso a eles.
botaoConfirmarResposta.addEventListener('click', async () => {
  limparMensagens();

  const resposta = inputResposta.value.trim();
  if (!resposta) {
    mostrarErro('Digite a resposta.');
    return;
  }

  botaoConfirmarResposta.disabled = true;
  botaoConfirmarResposta.textContent = 'Confirmando...';

  try {
    const tokenCsrf = obterCookie('XSRF-TOKEN');
    const respostaHttp = await fetch('/api/auth/recuperar-senha/verificar-resposta', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(tokenCsrf ? { 'X-XSRF-TOKEN': tokenCsrf } : {}),
      },
      body: JSON.stringify({ usuario: usuarioAtual, resposta }),
    });

    if (!respostaHttp.ok) {
      // Resposta errada (ou conta bloqueada/inexistente): NEGA o
      // acesso - os campos de nova senha continuam escondidos/desabilitados.
      throw new Error(await extrairMensagemErro(respostaHttp, 'Não foi possível confirmar a resposta agora. Tente novamente.'));
    }

    // Resposta correta: LIBERA o acesso aos campos de nova senha.
    respostaConfirmada = true;
    inputResposta.disabled = true;
    botaoConfirmarResposta.hidden = true;
    camposNovaSenha.hidden = false;
    inputNovaSenha.disabled = false;
    inputConfirmarSenha.disabled = false;
    inputNovaSenha.focus();
    mostrarSucesso('Resposta confirmada. Defina sua nova senha.');
  } catch (erro) {
    respostaConfirmada = false;
    mostrarErro(erro instanceof Error ? erro.message : 'Não foi possível confirmar a resposta agora. Tente novamente.');
  } finally {
    botaoConfirmarResposta.disabled = false;
    botaoConfirmarResposta.textContent = 'Confirmar';
  }
});

// Se o usuário mudar a resposta depois de confirmada, exige nova
// confirmação antes de liberar a troca de senha de novo.
inputResposta.addEventListener('input', () => {
  if (respostaConfirmada) {
    respostaConfirmada = false;
    camposNovaSenha.hidden = true;
    inputNovaSenha.disabled = true;
    inputConfirmarSenha.disabled = true;
    botaoConfirmarResposta.hidden = false;
  }
});

// ETAPA 2b: POST /api/auth/recuperar-senha/redefinir { usuario, resposta, novaSenha }
// Só é alcançável depois que a resposta foi confirmada (campos de nova
// senha vêm desabilitados/escondidos até lá, então não há como este
// submit disparar antes disso).
document.getElementById('form-resposta').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limparMensagens();

  if (!respostaConfirmada) {
    // Proteção extra: Enter no campo "Resposta" dispara o submit do
    // form antes da confirmação - nesse caso, trata como um clique em
    // "Confirmar" em vez de tentar redefinir a senha.
    botaoConfirmarResposta.click();
    return;
  }

  const resposta = inputResposta.value.trim();
  const novaSenha = inputNovaSenha.value;
  const confirmarSenha = inputConfirmarSenha.value;
  const botao = document.getElementById('botao-redefinir');

  if (novaSenha !== confirmarSenha) {
    mostrarErro('As senhas digitadas não coincidem.');
    return;
  }
  if (novaSenha.length < 6) {
    mostrarErro('A nova senha deve ter pelo menos 6 caracteres.');
    return;
  }

  botao.disabled = true;
  botao.textContent = 'Redefinindo...';

  try {
    const tokenCsrf = obterCookie('XSRF-TOKEN');
    const respostaHttp = await fetch('/api/auth/recuperar-senha/redefinir', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(tokenCsrf ? { 'X-XSRF-TOKEN': tokenCsrf } : {}),
      },
      body: JSON.stringify({ usuario: usuarioAtual, resposta, novaSenha }),
    });

    if (!respostaHttp.ok) {
      throw new Error(await extrairMensagemErro(respostaHttp, 'Não foi possível redefinir a senha agora. Tente novamente.'));
    }

    etapaResposta.hidden = true;
    mostrarSucesso('Senha redefinida com sucesso! Você já pode entrar com a nova senha.');
  } catch (erro) {
    mostrarErro(erro instanceof Error ? erro.message : 'Não foi possível redefinir a senha agora. Tente novamente.');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Redefinir senha';
  }

  // A senha nunca é logada, exibida ou persistida no cliente.
  void novaSenha;
  void confirmarSenha;
});
