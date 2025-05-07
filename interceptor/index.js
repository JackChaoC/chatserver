const { verifyToken } = require('../utils/index.js')
let count = 0
const interceptor = function (req, res, next) {
    console.log('-----------------------------------------------------------↓');
    console.log('全局 body->', req.body)
    console.log('全局 count->', count += 1)
    console.log('path:', req.path)
    if (req.path.match(/\/authorization/) || req.path.match(/^\/upload$/)) {
        console.log('放行！！！！！！！！！');
        return next(); // 放行这些路由，不进行中间件处理
    }
    let token = req.headers.authorization
    if (!token) {
        return res.send({
            "code": 20001, //未登录
            "data": null,
            "message": "访问成功，但是未登录"
        })
    }

    const arr = token.split(' ')
    if (arr.length > 1) token = arr[1]
    const verifyResult = verifyToken(token)
    console.log('verifyResult:', verifyResult);
    if (verifyResult.success) {
        req.userInfo = verifyResult.data
        next()
    } else {
        res.send({
            "code": 20001, //未登录
            "data": null,
            "message": "访问成功，但是未登录"
        })
    }

    // console.log(`全局 body-> ${JSON.stringify(req.body)}, path-> ${req.path}`)
    // next()

}
module.exports = interceptor;