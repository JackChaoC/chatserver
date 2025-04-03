const express = require('express');
const exec = require('../sqlServices/sql.js')
const Chat = express.Router();
const common = require('../utils/common');
const { Op, where } = require('sequelize')
const chatService = require('./chatService')

const { Users, Relationship, Conversation, ConversationMembers, Message, Notification } = require('../sqlServices/sequelize')


Chat.post('/findUser', async (req, res) => {//{keyword: 'xxx'}
    try {

        const { keyword } = req.body
        if (!keyword) res.send(common.refuse('搜索内容不能为空'))
        const result = await Users.findAll({
            attributes: ['user_id', 'user_name', 'user_email', 'user_avatar'],
            where: {
                user_name: {
                    [Op.like]: `%${keyword}%`
                }
            }
        })
        console.log(result);
        res.send(common.accept(result))
    } catch (error) {
        console.log(error);

    }
})
Chat.post('/getNotification', async (req, res) => {
    try {
        const result = await Notification.findAll({
            where: {
                user_id: req.userInfo.user_id
            }
        })
        res.send(common.accept(result))
    } catch (error) {
        console.log(error);

    }
})

Chat.post('/getConversation', async (req, res) => {
    try {
        const result = await Conversation.findAll({
            include: [
                {
                    model: ConversationMembers,
                    where: {
                        user_id: req.userInfo.user_id
                    }
                }
            ]
        })
        res.send(common.accept(result))
    } catch (error) {
        console.log(error);

    }
})

Chat.post('/sendNotification', async (req, res) => {//{receiver_id,notification_type,notification_content}
    const { receiver_id, notification_type, notification_content } = req.body
    if (!receiver_id || notification_type === undefined) return res.send(common.refuse('lack of params'))
    chatService.sendNotification(req, res)
})

Chat.post('/replyNotification', async (req, res) => {//{notificationo_id,operations:{isAgree:boolean}}
    const { notification_id } = req.body
    if (!notification_id) return res.send(common.refuse('lack of params'))
    chatService.replyNotification(req, res)


})


module.exports = Chat;