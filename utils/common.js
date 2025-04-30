module.exports = {
    refuse(msg, type = 'error') {
        return {
            code: 0,
            data: null,
            message: msg,
            type
        }
    },
    accept(data, msg = '') {

        return {
            code: 200,
            data: data,
            message: msg
        }
    }
}

