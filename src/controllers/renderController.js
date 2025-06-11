const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const upload = multer({ dest: 'uploads/' });
const axios = require('axios');
const FormData = require('form-data');
const { extractUserId } = require('../utils/jwtUtil');
const mkdirp = require('mkdirp');
require('dotenv').config();

// ✅ KeyShot 실행 경로 자동 감지
function findKeyShotPath() {
  const possiblePaths = [
    'C:\\Program Files\\KeyShot11\\bin\\KeyShot.exe',
    'C:\\Program Files\\KeyShot10\\bin\\KeyShot.exe',
    'C:\\Program Files\\KeyShot9\\bin\\KeyShot.exe',
    'C:\\Program Files\\Luxion\\KeyShot\\bin\\KeyShot.exe',
    'D:\\Program Files\\KeyShot11\\bin\\KeyShot.exe'
  ];
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) return filePath;
  }
  const envPath = process.env.KEYSHOT_EXE;
  return envPath && fs.existsSync(envPath) ? envPath : null;
}

// ✅ 렌더링 작업 큐
const renderQueue = [];
let isRendering = false;

async function processQueue() {
  if (isRendering || renderQueue.length === 0) return;

  isRendering = true;
  const task = renderQueue.shift();
  const {
    file, userId, token, fileName,
    outputPath, uploadDir, FILEBROWSER_URL, res
  } = task;

  const keyshotPath = findKeyShotPath();
  if (!keyshotPath) {
    fs.unlinkSync(file.path);
    res.status(500).json({ message: 'KeyShot 실행파일을 찾을 수 없습니다.' });
    isRendering = false;
    return processQueue();
  }

  const keyshot = spawn(keyshotPath, [
    '-render',
    '-scene', path.resolve(file.path),
    '-output', path.resolve(outputPath)
  ]);

  keyshot.on('close', async (code) => {
    if (code !== 0) {
      fs.unlinkSync(file.path);
      isRendering = false;
      res.status(500).json({ message: '렌더링 실패' });
      return processQueue();
    }

    try {
      const fileStream = fs.createReadStream(outputPath);
      const formData = new FormData();
      formData.append('file', fileStream, `${fileName}.png`);

      await axios.post(`${FILEBROWSER_URL}/api/tus/KeyShot/${fileName}.png?override=true`, formData, {
        headers: {
          'x_auth': token,
          'Cookie': `x_auth=${token}`,
          ...formData.getHeaders()
        }
      });

      fs.unlinkSync(file.path);
      fs.unlinkSync(outputPath);

      res.json({ message: '렌더링 완료 및 업로드 성공', file: `${fileName}.png` });
    } catch (err) {
      console.error('업로드 실패:', err);
      try {
        fs.unlinkSync(file.path);
        fs.unlinkSync(outputPath);
      } catch {}
      res.status(500).json({ message: '파일 업로드 실패' });
    }

    isRendering = false;
    processQueue();
  });
}

// ✅ 허용 확장자
const allowedExtensions = ['.bip', '.ksp', '.fbx', '.obj', '.stp', '.step', '.iges', '.igs', '.3ds'];

// ✅ POST /render 다중 파일 순차 렌더링
router.post('/', upload.array('files'), async (req, res) => {
  const files = req.files;
  const token = req.headers.authorization?.split(' ')[1];
  const FILEBROWSER_URL = process.env.FILEBROWSER_URL;

  if (!token || !files || files.length === 0) {
    return res.status(400).json({ message: '파일 또는 인증 토큰 누락' });
  }

  const userId = extractUserId(token);
  const uploadDir = path.join('rendered', userId);
  mkdirp.sync(uploadDir);

  let validCount = 0;

  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      try { fs.unlinkSync(file.path); } catch {}
      console.warn(`⛔️ 지원되지 않는 확장자 무시됨: ${ext}`);
      continue;
    }

    const fileName = path.parse(file.originalname).name;
    const outputPath = path.join(uploadDir, `${fileName}.png`);

    renderQueue.push({ file, userId, token, fileName, outputPath, uploadDir, FILEBROWSER_URL, res });
    validCount++;
  }

  if (validCount === 0) {
    return res.status(400).json({ message: '유효한 확장자의 파일이 없습니다.' });
  }

  processQueue();
  res.json({ message: '렌더링 작업이 대기열에 추가되었습니다.', count: validCount });
});

module.exports = router;