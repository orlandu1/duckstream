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

// Função para obter o Live Chat ID de uma transmissão ativa
async function obterLiveChatId(auth) {
  const youtube = google.youtube('v3');
  try {
    const res = await youtube.liveBroadcasts.list({
      part: 'snippet,contentDetails,status',
      broadcastStatus: 'active', // Apenas transmissões ativas
      broadcastType: 'all',
      auth,
    });

    if (res.data.items.length === 0) {
      throw new Error('Nenhuma transmissão ao vivo ativa encontrada.');
    }

    // Retorna o liveChatId da primeira transmissão encontrada
    return res.data.items[0].snippet.liveChatId;
  } catch (err) {
    console.error('Erro ao obter Live Chat ID:', err);
    throw err;
  }
}

// Função para obter as mensagens do chat ao vivo
async function obterMensagensChat(oAuth2Client, liveChatId) {
  try {
    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });

    const response = await youtube.liveChatMessages.list({
      liveChatId: liveChatId,
      part: 'snippet,authorDetails', // Obtém o conteúdo da mensagem e informações do autor
    });

    // Função para obter os detalhes do canal, incluindo o nome e foto
    async function obterDetalhesCanal(authorChannelId) {
      const res = await youtube.channels.list({
        part: 'snippet',
        id: authorChannelId,
      });

      if (res.data.items.length > 0) {
        const channel = res.data.items[0].snippet;
        return {
          name: channel.title,  // Nome do canal
          photo: channel.thumbnails.default.url,  // URL da foto do canal
        };
      }
      return { name: 'Desconhecido', photo: null }; // Retorna "Desconhecido" se o canal não for encontrado
    }


    // Extrair as mensagens e adicionar a foto do autor
    const mensagens = await Promise.all(response.data.items.map(async item => {
      const authorChannelId = item.snippet.authorChannelId;
      const fotoUrl = await obterDetalhesCanal(authorChannelId); // Obtém a foto
      const canalDetalhes = await obterDetalhesCanal(authorChannelId); // Obtém o nome e foto do canal

      return {
        channelID: authorChannelId,  // ID do autor
        author: canalDetalhes.name,  // Nome do canal
        message: item.snippet.displayMessage,  // A mensagem do chat
        time: item.snippet.publishedAt,        // Hora da publicação
        photo: fotoUrl,  // Foto do autor
      };
    }));

    return mensagens;
  } catch (err) {
    console.error('Erro ao obter mensagens do chat:', err);
    throw err;
  }
}



module.exports = { listarTransmissaoAoVivo, enviarMensagemChat, obterLiveChatId, obterMensagensChat };
