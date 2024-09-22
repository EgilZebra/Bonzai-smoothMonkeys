import { ResigleRoomIDs, RedoubleRoomsIDs, ResuiteRoomsIDs  } from "./reCheckRooms";

const ReavalibleRooms = async ( rooms, allDates, oldBookingID) => {

    try {
        const roomsArr = JSON.parse(rooms)


        let allAvalibleRooms = []
        let avalibleSingleRooms;
        let avalibleDoubleRooms; 
        let avalibleSuiteRooms;

        console.log({allDates: allDates})
        
        if ( roomsArr[0] > 0 ) { 
            let Myroom = [1,2,3,4,5,6,7,8,9,10];
            for ( let datum of allDates ){
                let roomsOfDate = await ResigleRoomIDs( roomsArr[0], datum, oldBookingID ) 
                if (!roomsOfDate) {
                   return `single rooms not availablie on ${datum}`;
                }     
                Myroom = Myroom.filter(room => roomsOfDate.includes(room));
                }
            avalibleSingleRooms = Myroom.slice(0, (roomsArr[0]));
            console.log({avalibleSingleRooms: avalibleSingleRooms})
            console.log({ Myroom: Myroom})

            if (avalibleSingleRooms.length < roomsArr[0]) {
                    return "no avalible singel-rooms "
                } else {
                    allAvalibleRooms = allAvalibleRooms.concat(avalibleSingleRooms)
                }
            
        };
        console.log({avalibleSingleRooms: avalibleSingleRooms});     
        
        if ( roomsArr[1] > 0 ) { 
            let Myroom = [11,12,13,14,15];
            for ( let datum of allDates ){
            let roomsOfDate = await RedoubleRoomsIDs( roomsArr[1], datum, oldBookingID )
            if (!roomsOfDate) {
                return `doublerooms rooms not availablie on ${datum}`;
             }
             Myroom = Myroom.filter(room => roomsOfDate.includes(room));
            }

            
            avalibleDoubleRooms = Myroom.slice( 0, (roomsArr[1]) );
            

            if (avalibleDoubleRooms.length < roomsArr[1]) { 
            return " no avalible double-rooms "
            } else {
                allAvalibleRooms = allAvalibleRooms.concat(avalibleDoubleRooms);
            }
        
        };
        console.log({avalibleDoubleRooms: avalibleDoubleRooms});
       
        if ( roomsArr[2] > 0 ) { 
            let Myroom = [16,17,18,19,20];
            for ( let datum of allDates ){
            let roomsOfDate = await ResuiteRoomsIDs( roomsArr[2], datum, oldBookingID ) 
            if (!roomsOfDate) {
                return `Suites rooms not availablie on ${datum}`;
             } 
             Myroom = Myroom.filter(room => roomsOfDate.includes(room));
            }
            avalibleSuiteRooms = Myroom.slice( 0 , (roomsArr[2]) );
            if (avalibleSuiteRooms.length < roomsArr[2]) {
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

module.exports = { ReavalibleRooms };