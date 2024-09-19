import { db } from "../../data";

const sigleRoomIDs = async ( enkel, checkIn, checkOut ) => {
        let avalibleSingleRooms = [];
        console.log( enkel, Number(enkel));
        if ( enkel === 0 ) {
            return [0]
        }
        try {
            for ( let i = 1 ; i < 11 ; i++ ) {
                const startDate = checkIn;
                const endDate = checkOut;
                console.log( startDate, endDate ) 
                const avalibleRoom = await db.query({
                    TableName: "Rooms",
                    KeyConditionExpression: "roomId = :roomId AND #date BETWEEN :startDate AND :endDate ",
                    ExpressionAttributeNames: {
                        "#date": "date"
                    },
                    ExpressionAttributeValues: {
                        ":roomId": String(i),
                        ":startDate": startDate,
                        ":endDate": endDate
                    }
                })
                console.log(`Room ID: ${i}, Result:`, avalibleRoom.Count)
                if ( avalibleRoom.Count == 0 ) {
                    avalibleSingleRooms.push(i)
                    console.log(avalibleSingleRooms)
                }
                if ( avalibleSingleRooms.length == enkel ) {
                    return avalibleSingleRooms;
                }
            }
            return avalibleSingleRooms
        } catch (error) {
            console.error("Error querying DynamoDB:", error);
            return "no rooms avalible, 2"
        }
    };


const doubleRoomsIDs = async ( dubbel, checkIn, checkOut ) => {
        let avalibleDoubleRooms = [];
        console.log( dubbel, Number(dubbel));
        if ( dubbel === 0 ) {
            return [0]
        }
        try {
            for ( let i = 11 ; i < 16 ; i++ ) {
                const startDate = checkIn;
                const endDate = checkOut;
                console.log( startDate, endDate ) 
                const avalibleRoom = await db.query({
                    TableName: "Rooms",
                    KeyConditionExpression: "roomId = :roomId AND #date BETWEEN :startDate AND :endDate ",
                    ExpressionAttributeNames: {
                        "#date": "date"
                    },
                    ExpressionAttributeValues: {
                        ":roomId": String(i),
                        ":startDate": startDate,
                        ":endDate": endDate
                    }
                })
                console.log(`Room ID: ${i}, Result:`, avalibleRoom.Count)
                if ( avalibleRoom.Count == 0 ) {
                    avalibleDoubleRooms.push(i)
                    console.log(avalibleDoubleRooms)
                }
                if ( avalibleDoubleRooms.length == dubbel ) {
                    return avalibleDoubleRooms;
                }
            }
            return avalibleDoubleRooms
        } catch (error) {
            console.error("Error querying DynamoDB:", error);
            return "no rooms avalible, 2"
        }
    };

const suiteRoomsIDs = async ( svit, checkIn, checkOut ) => {
        let avalibleSuiteRooms = [];
        console.log( svit, Number(svit));
        if ( svit === 0 ) {
            return [0]
        }
        try {
            for ( let i = 16 ; i < 21 ; i++ ) {
                const startDate = checkIn;
                const endDate = checkOut;
                console.log( startDate, endDate ) 
                const avalibleRoom = await db.query({
                    TableName: "Rooms",
                    KeyConditionExpression: "roomId = :roomId AND #date BETWEEN :startDate AND :endDate ",
                    ExpressionAttributeNames: {
                        "#date": "date"
                    },
                    ExpressionAttributeValues: {
                        ":roomId": String(i),
                        ":startDate": startDate,
                        ":endDate": endDate
                    }
                })
                console.log(`Room ID: ${i}, Result:`, avalibleRoom.Count)
                if ( avalibleRoom.Count == 0 ) {
                    avalibleSuiteRooms.push(i)
                    console.log(avalibleSuiteRooms)
                }
                if ( avalibleSuiteRooms.length == svit ) {
                    return avalibleSuiteRooms;
                }
            }
            return avalibleSuiteRooms
        } catch (error) {
            console.error("Error querying DynamoDB:", error);
            return "no rooms avalible, 2"
        }
    };

module.exports = { sigleRoomIDs, doubleRoomsIDs, suiteRoomsIDs };