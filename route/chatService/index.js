const common = require('../../utils/common');
const { Users, Relationship, Conversation, ConversationMembers, Message, Notification } = require('../../sqlServices/sequelize')
const { sequelize } = require('../../sqlServices/sequelize')

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
            //是否已存在‘好友请求’&&‘未读’&&‘相同sender’&&‘相同receiver’
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
                res.send(common.accept(flag))
            } else {
                transaction.rollback();
                res.send(common.refuse('好友请求已发送'))

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
    try {
        //[[0,'好友请求']]
        //查看通知类型
        const notificaiton = await Notification.findByPk(notification_id)
        const notificaiton_predata = notificaiton._previousDataValues
        const { sender_id, receiver_id } = notificaiton_value

        if (notificaiton_value.receiver_id != req.userInfo.user_id) return res.send(common.refuse('user_id not match notification'))
        if (!notificaiton) return res.send(common.refuse('no such notification'))

        switch (notificaiton_predata.notification_type) {
            case 0:
                type0()
                break;
            default:
                res.send(common.refuse('notification type wrong'));

        }
        async function type0() {
            const operations = req.body.operations
            if (operations && typeof operations.isAgree === 'boolean') return res.send(common.refuse('lack of params'));

            const transaction = await sequelize.transaction()
            try {
                if (operations.isAgree) {
                    const [relationship, created] = await Relationship.findOrCreate({
                        where: {
                            user1_id: Math.min(sender_id, receiver_id),
                            user2_id: Math.max(sender_id, receiver_id)
                        }
                    })
                }
                Notification.destroy({
                    where: {
                        notificaiton_id: notificaiton_predata.notificaiton_id
                    }
                })

                transaction.commit()
                res.send(common.accept(1))

            } catch (error) {
                await transaction.rollback();
                res.send(common.refuse('事务失败'))
                console.error('事务失败:', error);
            }

        }
    } catch (error) {

    }
}



module.exports = {
    sendNotification,
    replyNotification
}