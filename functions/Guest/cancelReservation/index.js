import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";

dotenv.config();

// Initialize the DynamoDB client
const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client); // Use DocumentClient for easier JSON handling

exports.handler = async (event) => {
  // Extract the bookingId from the event body (assuming event is in JSON format)
  const { bookingId } = JSON.parse(event.body);

  if (!bookingId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "BookingId is required.",
      }),
    };
  }

  // Define parameters for the GetCommand
  const getParams = {
    TableName: "Bookings", // Replace with your actual table name
    Key: {
      BookingId: bookingId, // The primary key
    },
  };

  try {
    // Query the DynamoDB table using GetCommand to check if the booking exists
    const result = await dynamoDb.send(new GetCommand(getParams));

    if (result.Item) {
      // If booking exists, define parameters for the DeleteCommand
      const deleteParams = {
        TableName: "Bookings",
        Key: {
          BookingId: bookingId, // The primary key to delete
        },
      };

      // Delete the booking entry
      await dynamoDb.send(new DeleteCommand(deleteParams));

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `Booking with BookingId ${bookingId} was successfully deleted.`,
        }),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: `No booking found with BookingId ${bookingId}.`,
        }),
      };
    }
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
