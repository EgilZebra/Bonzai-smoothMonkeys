import { db } from "../../data";

const ResigleRoomIDs = async ( enkel, datum, oldBookingID ) => {
        let avalibleSingleRooms = [];

        try {
            for ( let i = 1 ; i < 11 ; i++ ) {
                const startDate = datum;


                const avalibleRoom = await db.query({
                    TableName: "Rooms",
                    KeyConditionExpression: "roomId = :roomId AND #date = :startDate",
                    ExpressionAttributeNames: {
                        "#date": "date"
                    },
                    ExpressionAttributeValues: {
                        ":roomId": String(i),
                        ":startDate": startDate,

                    }
                })
                
                if ( avalibleRoom.Count == 0 ) { 
                    avalibleSingleRooms.push(i)
                }

                if (avalibleRoom.Items && avalibleRoom.Items.length > 0) {
                    for (let item of avalibleRoom.Items) {
                        if (item.bookingId === oldBookingID) {
                            avalibleSingleRooms.push(i)
                        }
                    }
                }

            }
            if ( avalibleSingleRooms == [] ) {
                return false
            } else { 
                return avalibleSingleRooms
            }
            
        } catch (error) {
            console.error("Error querying DynamoDB:", error);
            return false
        }
    };


const RedoubleRoomsIDs = async ( dubbel, datum, oldBookingID) => {
        let avalibleDoubleRooms = [];


        try {
            for ( let i = 11 ; i < 16 ; i++ ) {
                const startDate = datum;

                const avalibleRoom = await db.query({
                    TableName: "Rooms",
                    KeyConditionExpression: "roomId = :roomId AND #date = :startDate ",
                    ExpressionAttributeNames: {
                        "#date": "date"
                    },
                    ExpressionAttributeValues: {
                        ":roomId": String(i),
                        ":startDate": startDate
                    }
                })

                if ( avalibleRoom.Count == 0 ) {
                    avalibleDoubleRooms.push(i)
                }

                if (avalibleRoom.Items && avalibleRoom.Items.length > 0) {
                    for (let item of avalibleRoom.Items) {
                        if (item.bookingId === oldBookingID) {
                            avalibleDoubleRooms.push(i)
                        }
                    }
                }
                
                

            }
            
            if ( avalibleDoubleRooms == [] ) {
                return false
            } else { 
                return avalibleDoubleRooms
            }

        } catch (error) {
            console.error("Error querying DynamoDB:", error);
            return false
        }
    };

const ResuiteRoomsIDs = async ( svit, datum , oldBookingID ) => {
        let avalibleSuiteRooms = [];

        try {
            for ( let i = 16 ; i < 21 ; i++ ) {
                const startDate = datum;
                const avalibleRoom = await db.query({
                    TableName: "Rooms",
                    KeyConditionExpression: "roomId = :roomId AND #date = :startDate ",
                    ExpressionAttributeNames: {
                        "#date": "date"
                    },
                    ExpressionAttributeValues: {
                        ":roomId": String(i),
                        ":startDate": startDate
                    }
                })
                
                if ( avalibleRoom.Count == 0  ) {
                    avalibleSuiteRooms.push(i)
                }

                if (avalibleRoom.Items && avalibleRoom.Items.length > 0) {
                    for (let item of avalibleRoom.Items) {
                        if (item.bookingId === oldBookingID) {
                            avalibleSuiteRooms.push(i)
                        }
                    }
                }


            }
        
            if ( avalibleSuiteRooms == [] ) {
                return false
            } else { 
                return avalibleSuiteRooms
            }
        } catch (error) {
            console.error("Error querying DynamoDB:", error);
            return false
        }
    };

module.exports = { ResigleRoomIDs, RedoubleRoomsIDs, ResuiteRoomsIDs };