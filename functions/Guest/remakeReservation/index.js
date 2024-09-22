import { responseMaker } from "../../services/responseMaker"
import { db } from "../../../data"
const { v4: uuidv4 } = require('uuid')
import { priceCalc } from "../../services/priceCalc";
import { ReavalibleRooms } from "../../services/ReavalibleRooms"
import { getDates } from "../../services/getDates";
import { bookThisRoom } from "../../services/bookThisRoom";
import { checkParams } from "../../services/checkParams";
import { fetchNameEmail } from "../../services/fetchNameEmail"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
require("dotenv").config();

const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    
    const { guests, rooms, checkIn, checkOut, BookingId } = JSON.parse(event.body);
    console.log( guests, rooms, checkIn, checkOut);
    const newBookingID = uuidv4();

    try {
        const nameEmail = await fetchNameEmail(BookingId);
        if (nameEmail === false) {
          return responseMaker( 400, "Booking does not exists" )
        }  

        const name = nameEmail.name;
        console.log({ name:  name})
        const email = nameEmail.email;
        console.log({ email: email})

        const newParams = await checkParams( name, email, guests, rooms, checkIn, checkOut );
        if ( newParams !== true ) {
            return responseMaker( 400, newParams )
        }

         const allDates = await getDates(checkIn, checkOut)
        console.log({allDates: allDates});    

        const bookedRooms = await ReavalibleRooms( rooms, allDates, BookingId )
        console.log({bookedrooms: bookedRooms});
        
        if ( typeof bookedRooms === 'string' ) {
            return responseMaker ( 400, bookedRooms )
        }

        const totalprice = await priceCalc( bookedRooms )
        console.log({totalprice: totalprice });


        try {

            const deleteBookingParams = {
            TableName: "Bookings",
            Key: {
              BookingId: BookingId,
            },
            };
      
            const deleteOld = await dynamoDb.send(new DeleteCommand(deleteBookingParams));
            console.log({ deleteOld: deleteOld })
        } catch (error) {
            console.error({"error in deleting": error})
        }

        try {

            const scanParams = {
                TableName: "Rooms",
                FilterExpression: "bookingId = :bookingId",
                ExpressionAttributeValues: {
                  ":bookingId": BookingId,
                },
              };
          
              const scanResult = await dynamoDb.send(new ScanCommand(scanParams));
          
              const allOldDates = allDates( nameEmail.oldStart, nameEmail.oldEnd )

              if (scanResult.Items && scanResult.Items.length > 0) {
                for (const item of scanResult.Items) {
                    for (const datum of allOldDates) {
                        const deleteRoomParams = {
                        TableName: "Rooms",
                        Key: {
                        roomId: item.roomId,
                        date: item.datum,
                        },
                    };
                    await dynamoDb.send(new DeleteCommand(deleteRoomParams));
                    }
                }
              }
          
        } catch (error) {
            console.error({"error while deleting rooms": error})
        }
       

        

        const roombooking = await bookThisRoom( bookedRooms, allDates, newBookingID )

        const answer = await db.put({
            TableName: "Bookings",
            Item: {
                BookingId: newBookingID,
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
        return responseMaker(200, { message: `Dear ${name} Your remade booking was successful!`, rooms: roombooking, Guests: `For ${guests} people`, price: `${totalprice} kr`, bookingNumber: newBookingID, dates: ` from ${checkIn} to ${checkOut}` } )
    } catch (error) {
        return responseMaker( 500, {message: "Sorry, the sytem does not seem to work properly!"} )
    } 
}