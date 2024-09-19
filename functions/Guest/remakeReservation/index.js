const { db } = require("../../../data/index.js");

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
async function getBookingById(BookingId) {
  console.log("Fetching booking with ID:", BookingId);

  const params = {
    TableName: "Bookings",
    Key: { BookingId }, // Ensure this is correctly formatted
  };

  try {
    const result = await db.get(params).promise();
    console.log("Params sent to DynamoDB:", params);
    console.log("Booking fetched:", result.Item);

    return result.Item || null;
  } catch (error) {
    console.error("Error fetching booking from DynamoDB:", error); // More specific log
    throw new Error("An error occurred while fetching the booking.");
  }
}

exports.handler = async (event) => {
  try {
    const {
      BookingId,
      guests,
      rooms: roomsString,
      checkIn,
      checkOut,
    } = JSON.parse(event.body);

    BookingId = "test1234";

    // Check if the number of guests is valid
    const parsedApiRooms = parseApiRooms(roomsString);
    if (!isGuestCountValid(guests, parsedApiRooms)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Guest count not valid",
        }),
      };
    }

    // Get the original booking
    const originalBooking = await getBookingById(BookingId);

    if (originalBooking) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Booking found.",
          booking: originalBooking,
        }),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "Booking NOT found.",
        }),
      };
    }
  } catch (error) {
    console.error("Error in handler:", error); // Log the full error object
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "An internal error occurred.",
        message: error.message, // Include the error message for debugging
      }),
    };
  }
};
