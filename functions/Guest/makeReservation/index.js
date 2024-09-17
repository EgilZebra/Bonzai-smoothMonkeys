import { responseMaker } from "../../services/responseMaker"
import { db } from "../../../data"
const { v4: uuidv4 } = require('uuid')
import { priceCalc } from "../../services/priceCalc";

exports.handler = async (event) => {

    const { guests, rooms, checkIn, checkOut, name, email } = JSON.parse(event.body);
    const bookingID = uuidv4();

    try {
        const bookedRooms = avalibleRooms( rooms, checkIn, checkOut, bookingID )
        const totalprice = priceCalc( bookedRooms )
        await db.put({
            TableName: "Bookings",
            Item: {
                BookingId: bookingID,
                rooms: bookedRooms,
                guests: guests,
                totalprice: totalprice,
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