const express = require('express');
const axios = require('axios');
const { extractUserId } = require('../utils/jwtUtil');
require('dotenv').config();

const router = express.Router();

router.get('/', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const FILEBROWSER_URL = process.env.FILEBROWSER_URL;

  if (!token) {
    return res.status(401).json({ message: '인증 토큰 없음' });
  }

  try {
    const userId = extractUserId(token);

    const response = await axios.get(`${FILEBROWSER_URL}/api/tus/KeyShot/`, {
        headers: {
            'X-Auth': token,
            'Cookie': `auth=${token}`,
            ...formData.getHeaders?.()
        }
    });

    const files = response.data.items.map(item => ({
      name: item.name,
      url: `${FILEBROWSER_URL}/rendered/${userId}/${encodeURIComponent(item.name)}`
    }));

    res.json({ files });
  } catch (err) {
    console.error('파일 목록 조회 실패:', err.message);
    res.status(500).json({ message: '파일 목록 조회 실패' });
  }
});

module.exports = router;