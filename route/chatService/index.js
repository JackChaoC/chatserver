const common = require('../../utils/common');
const { Users, Relationship, Conversation, ConversationMembers, Message, Notification, sequelize } = require('../../sqlServices/sequelize')
const { Op } = require('sequelize')


//sendNotification for different type
async function sendNotification(req, res) {
    const { receiver_id, notification_type, notification_content } = req.body
    switch (notification_type) {
        //[[0,'好友请求']]
        case 0:
            type0()
            break;
        default:
            res.send(common.refuse('notification type wrong'))

    }
    async function type0() {
        const transaction = await sequelize.transaction();
        try {
            //是否已存在'好友请求' && '未读' && '相同sender' && '相同receiver'
            const data = await Notification.findOne({
                where: {
                    sender_id: req.userInfo.user_id,
                    receiver_id,
                    notification_type,
                    notification_isread: false
                }

            })

            if (!data) {
                const result = await Notification.create({
                    sender_id: req.userInfo.user_id,
                    receiver_id,
                    notification_type,
                    notification_content: notification_content
                })
                await transaction.commit();
                res.send(common.accept(1))
            } else {
                transaction.rollback();
                res.send(common.refuse('好友请求已发送', 'warning'))

            }

        } catch (error) {
            // 出错时回滚
            await transaction.rollback();
            res.send(common.refuse('事务失败'))
            console.error('事务失败:', error);
        }


    }
}
async function replyNotification(req, res) {
    const { notification_id } = req.body
    const transaction = await sequelize.transaction()
    try {
        //[[0,'好友请求']]
        //查看通知类型
        const notificaiton = await Notification.findByPk(notification_id)
        if (!notificaiton) return res.send(common.refuse('no such notification'))
        const notificaiton_predata = notificaiton._previousDataValues
        const { sender_id, receiver_id } = notificaiton_predata

        if (notificaiton_predata.receiver_id != req.userInfo.user_id) return res.send(common.refuse('user_id not match notification'))

        switch (notificaiton_predata.notification_type) {
            case 0:
                await type0()
                break;
            default:
                res.send(common.refuse('notification type wrong'));

        }
        async function type0() {
            const operations = req.body.operations
            if (!operations || !Object.hasOwn(operations, 'isAgree')) return res.send(common.refuse('lack of params'));
            if (typeof operations.isAgree != 'boolean') return res.send(common.refuse('params type error'));

            if (operations.isAgree) {
                const [rela, flag] = await Relationship.findOrCreate({
                    raw: true,
                    where: {
                        user1_id: Math.min(sender_id, receiver_id),
                        user2_id: Math.max(sender_id, receiver_id)
                    },
                    defaults: {},
                    transaction
                })
                if (!flag) throw new Error('你们已经是好友了哦')
                await createConversation({
                    conversation_type: 0,
                    user_id_List: [sender_id, receiver_id]
                }, transaction)
            }
            await Notification.destroy({
                where: {
                    notification_id: notificaiton_predata.notification_id
                }
            }, { transaction })

            transaction.commit()
            res.send(common.accept())


        }
    } catch (err) {
        console.error("rollback", err);
        transaction.rollback()
        res.send(common.refuse(err.message))
    }
}

//创建会话
async function createConversation({ conversation_type, user_id_List, conversation_creator }, transaction) {
    if (conversation_type === 0) {
        if (user_id_List.length > 2) throw new Error('user_id_List length error')

        //是否已存在两人的会话，已存在则return
        const a = await sequelize.query(
            `
            SELECT 1
            FROM Conversation A
            INNER JOIN Conversation_Members B ON A.conversation_id = B.conversation_id
            WHERE A.conversation_type = :conversation_type AND B.user_id IN (:user_ids)
            GROUP BY A.conversation_id
            HAVING COUNT(DISTINCT B.user_id) = :user_count
            `,
            {
                replacements: {
                    conversation_type,
                    user_ids: user_id_List,
                    user_count: user_id_List.length
                },
                type: sequelize.QueryTypes.SELECT,
                transaction
            }
        )

        if (a.length > 0) {
            throw new Error('会话已存在')
        }
        conversation_creator = conversation_creator || user_id_List[0]
        const conv = await Conversation.create({
            conversation_type,
            conversation_creator
        }, { transaction })
        const batchMembers = user_id_List.map((user_id) => {
            return {
                user_id,
                conversation_id: conv.conversation_id
            }
        })
        await ConversationMembers.bulkCreate(batchMembers, { transaction })
    }

}

async function getFriends(user_id) {
    return sequelize.query(`
        SELECT user_id,user_role,user_name,user_email,user_avatar
        FROM Users
        WHERE user_id IN(
            SELECT user2_id FROM Relationships WHERE user1_id=?
            UNION
            SELECT user1_id FROM Relationships WHERE user2_id=?
        )
    `, {
        replacements: [user_id, user_id],
        type: sequelize.QueryTypes.SELECT
    })
}

async function getFriendIds(user_id) {
    const users = await sequelize.query(`
        SELECT user_id
        FROM Users
        WHERE user_id IN(
            SELECT user2_id FROM Relationships WHERE user1_id=?
            UNION
            SELECT user1_id FROM Relationships WHERE user2_id=?
        )
    `, {
        replacements: [user_id, user_id],
        type: sequelize.QueryTypes.SELECT
    })
    return users.map(user => {
        return user.user_id
    })
}


async function checkIfUserInConversation({ user_id, conversation_id }) {
    return !!await ConversationMembers.findOne({
        where: {
            user_id,
            conversation_id
        }
    })
}

async function getMessage({ conversation_id }) {
    return await Message.findAll({
        where: {
            conversation_id
        }
    })
}


module.exports = {
    sendNotification,
    replyNotification,
    getFriends,
    getFriendIds,
    checkIfUserInConversation,
    getMessage
}