const express = require('express');
const exec = require('../sqlServices/sql.js')
const Chat = express.Router();
const common = require('../utils/common');
const { Op } = require('sequelize')
const chatService = require('./chatService')

const { Users, Relationship, Conversation, ConversationMembers, Message, Notification, sequelize } = require('../sqlServices/sequelize');
const { Json } = require('sequelize/lib/utils');
const { CharsetToEncoding } = require('mysql2');


Chat.post('/searchUser', async (req, res) => {//{keyword: 'xxx'}
    try {
        const { keyword } = req.body
        if (!keyword) res.send(common.refuse('搜索内容不能为空'))
        let result = await Users.findAll({
            attributes: ['user_id', 'user_name', 'user_email', 'user_avatar'],
            where: {
                user_name: {
                    [Op.like]: `%${keyword}%`
                }
            }
        })
        const friends = await chatService.getFriends(req.userInfo.user_id)
        friends.forEach(item => {
            result.forEach(r => {
                if (r.user_id === item.user_id) {
                    r.setDataValue('isFriend', true)
                }
            })
        })
        console.log(result);
        res.send(common.accept(result))
    } catch (error) {
        console.log(error);
        res.send(common.refuse('搜索失败'))
    }
})

Chat.post('/getNotifications', async (req, res) => {
    try {
        const result = await Notification.findAll({
            where: {
                receiver_id: req.userInfo.user_id
            }
        })
        res.send(common.accept(result))
    } catch (error) {
        console.log(error);
        res.send(common.refuse('获取通知失败'))
    }
})


Chat.post('/sendNotification', async (req, res) => {//{receiver_id,notification_type,notification_content}
    const { receiver_id, notification_type, notification_content } = req.body
    if (!receiver_id || notification_type === undefined) return res.send(common.refuse('lack of params'))
    chatService.sendNotification(req, res)
})

Chat.post('/replyNotification', async (req, res) => {//{notificationo_id,notification_type:number,operations:{isAgree:boolean}}
    const { notification_id } = req.body
    if (!notification_id) return res.send(common.refuse('lack of params'))
    chatService.replyNotification(req, res)


})

Chat.post('/getFriendsAndMe', async (req, res) => {
    const requester_id = req.userInfo.user_id
    try {
        const result = await chatService.getFriendsAndMe(requester_id)
        return res.send(common.accept(result))
    } catch (error) {
        console.log(error);
    }
})

Chat.post('/getConversations', async (req, res) => {
    const requester_id = req.userInfo.user_id

    try {
        const friendIds = await chatService.getFriendIds(requester_id)
        let conversations = await Conversation.findAll({
            attributes: ['conversation_id', 'conversation_type', 'conversation_type', 'conversation_avatar', 'conversation_creator', 'createdAt'],
            include: [//取最后一个模型
                {
                    model: ConversationMembers,
                    where: {
                        user_id: {
                            [Op.in]: [...friendIds, requester_id]
                        }
                    },
                    include: [
                        {
                            model: Users,//当你在关联中没有显式指定 as 别名时，Sequelize 会自动使用模型名称的单数形式作为别名。你的模型定义是 Users（复数），但 Sequelize 会默认将其关联别名设为 user（单数）。
                            attributes: ['user_id', 'user_role', 'user_name', 'user_email', 'user_avatar']
                        }
                    ],
                },
                {
                    model: Message,
                    as: 'last_message'
                }
            ],
            where: {
                conversation_type: 0,
                // 使用子查询确保对话包含 requester_id
                conversation_id: {
                    [Op.in]: sequelize.literal(`(
                    SELECT conversation_id 
                    FROM conversation_members 
                    WHERE user_id = ${requester_id}
                    )`)
                }
            }
        })
        conversations = JSON.parse(JSON.stringify(conversations))
        //优化结构
        const result = conversations.map(conversation => {
            const newUsers = conversation.ConversationMembers.map(cm => {
                cm.User.lastread = cm.member_lastread
                return cm.User
            })
            conversation.users = newUsers
            delete conversation.ConversationMembers
            return conversation
        })
        res.send(common.accept(result))
    } catch (error) {
        console.log(error);
        res.send(common.refuse())
    }
})

Chat.post('/getMessages', async (req, res) => {//{conversation_id}
    const requester_id = req.userInfo.user_id;
    const { conversation_id } = req.body;
    if (!conversation_id) return res.send(common.refuse('lack of params'));

    // 用户是否在会话中
    const flag = await chatService.checkIfUserInConversation({ user_id: requester_id, conversation_id })
    if (!flag) return res.send(common.refuse('user not in conversation'));

    const result = await chatService.getMessage({ conversation_id })
    return res.send(common.accept(result))
})

Chat.post('/messageRead', async (req, res) => {//{conversation_id}
    try {
        await sequelize.transaction(async (t) => {
            const { conversation_id } = req.body
            if (conversation_id < 1) return res.send(common.refuse('lack of params'))
            const last_msg = await Message.findOne({
                where: {
                    conversation_id
                },
                order: [['createdAt', 'DESC']],
                limit: 1,
                transaction: t
            })
            if (!last_msg) return res.send(common.refuse('no message'))
            const a = await ConversationMembers.update(
                { member_lastread: last_msg.message_id },
                {
                    where: {
                        user_id: req.userInfo.user_id,
                        conversation_id
                    },
                    transaction: t
                }
            )

            res.send(common.accept())
        })
    } catch (error) {
        console.log(error);
        res.send(common.refuse())
    }

})

Chat.post('/deleteFriend', async (req, res) => {//{delete_id}
    const { delete_id } = req.body
    if (!delete_id) return res.send(common.refuse('lack of params'))
    try {
        await sequelize.transaction(async (t) => {
            const isFriend = await chatService.towIsFriend({
                user1_id: req.userInfo.user_id,
                user2_id: delete_id
            })
            if (!isFriend) return res.send(common.refuse('非好友关系，删除失败'))
            const relationship = await chatService.getRelationship({ user1_id: delete_id, user2_id: req.userInfo.user_id });
            const { conversation_id, relationship_id } = relationship
            //删除conversation,联级删除message、relationship、conversationMemebers
            await Conversation.destroy({
                where: {
                    conversation_id
                }
            }, { transaction: t })
        })
        return res.send(common.accept('删除成功'))
    } catch (error) {
        return res.send(common.refuse())
    }

})

Chat.post('/updateAvatar', async (req, res) => {//{avatar_url}
    const { avatar_url } = req.body
    const { user_id } = req.userInfo
    if (!avatar_url) return res.send(common.refuse('lack of params'))
    try {
        let updated_user = {}
        await sequelize.transaction(async (t) => {
            await Users.update({
                user_avatar: avatar_url
            }, {
                where: {
                    user_id: user_id
                }
            }, { transaction: t })
            updated_user = await Users.findByPk(user_id)
        })
        return res.send(common.accept(updated_user))
    } catch (error) {
        console.log(error);
        return res.send(common.refuse())
    }
})

module.exports = Chat;