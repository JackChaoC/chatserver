const { verifyToken } = require('../utils/auth');
const wsService = require('./wsService')
const onlineUsers = require('./onlineUsers')

function startWs(wss) {
    wss.on('connection', (ws, req) => {
        console.log("有新客户端连接");

        // 监听客户端消息
        ws.on("message", async (msg) => {
            try {
                const data = JSON.parse(msg);


                //心跳响应
                if (data.type === "heartbeat") {

                    return ws.send(JSON.stringify({ type: "heartbeat", success: true }));

                }

                // 认证逻辑
                if (data.type === "auth") {
                    try {
                        const decoded = verifyToken(data.token); // 验证 token
                        if (decoded.success) {
                            userData = decoded.data
                            ws.isAuthenticated = decoded.success; // 标记为已认证
                            ws.user_id = userData.user_id; // 存储用户信息
                            ws.user_name = userData.user_name;
                            ws.user_email = userData.user_email;

                            onlineUsers.set(ws.user_id, ws)

                            console.log(`用户 id:${ws.user_id} name:${ws.user_name} 认证成功`);
                            ws.send(JSON.stringify({ type: "auth", success: true }));
                        }
                    } catch (err) {
                        ws.close(1008, "Token 无效"); // 关闭连接
                    }
                } else if (!ws.isAuthenticated) { // 非认证消息，但未认证则拒绝
                    ws.close(1008, "请先发送认证消息");
                }

                // 已认证后的业务逻辑
                else {
                    console.log(`收到用户 id:${ws.user_id} name:${ws.user_name} 的消息:`, data);
                    ws.send(JSON.stringify({ type: "echo", data: "消息已收到" }));
                    switch (data.type) {
                        case 'message':
                            if (!data.conversation_id || !data.message) throw new Error('lack of params')
                            await wsService.sendMessage({
                                sender_id: ws.user_id,
                                ...data
                            })

                    }
                }

            } catch (err) {
                if (err.message) {
                    ws.send(JSON.stringify({ type: "error", message: err.message }))
                } else {
                    ws.send(JSON.stringify({ type: "error", message: "消息格式错误" }));
                }
            }
        });

        // 连接关闭时触发
        ws.on("close", () => {
            console.log("客户端断开连接");
            if (ws.user_id) {
                onlineUsers.delete(ws.user_id)
            }
        });
    });
}




module.exports = {
    startWs,
    onlineUsers
}