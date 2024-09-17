const { db } = require("../../data");

const avalibleRooms = ( rooms, checkIn, checkOut, bookingID ) => {

    db.scan({
        
    })

    try {
        bookThisRoom( room, date, bookingID );
        return [ ]
    } catch (error) {
        
    }
    
};

module.exports = { avalibleRooms };