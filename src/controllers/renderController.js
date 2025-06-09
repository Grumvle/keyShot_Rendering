// renderController with queue and multiple file support
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

// KeyShot 실행 경로 자동 감지
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

// 렌더링 작업 큐
const renderQueue = [];
let isRendering = false;

async function processQueue() {
  if (isRendering || renderQueue.length === 0) return;

  isRendering = true;
  const task = renderQueue.shift();

  const {
    file,
    userId,
    token,
    fileName,
    outputPath,
    uploadDir,
    FILEBROWSER_URL,
    res
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
            'X-Auth': token,
            'Cookie': `auth=${token}`,
            ...formData.getHeaders?.()
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

const allowedExtensions = ['.bip', '.ksp', '.fbx', '.obj', '.stp', '.step', '.iges', '.igs', '.3ds'];

// POST /render 다중파일 순차 처리
router.post('/', upload.array('files'), async (req, res) => {
    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.bip', '.ksp', '.fbx', '.obj', '.stp', '.step', '.iges', '.igs', '.3ds'];

    if (!allowedExtensions.includes(ext)) {
        try { fs.unlinkSync(file.path); } catch {}
        return res.status(400).json({ message: `지원되지 않는 파일 확장자입니다: ${ext}` });
    }
    const token = req.headers.authorization?.split(' ')[1];
    const FILEBROWSER_URL = process.env.FILEBROWSER_URL;

    if (!token || !files || files.length === 0) {
        return res.status(400).json({ message: '파일 또는 인증 토큰 누락' });
    }

    const userId = extractUserId(token);
    const uploadDir = path.join('rendered', userId);
    mkdirp.sync(uploadDir);

    for (const file of files) {
        const fileName = path.parse(file.originalname).name;
        const outputPath = path.join(uploadDir, `${fileName}.png`);

        renderQueue.push({ file, userId, token, fileName, outputPath, uploadDir, FILEBROWSER_URL, res });
    }

    processQueue();
    res.json({ message: '렌더링 작업이 대기열에 추가되었습니다.', count: files.length });
});

module.exports = router;