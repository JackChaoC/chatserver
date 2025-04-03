const mysql = require('mysql2');
const config = {
    host: 'localhost',
    user: 'root',
    password: 'openway',
    port: 3306,
    database: 'chat'
}
const pool = mysql.createPool(config);
const exec = (sql, value) => {
    return new Promise((resolve, reject) => {
        // 连接数据库
        pool.getConnection((err, connection) => {
            if (err) {
                reject(err)
            }

            connection.query(sql, value ? value : undefined, (err, result) => {
                console.log('sql:', sql);
                console.log('sql param:', value);
                if (err) {
                    //操作失败
                    console.log('err:' + err);
                    reject(err)
                } else {
                    resolve({
                        code: 200,
                        data: result,
                        message: 'sql操作成功'
                    })
                }
                connection.release() // 释放连接
            })


        })
    })
}
module.exports = exec