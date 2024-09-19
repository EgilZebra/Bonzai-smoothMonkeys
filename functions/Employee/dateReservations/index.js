const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
require("dotenv").config();

const client = new DynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    // Define the parameters to scan the Bookings table
    const params = {
      TableName: "Bookings",
    };

    // Retrieve all bookings from the Bookings table
    const data = await ddbDocClient.send(new ScanCommand(params));

    if (!data.Items || data.Items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "No bookings found in the Bookings table.",
        }),
      };
    }

    // Map the data to only include the required fields
    const bookings = data.Items.map((item) => ({
      BookingId: item.BookingId || "Unknown",
      checkIn: item.checkIn || "Unknown",
      checkOut: item.checkOut || "Unknown",
      guests: item.guests || 0,
      rooms: item.rooms || [],
      name: item.name || "Unknown",
    }));

    // Sort bookings by checkIn date (oldest first)
    bookings.sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Success",
        bookings: bookings,
      }),
    };
  } catch (error) {
    console.error("Error retrieving bookings:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error retrieving bookings.",
        error: error.message,
      }),
    };
  }
};
