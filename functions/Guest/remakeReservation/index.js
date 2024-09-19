import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
require("dotenv").config();

function parseApiRooms(roomsString) {
  const [singleRooms, doubleRooms, suites] = roomsString.split(",").map(Number);
  return { singleRooms, doubleRooms, suites };
}

function parseDbRooms(roomsString) {
  const roomIds = roomsString.split(",").map(Number);
  let singleRooms = 0;
  let doubleRooms = 0;
  let suites = 0;

  roomIds.forEach((roomId) => {
    if (roomId >= 1 && roomId <= 10) {
      singleRooms++;
    } else if (roomId >= 11 && roomId <= 15) {
      doubleRooms++;
    } else if (roomId >= 16 && roomId <= 20) {
      suites++;
    }
  });

  return {
    singleRooms,
    doubleRooms,
    suites,
  };
}
function isGuestCountValid(guests, rooms) {
  const MAX_SINGLE_ROOM_CAPACITY = 1;
  const MAX_DOUBLE_ROOM_CAPACITY = 2;
  const MAX_SUITE_ROOM_CAPACITY = 3;
  const { singleRooms, doubleRooms, suites } = rooms;
  const totalCapacity =
    singleRooms * MAX_SINGLE_ROOM_CAPACITY +
    doubleRooms * MAX_DOUBLE_ROOM_CAPACITY +
    suites * MAX_SUITE_ROOM_CAPACITY;

  console.log(`Total Capacity: ${totalCapacity}, Guests: ${guests}`);
  return guests <= totalCapacity;
}
function compareBookings(originalBooking, newBooking) {
  const originalRooms = parseDbRooms(originalBooking.rooms);
  const newRooms = parseApiRooms(newBooking.rooms);

  const isRoomValid =
    newRooms.singleRooms <= originalRooms.singleRooms &&
    newRooms.doubleRooms <= originalRooms.doubleRooms &&
    newRooms.suites <= originalRooms.suites;

  const isDateValid =
    new Date(newBooking.checkIn) >= new Date(originalBooking.checkIn) &&
    new Date(newBooking.checkOut) <= new Date(originalBooking.checkOut);

  if (isRoomValid && isDateValid) {
    return { valid: true, originalRooms, newRooms };
  } else {
    return { valid: false, originalRooms, newRooms };
  }
}
function calculateRoomsToDelete(originalRooms, newRooms) {
  return {
    singleRoomsToDelete: Math.max(
      0,
      originalRooms.singleRooms - newRooms.singleRooms
    ),
    doubleRoomsToDelete: Math.max(
      0,
      originalRooms.doubleRooms - newRooms.doubleRooms
    ),
    suitesToDelete: Math.max(0, originalRooms.suites - newRooms.suites),
  };
}
async function deleteRoomsFromDb(roomsToDelete, BookingId) {
  const deletePromises = [];

  // Deleting single rooms
  for (let i = 1; i <= roomsToDelete.singleRoomsToDelete; i++) {
    const roomId = i; // IDs 1-10 for single rooms
    deletePromises.push(deleteRoom(roomId, BookingId));
  }

  // Deleting double rooms
  for (let i = 11; i <= 11 + roomsToDelete.doubleRoomsToDelete - 1; i++) {
    const roomId = i; // IDs 11-15 for double rooms
    deletePromises.push(deleteRoom(roomId, BookingId));
  }

  // Deleting suites
  for (let i = 16; i <= 16 + roomsToDelete.suitesToDelete - 1; i++) {
    const roomId = i; // IDs 16-20 for suites
    deletePromises.push(deleteRoom(roomId, BookingId));
  }

  await Promise.all(deletePromises);
}
async function deleteRoom(roomId, BookingId) {
  const params = {
    TableName: "Rooms",
    Key: { roomId, BookingId }, // Adjust the key structure as needed
  };

  try {
    await db.delete(params).promise();
    console.log(`Deleted room ${roomId} for booking ${BookingId}`);
  } catch (error) {
    console.error("Error deleting room:", error);
  }
}

const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const {
      BookingId,
      guests,
      rooms: roomsString,
      checkIn,
      checkOut,
    } = JSON.parse(event.body);

    // Validate guest count
    const parsedApiRooms = parseApiRooms(roomsString);
    if (!isGuestCountValid(guests, parsedApiRooms)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Guest count not valid",
        }),
      };
    }

    // Check if the database connection is up
    // In practice, this is done by attempting a simple command (like Get or Scan)
    try {
      await dynamoDb.send(
        new GetCommand({ TableName: "Bookings", Key: { BookingId } })
      );
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Database connection error.",
        }),
      };
    }

    // Fetch the original booking info
    const getParams = {
      TableName: "Bookings",
      Key: {
        BookingId,
      },
    };

    const originalBookingResult = await dynamoDb.send(
      new GetCommand(getParams)
    );
    const originalBooking = originalBookingResult.Item;

    if (!originalBookingResult.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: `No booking found with BookingId ${BookingId}.`,
        }),
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({
          originalBooking,
        }),
      };
    }

    // Here you would continue with your validation logic...

    // Proceed with the rest of your logic...
  } catch (error) {
    console.error("Error in handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "An internal error occurred.",
        message: error.message,
      }),
    };
  }
};

// Your existing functions: parseApiRooms, parseDbRooms, isGuestCountValid, etc.
