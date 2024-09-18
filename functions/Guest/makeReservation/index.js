import { responseMaker } from "../../services/responseMaker"
import { db } from "../../../data"
const { v4: uuidv4 } = require('uuid')
import { priceCalc } from "../../services/priceCalc";

exports.handler = async (event) => {
    
    // guets: string, rooms: [ number, number, number ], checkIn: Date, checkOut: Date, name: String, emil: String
    const { guests, rooms, checkIn, checkOut, name, email } = JSON.parse(event.body);
    console.log( guests, rooms, checkIn, checkOut, name, email );
    const bookingID = uuidv4();

    try {
        const bookedRooms = avalibleRooms( rooms, checkIn, checkOut, bookingID )
        console.log(bookedRooms);
        const totalprice = priceCalc( bookedRooms )
        console.log(totalprice);
        const answer = await db.put({
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
        return responseMaker(200, answer  )
    } catch (error) {
        return responseMaker( 500, )
    } 
}