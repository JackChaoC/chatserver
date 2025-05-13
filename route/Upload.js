const express = require('express');
const uploadRouter = express.Router();
const multer = require('multer');
const exec = require('../sqlServices/sql.js')
const iconv = require('iconv-lite');
const fs = require('fs')


// 配置 multer 用于文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + iconv.decode(Buffer.from(file.originalname, 'latin1'), 'utf-8')); // 给文件名添加时间戳
    },
});
const options = {
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 限制文件大小为 5MB
    }
}

const upload = multer(options);
let number = 0
// 文件上传路由
uploadRouter.post('/', upload.single('file'), async (req, res) => {
    try {
        console.log(`调用文件接口第${number++}次`);
        console.log(req.file);
        console.log(req.body);
        let originalname = req.file.originalname
        originalname = iconv.decode(Buffer.from(originalname, 'latin1'), 'utf-8');
        let { path, mimetype, size } = req.file;
        path = '/' + path.replace(/\\/g, '/')
        // 将文件信息保存到数据库
        const query = 'INSERT INTO files (file_name, file_path, file_type, file_size, createtime) VALUES (?, ?, ?, ?, UNIX_TIMESTAMP())';
        const result = await exec(query, [originalname, path, mimetype, size])
        if (result.code == 200) {
            result.data.file = {
                file_id: result.data.insertId,
                originalname,
                path
            }
            console.log('文件上传成功');
            result.data = result.data.file
            res.send(result)
        } else if (result.code == 0 || result.data.affectedRows != 1) {
            //删文件
            const filePath = path.join(__dirname, 'uploads', req.file.filename); // 拼接文件路径
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('删除文件时出错:', err);
                } else {
                    console.log('文件已删除:', filePath);
                }
            });

            res.send({
                code: 0,
                data: null,
                message: '上传文件失败'
            })
        } else {
            res.send('未知错误')
        }

    } catch (error) {
        console.log(error);

        res.send('后端异常error')
    }
});

module.exports = uploadRouter