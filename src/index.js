const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// 라우터 등록
const authRouter = require('./controllers/authController');
app.use('/auth', authRouter);
const fileRouter = require('./controllers/fileController');
app.use('/files', fileRouter);
const renderRouter = require('./controllers/renderController');
app.use('/render', renderRouter);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// HTTPS 서버 실행
https.createServer(credentials, app).listen(port, '0.0.0.0', () => {
  console.log(`✅ KeyShot Render Server 실행 중`);
});