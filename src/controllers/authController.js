const express = require('express');
const router = express.Router();
const fs = require('fs');
const NodeRSA = require('node-rsa');
const axios = require('axios');
require('dotenv').config();

const privateKey = new NodeRSA(fs.readFileSync('keys/private.pem', 'utf8'));

// ✅ 공개키 제공 라우트 추가
router.get('/public-key', (req, res) => {
  const publicKeyPem = fs.readFileSync('keys/public.pem', 'utf8');
  res.type('text/plain').send(publicKeyPem);
});

// 로그인 처리
router.post('/login', async (req, res) => {
  try {
    const encrypted = req.body.encrypted;
    const decrypted = privateKey.decrypt(encrypted, 'utf8');
    const { id, password } = JSON.parse(decrypted);

    const FILEBROWSER_URL = process.env.FILEBROWSER_URL;

    const response = await axios.post(`${FILEBROWSER_URL}/api/login`, {
      username: id,
      password
    });

    res.json({ token: response.data });
  } catch (err) {
    console.error('로그인 실패:', err);
    res.status(401).json({ message: '로그인 실패' });
  }
});

module.exports = router;