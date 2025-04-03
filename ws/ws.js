const { v4: uuidv4 } = require('uuid'); 

// 创建 WebSocket 服务器，监听 8080 端口
const clients = new Map()

function startWs(wss) {
    wss.on('connection', (ws,req) => {
        console.log('新的客户端连接',req);
        const clientId = uuidv4();
        // 接收客户端消息
        ws.on('message', (message) => {
            console.log('收到消息:', message.toString());

            // 回复客户端
            ws.send(`服务器收到: ${message}`);

        });

        // 连接关闭
        ws.on('close', () => {
            console.log('客户端断开连接');
        });
    });
}
module.exports = {
    startWs
}