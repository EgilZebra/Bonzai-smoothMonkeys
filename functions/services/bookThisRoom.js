const { db } = require("../../data");

const bookThisRoom = async ( room, date, bookingID ) => {
    try {
       await db.put({
        TableName: "Rooms",
        Item: {
                roomId: room,
                date: date,
                bookingId: bookingID
            }
        }) 
        return true
    } catch (error) {
        return false
    }
    

};

module.exports = { bookThisRoom };