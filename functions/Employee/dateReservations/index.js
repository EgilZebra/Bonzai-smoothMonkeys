const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
require("dotenv").config();

const client = new DynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const requestBody = JSON.parse(event.body);
  const date = requestBody.date;

  if (!date || !/^\d{6}$/.test(date)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message:
          "Invalid or missing date. Please provide a valid date in YYMMDD format.",
      }),
    };
  }

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

    const roomStatuses = data.Items.filter((item) => item.date === date).map(
      (item) => ({
        roomId: item.roomId,
        date: item.date,
        bookingId: item.bookingId || "Unknown",
      })
    );

    const totalAvailableRooms = {
      single: 10, // Room IDs 1-10
      double: 5, // Room IDs 11-15
      suite: 5, // Room IDs 16-20
    };

    const summary = {
      singleRoomsBooked: 0,
      doubleRoomsBooked: 0,
      suitesBooked: 0,
      totalBooked: 0,
    };

    roomStatuses.forEach((status) => {
      const roomId = parseInt(status.roomId);
      if (roomId >= 1 && roomId <= 10) {
        summary.singleRoomsBooked++;
      } else if (roomId >= 11 && roomId <= 15) {
        summary.doubleRoomsBooked++;
      } else if (roomId >= 16 && roomId <= 20) {
        summary.suitesBooked++;
      }
    });

    summary.totalBooked =
      summary.singleRoomsBooked +
      summary.doubleRoomsBooked +
      summary.suitesBooked;

    const calculatePercentage = (booked, total) =>
      total > 0 ? ((booked / total) * 100).toFixed(2) : 0;

    const percentageSummary = {
      singleRoomBookingPercentage: calculatePercentage(
        summary.singleRoomsBooked,
        totalAvailableRooms.single
      ),
      doubleRoomBookingPercentage: calculatePercentage(
        summary.doubleRoomsBooked,
        totalAvailableRooms.double
      ),
      suiteBookingPercentage: calculatePercentage(
        summary.suitesBooked,
        totalAvailableRooms.suite
      ),
      totalBookingPercentage: calculatePercentage(
        summary.totalBooked,
        totalAvailableRooms.single +
          totalAvailableRooms.double +
          totalAvailableRooms.suite
      ),
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Success",
        roomStatuses: roomStatuses,
        summary: {
          ...summary,
          ...percentageSummary,
        },
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
