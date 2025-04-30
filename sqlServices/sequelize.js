const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('chat', 'root', 'openway', {
    dialect: 'mysql',       // 这里可以改成任意一种关系型数据库
    host: 'localhost',      // 数据库服务器
    timezone: '+08:00',     // 这里是东八区，默认为0时区
    logging: false,   // 禁用 SQL 查询日志
    pool: {                 // 使用连接池
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
    logging: console.log,
});

// USERS 表
const Users = sequelize.define('Users', {
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_role: {
        type: DataTypes.STRING(50),
        defaultValue: 'user', // 添加默认值
        comment: '用户角色'
    },
    user_name: {
        type: DataTypes.STRING(50),
        allowNull: false, // 用户名不能为空
        comment: '用户名'
    },
    user_email: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        validate: { isEmail: true }, // 添加邮箱格式验证
        comment: '用户邮箱'
    },
    user_password: {
        type: DataTypes.STRING(70),
        allowNull: false,
        comment: '密码哈希值'
    },
    user_avatar: {
        type: DataTypes.STRING(255), // 增加长度以适应URL
        comment: '用户头像URL'
    },
    createdAt: {
        type: DataTypes.BIGINT,
        defaultValue: () => Date.now() // 使用JS时间戳
    },
}, {
    timestamps: true,
    updatedAt: false,
    tableName: 'USERS',
    comment: '用户信息表',
});

const Relationship = sequelize.define('Relationship', {
    relationship_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user1_id: {
        type: DataTypes.INTEGER,
    },
    user2_id: {
        type: DataTypes.INTEGER,
    },
    createdAt: {
        type: DataTypes.BIGINT,
        defaultValue: () => Date.now() // 使用JS时间戳
    },
}, {
    timestamps: true,
    updatedAt: false,
    indexes: [
        {
            unique: true,
            fields: ['user1_id', 'user2_id']
        }
    ],
    hooks: {
        beforeValidate: (relationship) => {
            // 确保 user1_id < user2_id
            if (relationship.user1_id > relationship.user2_id) {
                [relationship.user1_id, relationship.user2_id] =
                    [relationship.user2_id, relationship.user1_id];
            }
        }
    }
})

const Conversation = sequelize.define('Conversation', {
    conversation_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '会话ID'
    },
    conversation_name: {
        type: DataTypes.STRING(50),
        comment: '会话名称'
    },
    conversation_type: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        defaultValue: 0, // 0-私聊 1-群聊
        comment: '会话类型'
    },
    conversation_avatar: {
        type: DataTypes.STRING(255), // 增加长度
        comment: '会话头像URL'
    },
    conversation_creator: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '创建者用户ID'
    },
    conversation_lastmessageid: {
        type: DataTypes.INTEGER,
        comment: '最后一条消息ID'
    },
    createdAt: {
        type: DataTypes.BIGINT,
        defaultValue: () => Date.now() // 使用JS时间戳
    },
    updatedAt: {
        type: DataTypes.BIGINT,
        defaultValue: () => Date.now() // 使用JS时间戳
    },
}, {
    tableName: 'CONVERSATION',
    timestamps: true,
    comment: '会话信息表'
});

const ConversationMembers = sequelize.define('ConversationMembers', {
    conversation_members_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    conversation_id: {
        type: DataTypes.INTEGER,
        comment: '会话ID',
        allowNull: false,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '用户ID'
    },
    member_role: {
        type: DataTypes.SMALLINT,
        defaultValue: 0, // 0-普通成员 1-管理员 2-群主
        comment: '成员角色'
    },
    member_unread: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '未读消息数'
    },
    member_lastread: {
        type: DataTypes.INTEGER,
        comment: '最后阅读的消息ID'
    },
    createdAt: {
        type: DataTypes.BIGINT,
        defaultValue: () => Date.now() // 使用JS时间戳
    },
}, {
    tableName: 'CONVERSATION_MEMBERS',
    comment: '会话成员表'
});

const Message = sequelize.define('Message', {
    message_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '消息ID'
    },
    message_type: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        defaultValue: 0, // 0-文本 1-图片 2-视频 3-文件 4-语音
        comment: '消息类型'
    },
    message_content: {
        type: DataTypes.TEXT, // 改为TEXT类型以支持长内容
        comment: '消息内容'
    },
    message_sender: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '发送者用户ID'
    },
    conversation_id: { // 改为关联会话ID而非接收者
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '所属会话ID'
    },
    message_status: {
        type: DataTypes.SMALLINT,
        defaultValue: 0, // 0-发送中 1-已发送 2-已送达 3-已读
        comment: '消息状态'
    },
    message_extra: {
        type: DataTypes.JSON, // 用于存储额外信息如文件URL、大小等
        comment: '附加信息'
    },
    message_isdeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '是否已删除'
    },
    createdAt: {
        type: DataTypes.BIGINT,
        defaultValue: () => Date.now() // 使用JS时间戳
    },
    updatedAt: {
        type: DataTypes.BIGINT,
        defaultValue: () => Date.now() // 使用JS时间戳
    },
}, {
    tableName: 'MESSAGE',
    timestamps: true,
    comment: '消息表'
});

