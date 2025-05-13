const express = require('express');
const exec = require('../sqlServices/sql.js')
const Authorization = express.Router();
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/auth.js');
const common = require('../utils/common');
const { Users } = require('../sqlServices/sequelize')

/**
 * 1.登录
 * @param {user_emial : String} 
 * @param {user_password : String}
 * @return {Number} 200|20001
 */
Authorization.post('/login', async (req, res) => {
    try {
        let { user_email, user_password } = req.body
        const sqlResult = await exec('SELECT user_id,user_name,user_email,user_password FROM USERS WHERE user_email=?', [user_email])
        if (sqlResult.data.length > 0) {

            const { user_id, user_name, user_email, user_password: storedPasswordHash, user_role } = sqlResult.data[0];
            const isPasswordCorrect = await bcrypt.compare(user_password, storedPasswordHash)

            if (isPasswordCorrect) {
                const result = {
                    code: 200,
                    data: {
                        user_id: user_id,
                        user_name: user_name,
                        user_email: user_email,
                    },
                    message: '登录成功'
                }
                //auth
                res.cookie('token', generateToken({ user_id, user_role, user_name, user_email }))

                console.log('login result:', result);

                return res.send(result);
            } else {
                res.send(common.refuse('密码错误'));
            }
        } else {
            res.send(common.refuse('用户不存在'));
        }
    } catch (error) {
        res.send(error)
    }
})
/**
 * @param {user_email : String}
 * @param {user_password : String}
 * { data:0 }，账号已存在 || { data:1 }，注册成功
 */
Authorization.post('/register', async (req, res) => {
    try {
        const { user_email, user_name, user_password } = req.body
        console.log(user_email, req.body)
        const existResult = await exec('SELECT * FROM USERS WHERE user_email=?', [user_email])
        // 账号是否存在
        if (existResult.data.length > 0) {
            existResult.data = 0
            res.send(common.refuse('账号已存在'));
        } else {
            const storedPasswordHash = await bcrypt.hash(user_password, 10);
            const result = await exec('INSERT INTO USERS (user_email,user_name,user_password) VALUES (?,?,?)', [user_email, user_name, storedPasswordHash])
            res.send(result)
        }
    } catch (error) {
        console.log(error)
        res.send(error)
    }
})

module.exports = Authorization;