import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  DeleteCommand
} from "@aws-sdk/lib-dynamodb";
require("dotenv").config();

const deleteBooking = async ( BookingId) => {
    const scanParams = {
        TableName: "Rooms",
        FilterExpression: "bookingId = :bookingId",
        ExpressionAttributeValues: {
        ":bookingId": BookingId,
        },
    };

    const scanResult = await dynamoDb.send(new ScanCommand(scanParams));

    if (scanResult.Items && scanResult.Items.length > 0) {
        for (const item of scanResult.Items) {
        const deleteRoomParams = {
            TableName: "Rooms",
            Key: {
            roomId: item.roomId,
            date: item.date,
            },
        };

        await dynamoDb.send(new DeleteCommand(deleteRoomParams));
        }
    }

    const deleteBookingParams = {
        TableName: "Bookings",
        Key: {
        BookingId: BookingId,
        },
    };

    await dynamoDb.send(new DeleteCommand(deleteBookingParams));
    
}
module.exports = { deleteBooking }