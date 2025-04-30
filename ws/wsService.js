const { Users, Relationship, Conversation, ConversationMembers, Message, Notification, sequelize } = require('../sqlServices/sequelize')
const { Op } = require('sequelize');
const onlineUsers = require('./onlineUsers')
const chatService = require('../route/chatService')

module.exports = {

    //添加消息
    async sendMessage({ sender_id, message, conversation_id }) {
        const transaction = await sequelize.transaction()
        //检验会话是否含有sender
        const flag = !!await chatService.checkIfUserInConversation({ user_id: sender_id, conversation_id })
        if (!flag) throw new Error('user not in conversation');

        //插入message
        const storedMsg = await Message.create({
            message_type: 0,
            message_sender: sender_id,
            message_content: message,
            conversation_id,
        })
        //更新发送者最后已读消息id
        const a_1 = await ConversationMembers.update({
            member_lastread: storedMsg.message_id
        }, {
            where: {
                user_id: sender_id,
                conversation_id
            }
        })
        //记录最后一条消息
        const a = await Conversation.update({
            conversation_lastmessageid: storedMsg.message_id
        }, {
            where: {
                conversation_id
            }
        })
        transaction.commit()

        //保存消息,找出除了会话中的所有人，然后推送消息
        const receivers = await ConversationMembers.findAll({
            where: {
                conversation_id
            }
        })
        if (receivers.length < 1) return
        const promises = receivers.map(receiver => {
            const ws_receiver = onlineUsers.get(receiver.user_id)
            if (ws_receiver) {
                return new Promise((resolve, reject) => {
                    ws_receiver.send(
                        JSON.stringify({ type: "message", message: storedMsg }),
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                })
            }
            //用户不在线则跳过
            return Promise.resolve()
        });
        await Promise.all(promises)
    }

}
