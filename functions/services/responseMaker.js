const responseMaker = async ( code, body ) => {
    const response = {
        statusCode: code,
        headers: {
            "Conten-Type": "application/json"
        },
        body: JSON.stringify(body)
    }
    return response
};

module.exports = { responseMaker };