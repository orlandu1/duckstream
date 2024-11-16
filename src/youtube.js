const { google } = require('googleapis');

// Obter ID do chat ao vivo
async function listarTransmissaoAoVivo(auth) {
  const youtube = google.youtube('v3');
  const response = await youtube.liveBroadcasts.list({
    part: 'snippet',
    broadcastStatus: 'active',
    auth,
  });

  if (response.data.items.length === 0) {
    throw new Error('Nenhuma transmissão ao vivo encontrada.');
  }

  return response.data.items[0].snippet.liveChatId;
}

// Enviar mensagem para o chat ao vivo
async function enviarMensagemChat(auth, liveChatId, mensagem) {
  const youtube = google.youtube('v3');
  await youtube.liveChatMessages.insert({
    part: 'snippet',
    requestBody: {
      snippet: {
        liveChatId,
        type: 'textMessageEvent',
        textMessageDetails: {
          messageText: mensagem,
        },
      },
    },
    auth,
  });
}

module.exports = { listarTransmissaoAoVivo, enviarMensagemChat };
