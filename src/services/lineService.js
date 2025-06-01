// services/line.js
const { Client, middleware } = require('@line/bot-sdk');
const axios = require('axios');
const config = require('../config/config');

const lineConfig = {
  channelAccessToken: config.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: config.LINE_CHANNEL_SECRET,
};

const client = new Client(lineConfig);

// ✅ ฟังก์ชันสำหรับ verify idToken
async function verifyIdToken(idToken) {
  const response = await axios.post("https://api.line.me/oauth2/v2.1/verify", null, {
    params: {
      id_token: idToken,
      client_id: config.LINE_CHANNEL_ID,
    },
  });
  return response.data; // มี userId, email, name, picture ฯลฯ
}

module.exports = {
  line: { middleware },
  config: lineConfig,
  client,
  verifyIdToken,
};
