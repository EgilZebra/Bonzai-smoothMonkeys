import { db } from "../../data";

const sigleRoomIDs = async ( enkel, checkIn, checkOut ) => {
        let avalibleSingleRooms = [];
        for ( i = 0 ; i < enkel ; i++ ) {
            for ( j = 1 ; j < 11 ; j++ ) {
                const avalibleRoom = await db.query({
                    TableName: "Rooms",
                    KeyConditionExpression: "roomId = :roomId AND date BETWEEN :startDate AND :endDate ",
                    ExpressionAttributeValues: {
                        ":roomId": j,
                        ":startDate": checkIn,
                        ":endDate": checkOut
                    }

                })
                if (avalibleRoom.Items && avalibleRoom.Items.length === 0) {
                    avalibleSingleRooms.push(j)
                }
            }
        }
    return avalibleSingleRooms
    };


const doubleRoomsIDs = async ( dubbel, checkIn, checkOut ) => {
        let avalibleDoubleRooms = [];
        for ( i = 0 ; i < dubbel ; i++ ) {
            for ( j = 11 ; j < 16 ; j++ ) {
                const avalibleRoom = await db.query({
                    TableName: "Rooms",
                    KeyConditionExpression: "roomId = :roomId AND date BETWEEN :startDate AND :endDate ",
                    ExpressionAttributeValues: {
                        ":roomId": j,
                        ":startDate": checkIn,
                        ":endDate": checkOut
                    }
                })
                if (avalibleRoom.Items && avalibleRoom.Items.length === 0) {
                    avalibleDoubleRooms.push(j)
                }
            }
        }
    return avalibleDoubleRooms;
    };


const suiteRoomsIDs = async ( svit, checkIn, checkOut ) => {
        let avalibleSuiteRooms = [];
        for ( i = 0 ; i < svit ; i++ ) {
            for ( j = 16 ; j < 21 ; j++ ) {
                const avalibleRoom = await db.query({
                    TableName: "Rooms",
                    KeyConditionExpression: "roomId = :roomId AND date BETWEEN :startDate AND :endDate ",
                    ExpressionAttributeValues: {
                        ":roomId": j,
                        ":startDate": checkIn,
                        ":endDate": checkOut
                    }
                })
                if (avalibleRoom.Items && avalibleRoom.Items.length === 0) {
                    avalibleSuiteRooms.push(j)
                }
            }
        }
    return avalibleSuiteRooms
    };

module.exports = { sigleRoomIDs, doubleRoomsIDs, suiteRoomsIDs };