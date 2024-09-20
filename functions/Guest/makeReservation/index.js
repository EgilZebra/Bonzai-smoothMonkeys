import { responseMaker } from "../../services/responseMaker"
import { db } from "../../../data"
const { v4: uuidv4 } = require('uuid')
import { priceCalc } from "../../services/priceCalc";
import { avalibleRooms } from "../../services/avalibleRooms"
import { getDates } from "../../services/getDates";
import { bookThisRoom } from "../../services/bookThisRoom";
import { checkParams } from "../../services/checkParams";

exports.handler = async (event) => {
    
    // guets: string, rooms: [ number, number, number ], checkIn: Date, checkOut: Date, name: String, emil: String
    const { guests, rooms, checkIn, checkOut, name, email } = JSON.parse(event.body);
    console.log( guests, rooms, checkIn, checkOut, name, email );
    const bookingID = uuidv4();

    try {
        const newParams = await checkParams( name, email, guests, rooms, checkIn, checkOut );
        if ( newParams !== true ) {
            return responseMaker( 400, newParams )
        }
            
        const bookedRooms = await avalibleRooms( rooms, checkIn, checkOut )
        console.log({bookedrooms: bookedRooms});
        
        if ( typeof bookedRooms === 'string' ) {
            return responseMaker ( 400, bookedRooms )
        }

        const totalprice = await priceCalc( bookedRooms )
        console.log({totalprice: totalprice });

        const allDates = await getDates(checkIn, checkOut)
        console.log({allDates: allDates});
        const roombooking = await bookThisRoom( bookedRooms, allDates, bookingID )

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
        console.log(answer);
        return responseMaker(200, {rumsnummer: bookedRooms,  pris: totalprice, booked: answer , roomsbooked: roombooking} )
    } catch (error) {
        return responseMaker( 500, {message: "Sorry, the sytem does not seem to work properly!"} )
    } 
}