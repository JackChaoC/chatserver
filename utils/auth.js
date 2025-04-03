const jwt = require('jsonwebtoken');

// 密钥（必须保密！）
const SECRET_KEY = '=afvi=4va=!@#*@ds-32';

// 生成 JWT
function generateToken(userInfo) {
	const token = jwt.sign(
		{
			...userInfo,
			iss: 'my-app',      // 验证签发者
			aud: 'web-client'
		},              // Payload（存放用户ID）
		SECRET_KEY,             // 密钥
		{ expiresIn: '365d' }     // 过期时间（1小时）
	);
	return token;
}

function verifyToken(token) {
	try {
		const decoded = jwt.verify(token, SECRET_KEY, {
			algorithms: ['HS256'], // 强制算法白名单
			issuer: 'my-app',      // 验证签发者
			audience: 'web-client' // 验证受众
		});
		return { success: true, data: decoded };
	} catch (err) {
		// 根据错误类型返回不同的错误信息
		let statusCode = 401;
		if (err.name === 'JsonWebTokenError') {
			if (err.message === 'invalid signature') statusCode = 403;
		}
		return {
			success: false,
			error: err.message,
			statusCode
		};
	}
}

module.exports = {
	generateToken,
	verifyToken
}
