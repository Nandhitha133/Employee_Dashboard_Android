const crypto = require("crypto");
const axios = require("axios");
const https = require("https");

const HIK_HOST = process.env.HIK_HOST;
const APP_KEY = process.env.HIK_KEY;
const APP_SECRET = process.env.HIK_SECRET;

function createSignature(method, accept, timestamp, apiPath) {
  const stringToSign = `${method}\n${accept}\n${timestamp}\n${apiPath}`;

  return crypto
    .createHmac("sha256", APP_SECRET)
    .update(stringToSign)
    .digest("base64");
}

async function hikPost(apiPath, body = {}) {
  const method = "POST";
  const accept = "*/*";
  const timestamp = Date.now().toString();
  const signature = createSignature(method, accept, timestamp, apiPath);

  const headers = {
    "Content-Type": "application/json",
    Accept: accept,
    "x-ca-key": APP_KEY,
    "x-ca-timestamp": timestamp,
    "x-ca-signature": signature,
  };

  const url = `${HIK_HOST}${apiPath}`;

  console.log("Calling Hik API:", url);

  const res = await axios.post(url, body, { 
    headers,
    httpsAgent: new https.Agent({
      rejectUnauthorized: false // Accept self-signed certificates
    })
  });

  return res.data;
}

module.exports = { hikPost };
