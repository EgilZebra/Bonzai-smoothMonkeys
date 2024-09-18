const { db } = require("../../data");
import { bookThisRoom } from "./bookThisRoom";
import { getDates } from "./getDates";
import { sigleRoomIDs, doubleRoomsIDs, suiteRoomsIDs  } from "./checkRooms"
import { responseMaker } from "./responseMaker";


const avalibleRooms = async ( rooms, checkIn, checkOut, bookingID ) => {

    // 2014-09-22
    let enkel;
    if ( rooms[0] !== 0 ) {
        enkel = rooms[0]
    }
    let dubbel;
    if ( rooms[1] !== 0 ) { 
        dubbel = rooms[1] 
    }
    let svit;
    if ( rooms[2] !== 0 ) {
        svit = rooms[2]
    }
 
    

    try {
            let avalibleSingleRooms = [];
        if ( enkel > 0 ) {
            avalibleSingleRooms = sigleRoomIDs( enkel, checkIn, checkOut )
        }

        let avalibleDoubleRooms = [];
        if ( dubbel > 0 ) {
            avalibleDoubleRooms = doubleRoomsIDs( dubbel, checkIn, checkOut )
        }

        let avalibleSuiteRooms = [];
        if ( svit > 0 ) {
            avalibleSuiteRooms = suiteRoomsIDs( svit, checkIn, checkOut )
        }

        
        const allAvalibleRooms = avalibleSingleRooms.concat(avalibleDoubleRooms.concat(avalibleSuiteRooms));
        const allDates = getDates(checkIn, checkOut)


        const roombooking = [];
        for (let roomID of allAvalibleRooms ) {
            for ( let date of allDates ) {
                const promise = bookThisRoom( roomID, date, bookingID )
                roombooking.push(promise)
            }
        }
        await Promise.all(roombooking)

        return responseMaker( 200, { message: "oh yeah boiiiii!"})
    } catch (error) {
        
    }
    
};

module.exports = { avalibleRooms };