const { db } = require("../../data");

const bookThisRoom = async ( rooms, dates, bookingID ) => {
    console.log(typeof rooms, rooms)
    console.log(typeof dates, dates)
    console.log(typeof bookingID, bookingID )
    try {
        let roomnumbers = []
        const roombooking = [];
        for (let roomID of rooms ) {
            if (roomID !== 0) {
            for ( let datum of dates ) {
                const promise = db.put({
                    TableName: "Rooms",
                    Item: {
                        roomId: String(roomID),
                        date: datum,
                        bookingId: bookingID
                    }
                }) 
                roombooking.push(promise)
            }
            roomnumbers.push(roomID);
            }
        }
        await Promise.all(roombooking)

        let answer;
        if ( roomnumbers.length === 1 ) {
            answer = `You booked room number ${roomnumbers [0]}`
        } else {
            answer = `You booked rooms ${ roomnumbers.toString() }`
        }
        
        return answer
    } catch (error) {
        console.error("error booking rooms:", error);
        return "rooms failed to be booked"
    }

};

module.exports = { bookThisRoom };