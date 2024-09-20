import { db } from "../../data";

const sigleRoomIDs = async ( enkel, checkIn, checkOut ) => {
        let avalibleSingleRooms = [];

        try {
            for ( let i = 1 ; i < 11 ; i++ ) {
                const startDate = checkIn;
                const endDate = checkOut;

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
                
                if ( avalibleRoom.Count == 0 ) {
                    avalibleSingleRooms.push(i)

                }
                if ( avalibleSingleRooms.length == enkel ) {
                    return avalibleSingleRooms;
                }
            }
            if ( avalibleSingleRooms = [] ) {
                return false
            } else { 
                return avalibleSingleRooms
            }
            
        } catch (error) {
            console.error("Error querying DynamoDB:", error);
            return "no rooms avalible, 2"
        }
    };


const doubleRoomsIDs = async ( dubbel, checkIn, checkOut ) => {
        let avalibleDoubleRooms = [];


        try {
            for ( let i = 11 ; i < 16 ; i++ ) {
                const startDate = checkIn;
                const endDate = checkOut;

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
                
                if ( avalibleRoom.Count == 0 ) {
                    avalibleDoubleRooms.push(i)
                }
                if ( avalibleDoubleRooms.length == dubbel ) {
                    return avalibleDoubleRooms;
                }
            }
            
            if ( avalibleDoubleRooms = [] ) {
                return false
            } else { 
                return avalibleDoubleRooms
            }

        } catch (error) {
            console.error("Error querying DynamoDB:", error);
            return "no rooms avalible, sorry"
        }
    };

const suiteRoomsIDs = async ( svit, checkIn, checkOut ) => {
        let avalibleSuiteRooms = [];

        try {
            for ( let i = 16 ; i < 21 ; i++ ) {
                const startDate = checkIn;
                const endDate = checkOut;
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
                
                if ( avalibleRoom.Count == 0 ) {
                    avalibleSuiteRooms.push(i)
                }
                if ( avalibleSuiteRooms.length == svit ) {
                    return avalibleSuiteRooms;
                }
            }
        
            if ( avalibleSuiteRooms = [] ) {
                return false
            } else { 
                return avalibleSuiteRooms
            }
        } catch (error) {
            console.error("Error querying DynamoDB:", error);
            return "no rooms avalible"
        }
    };

module.exports = { sigleRoomIDs, doubleRoomsIDs, suiteRoomsIDs };