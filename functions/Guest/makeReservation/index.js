import { responseMaker } from "../../services/responseMaker"
import { db } from "../../../data"
const { v4: uuidv4 } = require('uuid')

exports.handler = async (event) => {

    const { guests, rooms, checkIn, checkOut, name, email } = JSON.parse(event.body);
    const bookingID = uuidv4();

    try {
        const bookedRooms = avalibleRooms( rooms, checkIn, checkOut, bookingID )
        const totalprice = priceCalc( 0, 2, 3 )
        await db.put({
            TableName: "Bookings",
            Item: {
                BookingId: bookingID,
                rooms: bookedRooms,
                guests: guests,
                totalprice:totalprice,
                startDate: checkIn,
                endDate: checkOut,
                customer: name,
                email: email
            }  
        })
        return responseMaker(200,  )
    } catch (error) {
        return responseMaker( 500, )
    } 
}