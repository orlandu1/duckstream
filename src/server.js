const express = require('express');
const fs = require('fs');
const opn = require('opn');
const { oAuth2Client, SCOPES } = require('./auth');
const { listarTransmissaoAoVivo } = require('./youtube');

const app = express();

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
