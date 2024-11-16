const { google } = require('googleapis');
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = require('../config/credentials');

// O cliente OAuth2
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Scopes para acessar transmissões ao vivo
const SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl'];

module.exports = { oAuth2Client, SCOPES };
