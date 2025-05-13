const express = require('express');
const WebSocket = require('ws');
const { startWs } = require('./ws/ws.js');
const interceptor = require('./interceptor');
const path = require('path');


const app = express();
const Authorization = require('./route/Authorization');
const Chat = require('./route/chat');
const Upload = require('./route/Upload');

app.use(express.json()); // 解析 JSON 格式的请求主体
app.use(express.urlencoded({ extended: true })); // 解析 URL 编码格式的请求主体

// 开放静态资源
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use(interceptor)
app.use('/authorization', Authorization);
app.use('/chat', Chat);
app.use('/upload', Upload);

const PORT = 3000;
const server = app.listen(PORT, () => {
    console.log('ws is running on port ' + PORT);
});


const wss = new WebSocket.Server({ server });
startWs(wss)