const Notification = sequelize.define('Notification', {
    notification_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    sender_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    receiver_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    notification_type: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        comment: `[[0,'好友请求']]`
    },
    notification_content: {
        type: DataTypes.TEXT,
    },
    notification_isread: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    notification_extra: {
        type: DataTypes.JSON,
    },
    createdAt: {
        type: DataTypes.BIGINT,
        defaultValue: () => Date.now() // 使用JS时间戳
    },
    updatedAt: {
        type: DataTypes.BIGINT,
        defaultValue: () => Date.now() // 使用JS时间戳
    },
}, {
    timestamps: true
})

// FILES 表
const Files = sequelize.define('Files', {
    file_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    file_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    file_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
    },
    file_path: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    file_size: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    createtime: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: () => Math.floor(Date.now() / 1000)
    },
}, {
    tableName: 'FILES',
    timestamps: false,
});

// 定义模型之间的关联（外键约束）
Conversation.belongsTo(Users, { foreignKey: 'conversation_creator', onDelete: 'RESTRICT' });
ConversationMembers.belongsTo(Users, { foreignKey: 'user_id', onDelete: 'RESTRICT' })
ConversationMembers.belongsTo(Conversation, { foreignKey: 'conversation_id', onDelete: 'CASCADE' })
Conversation.hasMany(ConversationMembers, { foreignKey: 'conversation_id' })
Message.belongsTo(Users, { foreignKey: 'message_sender', onDelete: 'RESTRICT' })
Message.belongsTo(Conversation, { foreignKey: 'conversation_id', onDelete: 'CASCADE' })
Notification.belongsTo(Users, { foreignKey: 'sender_id' })
Users.hasMany(Notification, { foreignKey: 'sender_id' })
Notification.belongsTo(Users, { foreignKey: 'receiver_id' })
Users.hasMany(Notification, { foreignKey: 'receiver_id' })
Conversation.belongsTo(Message, { foreignKey: 'conversation_lastmessageid', onDelete: 'SET NULL', as: 'last_message' })

//清除所有外键
async function dropAllForeignKeys() {


    // 查询所有外键
    const [results] = await sequelize.query(`
        SELECT TABLE_NAME, CONSTRAINT_NAME 
        FROM information_schema.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_TYPE = 'FOREIGN KEY' 
        AND TABLE_SCHEMA = DATABASE();
    `);

    // 循环删除外键
    // 循环删除外键
    for (const row of results) {
        const { TABLE_NAME, CONSTRAINT_NAME } = row;
        console.log(`删除外键: ${CONSTRAINT_NAME} 在表: ${TABLE_NAME}`);
        await sequelize.query(`ALTER TABLE \`${TABLE_NAME}\` DROP FOREIGN KEY \`${CONSTRAINT_NAME}\`;`);
    }
}
//清除所有unique键

async function dropAllUniqueKeys() {


    // 查询所有唯一索引
    const [results] = await sequelize.query(`
        SELECT TABLE_NAME, CONSTRAINT_NAME
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_TYPE = 'UNIQUE'
        AND TABLE_SCHEMA = DATABASE();
    `);

    // 循环删除唯一索引
    for (const row of results) {
        const { TABLE_NAME, CONSTRAINT_NAME } = row;
        console.log(`删除唯一索引: ${CONSTRAINT_NAME} 在表: ${TABLE_NAME}`);
        await sequelize.query(`ALTER TABLE \`${TABLE_NAME}\` DROP INDEX \`${CONSTRAINT_NAME}\`;`);
    }
}
// 同步数据库
async function initDatabase() {//只要外部使用了这个文件，整个文件就会被执行
    await dropAllForeignKeys();
    await dropAllUniqueKeys();
    await sequelize.sync({ force: false, alter: true });
    console.log("数据库同步成功");
}
initDatabase().catch(console.error);

module.exports = {
    Users,
    Relationship,
    Conversation,
    ConversationMembers,
    Message,
    Notification,
    Files,
    initDatabase,
    sequelize
}