const express = require('express');
const fs = require('fs');
const opn = require('opn');
const path = require('path');
const { oAuth2Client, SCOPES } = require('./auth');
const { listarTransmissaoAoVivo, enviarMensagemChat } = require('./youtube');

const app = express();


// Middleware para processar arquivos estáticos
app.use(express.static('public'));

// Middleware para processar JSON
app.use(express.json());

// Rota para exibir o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Função para carregar o token
function loadToken() {
  try {
    const token = fs.readFileSync('token.json');
    return JSON.parse(token);
  } catch (err) {
    console.log('Erro ao carregar o token ou token não encontrado.');
    return null;
  }
}

// Função para salvar o token
function saveToken(token) {
  fs.writeFileSync('token.json', JSON.stringify(token));
  console.log('Token armazenado com sucesso!');
}

// Função para obter o token de acesso
function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Autorize o aplicativo acessando este URL:', authUrl);
  opn(authUrl);
}

// Função para renovar o token
function refreshAccessToken(oAuth2Client, refreshToken) {
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  oAuth2Client.refreshAccessToken((err, token) => {
    if (err) {
      console.error('Erro ao renovar o token:', err);
      return;
    }
    oAuth2Client.setCredentials(token);
    saveToken(token);
    console.log('Token renovado com sucesso!');
  });
}

// Função para verificar se o token é inválido
function isTokenInvalid(token) {
  return !token || !token.access_token || Date.now() > token.expiry_date;
}

// Rota para capturar o código de autorização e obter o token
app.get('/', (req, res) => {
  const code = req.query.code;
  if (code) {
    console.log('Código de autorização recebido:', code);
    oAuth2Client.getToken(code, (err, token) => {
      if (err) {
        console.error('Erro ao obter o token de acesso', err);
        res.send('Erro ao autenticar.');
        return;
      }

      // Armazena o token no arquivo
      saveToken(token);
      oAuth2Client.setCredentials(token);
      res.send('Autenticação bem-sucedida! Você pode fechar a janela.');
      listarTransmissaoAoVivo(oAuth2Client);
    });
  } else {
    res.send('Erro ao obter o código de autenticação.');
  }
});

// Rota para enviar comentários ao chat do YouTube
app.post('/send-comment', async (req, res) => {
  const { comment } = req.body;
  if (!comment) {
    return res.status(400).json({ success: false, error: 'Comentário não fornecido.' });
  }

  const token = loadToken();
  if (!token || isTokenInvalid(token)) {
    return res.status(401).json({ success: false, error: 'Token inválido ou expirado. Faça login novamente.' });
  }

  try {
    oAuth2Client.setCredentials(token);
    const liveChatId = await listarTransmissaoAoVivo(oAuth2Client); // Obtém o ID do chat ativo
    if (!liveChatId) {
      return res.status(404).json({ success: false, error: 'Nenhuma transmissão ao vivo encontrada.' });
    }

    await enviarMensagemChat(oAuth2Client, liveChatId, comment);
    res.json({ success: true, message: 'Comentário enviado com sucesso!' });
  } catch (err) {
    console.error('Erro ao enviar comentário:', err);
    res.status(500).json({ success: false, error: 'Erro ao enviar comentário.' });
  }
});

// Função principal para carregar ou solicitar novo token
function authenticate(oAuth2Client) {
  const token = loadToken();

  if (token && !isTokenInvalid(token)) {
    // Se o token estiver válido, usa o token carregado
    oAuth2Client.setCredentials(token);
    console.log('Token carregado e válido.');

    // Tentar listar as transmissões
    listarTransmissaoAoVivo(oAuth2Client)
      .catch((err) => {
        console.error('Erro ao listar transmissões ao vivo:', err);
        if (err.response && err.response.status === 401) {
          console.log('Token inválido, solicitando novo login...');
          getAccessToken(oAuth2Client); // Solicita novo login
        }
      });
  } else {
    // Se o token for inválido ou expirado, solicita um novo login
    console.log('Token inválido ou expirado, solicitando novo login...');
    getAccessToken(oAuth2Client); // Solicita novo login
  }
}

// Iniciar o servidor
app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
  authenticate(oAuth2Client); // Verifica e autentica no início
});
