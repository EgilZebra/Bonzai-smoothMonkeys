const responseMaker = async ( code, body ) => {
    const response = {
        statusCode: code,
        body: body
    }
    return response
};

module.exports = { responseMaker };