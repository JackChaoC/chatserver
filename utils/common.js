module.exports = {
    refuse(msg) {
        return {
            code: 0,
            data: null,
            message: msg
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

