// ✅ KeyShot 렌더링 서버 컨트롤러 (Python 스크립트 기반)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const util = require('util');
const rename = util.promisify(fs.rename);
const { spawn } = require('child_process');
const upload = multer({ dest: 'uploads/' });
const axios = require('axios');
const FormData = require('form-data');
const mkdirp = require('mkdirp');
require('dotenv').config();

const pythonScriptPath = path.resolve(__dirname, '../scripts/render.py');

function findKeyShotPath() {
  const possiblePaths = [
    'C:\\Program Files\\KeyShot12\\bin\\keyshot_headless.exe',
    'C:\\Program Files\\Luxion\\KeyShot\\bin\\keyshot_headless.exe',
    process.env.KEYSHOT_EXE
  ];
  return possiblePaths.find(p => p && fs.existsSync(p)) || null;
}

const renderQueue = [];
let isRendering = false;

async function processQueue() {
  if (isRendering || renderQueue.length === 0) return;
  isRendering = true;

  const task = renderQueue.shift();
  const { file, token, fileName, outputPath, FILEBROWSER_URL, options } = task;

  const keyshotPath = findKeyShotPath();
  if (!keyshotPath) {
    console.error('[ERROR] KeyShot 실행파일을 찾을 수 없습니다.');
    isRendering = false;
    return processQueue();
  }

  const ext = path.extname(file.originalname);
  const renamedPath = path.resolve('uploads', `${path.parse(file.originalname).name}${ext}`);

  try {
    await rename(file.path, renamedPath);
    console.log(`[INFO] 업로드 파일 rename 완료: ${file.path} → ${renamedPath}`);
  } catch (e) {
    console.error(`[ERROR] 파일 rename 실패:`, e);
    isRendering = false;
    return processQueue();
  }

  console.log(`[INFO] 렌더링 입력 파일 경로: ${renamedPath}`);
  console.log(`[INFO] 렌더링 출력 파일 경로: ${outputPath}`);

  const args = [
    pythonScriptPath,
    renamedPath,
    outputPath,
    options.width,
    options.height,
    options.samples
  ];

  const py = spawn('python', args);

  py.stdout.on('data', data => console.log(`[PYTHON] ${data}`));
  py.stderr.on('data', data => console.error(`[PYTHON ERROR] ${data}`));

  py.on('close', async (code) => {
    if (code !== 0) {
      console.error(`[ERROR] Python 렌더링 실패 (코드 ${code})`);
      try { fs.existsSync(renamedPath) && fs.unlinkSync(renamedPath); } catch {}
      isRendering = false;
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

      console.log(`[SUCCESS] 렌더링 및 업로드 완료: ${fileName}.png`);
    } catch (err) {
      console.error(`[ERROR] 업로드 실패: ${fileName}`, err);
    } finally {
      try {
        fs.existsSync(renamedPath) && fs.unlinkSync(renamedPath);
        fs.existsSync(outputPath) && fs.unlinkSync(outputPath);
      } catch (e) {
        console.warn('[WARN] 파일 정리 중 오류:', e.message);
      }
      isRendering = false;
      processQueue();
    }
  });
}

const allowedExtensions = ['.bip'];

router.post('/', upload.array('files'), async (req, res) => {
  const files = req.files;
  const token = req.headers['x-auth'] || req.headers['authorization']?.split(' ')[1];
  const FILEBROWSER_URL = process.env.FILEBROWSER_URL;
  const { width = '1920', height = '1080', samples = '32' } = req.body;

  if (!token || !files || files.length === 0) {
    return res.status(400).json({ message: '파일 또는 인증 토큰 누락' });
  }

  mkdirp.sync('uploads');
  mkdirp.sync('rendered');

  let validCount = 0;

  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      try { fs.unlinkSync(file.path); } catch {}
      console.warn(`[SKIP] 지원되지 않는 확장자: ${file.originalname}`);
      continue;
    }

    const fileName = path.parse(file.originalname).name;
    const outputPath = path.resolve('rendered', `${fileName}.png`);

    renderQueue.push({
      file,
      token,
      fileName,
      outputPath,
      FILEBROWSER_URL,
      options: { width, height, samples }
    });
    validCount++;
  }

  if (validCount === 0) {
    return res.status(400).json({ message: '유효한 확장자의 파일이 없습니다.' });
  }

  processQueue();
  res.json({ message: '렌더링 작업이 대기열에 추가되었습니다.', count: validCount });
});

module.exports = router;
