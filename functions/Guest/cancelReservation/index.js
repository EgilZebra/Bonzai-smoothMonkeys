import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
require("dotenv").config();

const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const { bookingId } = JSON.parse(event.body);

  if (!bookingId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "BookingId is required.",
      }),
    };
  }

  const getParams = {
    TableName: "Bookings",
    Key: {
      BookingId: bookingId,
    },
  };

  try {
    const result = await dynamoDb.send(new GetCommand(getParams));

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: `No booking found with BookingId ${bookingId}.`,
        }),
      };
    }

    const scanParams = {
      TableName: "Rooms",
      FilterExpression: "bookingId = :bookingId",
      ExpressionAttributeValues: {
        ":bookingId": bookingId,
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
        BookingId: bookingId,
      },
    };

    await dynamoDb.send(new DeleteCommand(deleteBookingParams));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Booking with BookingId ${bookingId} was successfully deleted, and ${scanResult.Items.length} rooms were removed.`,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "An error occurred while processing the booking.",
        error: error.message,
      }),
    };
  }
};
