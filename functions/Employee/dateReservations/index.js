const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
require("dotenv").config();

const client = new DynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME_ROOMS;

exports.handler = async (event) => {
  try {
    const params = {
      TableName: "Rooms",
    };

    const data = await ddbDocClient.send(new ScanCommand(params));

    if (!data.Items || data.Items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "No entries found in the Rooms table.",
        }),
      };
    }

    const roomStatuses = data.Items.map((item) => ({
      roomId: item.roomId,
      date: item.date,
      bookingId: item.bookingId || "Unknown",
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Success",
        roomStatuses: roomStatuses, // Return as an array of objects
      }),
    };
  } catch (error) {
    console.error("Error retrieving room entries:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error retrieving room entries.",
        error: error.message,
      }),
    };
  }
};
