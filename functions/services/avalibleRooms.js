import { sigleRoomIDs, doubleRoomsIDs, suiteRoomsIDs  } from "./checkRooms";

const avalibleRooms = async ( rooms, checkIn, checkOut) => {

    try {
        const roomsArr = JSON.parse(rooms)


        let allAvalibleRooms = []
        let avalibleSingleRooms;
        let avalibleDoubleRooms; 
        let avalibleSuiteRooms;
        
        if ( roomsArr[0] > 0 ) { 
            avalibleSingleRooms = await sigleRoomIDs( roomsArr[0], checkIn, checkOut ) 
            if ( avalibleSingleRooms === false ) {
                return "no avalible singel-rooms "
            } else {
                allAvalibleRooms = allAvalibleRooms.concat(avalibleSingleRooms)
            }
        };
        console.log({avalibleSingleRooms: avalibleSingleRooms});     
        
        if ( roomsArr[1] > 0 ) { 
            avalibleDoubleRooms = await doubleRoomsIDs( roomsArr[1], checkIn, checkOut )
            if ( avalibleDoubleRooms === false ) { 
            return " no avalible double-rooms "
            } else {
                allAvalibleRooms = allAvalibleRooms.concat(avalibleDoubleRooms);
            }
        };
        console.log({avalibleDoubleRooms: avalibleDoubleRooms});
       
        if ( roomsArr[2] > 0 ) { 
            avalibleSuiteRooms  = await suiteRoomsIDs( roomsArr[2], checkIn, checkOut ) 
            if ( avalibleSuiteRooms === false ) {
                return " no avalible suites "
            } else {
                allAvalibleRooms = allAvalibleRooms.concat(avalibleSuiteRooms);
            }
        };
        console.log({avalibleSuiteRooms: avalibleSuiteRooms})

        return allAvalibleRooms;
    } catch (error) {
        return "No rooms avalible those dates, sorry!";
    } 
};

module.exports = { avalibleRooms };