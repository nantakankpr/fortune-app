// services/line.js
const { Client, middleware } = require('@line/bot-sdk');
const axios = require('axios');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

// ✅ ฟังก์ชันสำหรับ verify idToken
async function verifyIdToken(idToken) {
  const response = await axios.post("https://api.line.me/oauth2/v2.1/verify", null, {
    params: {
      id_token: idToken,
      client_id: process.env.LINE_CHANNEL_ID, // ต้องตั้งไว้ใน .env
    },
  });
  return response.data; // มี userId, email, name, picture ฯลฯ
}

module.exports = {
  line: { middleware },
  config,
  client,
  verifyIdToken,
};
