const { google } = require('googleapis');

// Função para enviar uma mensagem ao chat de uma transmissão ao vivo
async function enviarMensagemChat(auth, liveChatId, mensagem) {
  const youtube = google.youtube('v3');
  try {
    const res = await youtube.liveChatMessages.insert({
      part: 'snippet',
      requestBody: {
        snippet: {
          liveChatId: liveChatId,
          type: 'textMessageEvent',
          textMessageDetails: {
            messageText: mensagem,
          },
        },
      },
      auth,
    });
    console.log('Mensagem enviada com sucesso:', res.data);
  } catch (err) {
    console.error('Erro ao enviar mensagem no chat:', err);
  }
}

// Listar transmissões ao vivo
async function listarTransmissaoAoVivo(auth) {
  const youtube = google.youtube('v3');
  try {
    const res = await youtube.liveBroadcasts.list({
      part: 'snippet,contentDetails,status',
      broadcastStatus: 'active',
      auth,
    });

    console.log('Transmissões ao Vivo:', res.data.items);
    
    if (res.data.items.length > 0) {
      // Pegue o ID do chat da primeira transmissão ao vivo
      const liveChatId = res.data.items[0].snippet.liveChatId;
      const mensagem = 'testando o script!';
      
      // Enviar mensagem no chat
      await enviarMensagemChat(auth, liveChatId, mensagem);
    } else {
      console.log('Nenhuma transmissão ao vivo encontrada.');
    }
  } catch (err) {
    console.error('Erro ao listar transmissões ao vivo:', err);
  }
}

module.exports = { listarTransmissaoAoVivo };
