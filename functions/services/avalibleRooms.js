const { db } = require("../../data");
import { bookThisRoom } from "./bookThisRoom";
import { getDates } from "./getDates";
import { sigleRoomIDs, doubleRoomsIDs, suiteRoomsIDs  } from "./checkRooms";


const avalibleRooms = async ( rooms, checkIn, checkOut, bookingID ) => {
    console.log( rooms, checkIn, checkOut, bookingID )
    try {

        const roomsArr = JSON.parse(rooms)

        console.log( typeof enkel )
        
        let avalibleSingleRooms = await sigleRoomIDs( roomsArr[0], checkIn, checkOut )

        let avalibleDoubleRooms = await doubleRoomsIDs( roomsArr[1], checkIn, checkOut )
        
        let avalibleSuiteRooms  = await suiteRoomsIDs( roomsArr[2], checkIn, checkOut )
        

        const allAvalibleRooms = avalibleSingleRooms.concat(avalibleDoubleRooms, avalibleSuiteRooms);
        const allDates = getDates(checkIn, checkOut)
        console.log(allDates);

        // const roombooking = [];
        // for (let roomID of allAvalibleRooms ) {
        //     for ( let date of allDates ) {
        //         const promise = bookThisRoom( roomID, date, bookingID )
        //         roombooking.push(promise)
        //     }
        // }
        // await Promise.all(roombooking)

        return allAvalibleRooms;
    } catch (error) {
        return "No rooms avalible those dates, sorry!";
    }
    
};

module.exports = { avalibleRooms };