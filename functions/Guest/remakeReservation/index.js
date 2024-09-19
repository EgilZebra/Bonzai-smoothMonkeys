// Import necessary modules
const { db } = require("../../../data/index.js"); // Assuming 'db-file' is where you define the DynamoDB connection.

// Define max capacity for each room type
const MAX_SINGLE_ROOM_CAPACITY = 1; // Single room can hold 1 guest
const MAX_DOUBLE_ROOM_CAPACITY = 2; // Double room can hold 2 guests
const MAX_SUITE_ROOM_CAPACITY = 3; // Suite can hold 3 guests

// Function to parse the API room input format (e.g., "1, 0, 1")
function parseApiRooms(roomsString) {
  const [singleRooms, doubleRooms, suites] = roomsString.split(",").map(Number);
  return { singleRooms, doubleRooms, suites };
}

// Function to parse the database room format (e.g., "1, 2, 3")
function parseDbRooms(roomsString) {
  const roomIds = roomsString.split(",").map(Number); // Room IDs from the database
  let singleRooms = 0;
  let doubleRooms = 0;
  let suites = 0;

  // Loop through each room ID and categorize it
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

// Function to check if the guest count is valid based on room selection
function isGuestCountValid(guests, rooms) {
  const { singleRooms, doubleRooms, suites } = rooms;

  // Calculate the total maximum capacity
  const totalCapacity =
    singleRooms * MAX_SINGLE_ROOM_CAPACITY +
    doubleRooms * MAX_DOUBLE_ROOM_CAPACITY +
    suites * MAX_SUITE_ROOM_CAPACITY;

  console.log(`Total Capacity: ${totalCapacity}, Guests: ${guests}`);

  // Return true if the total guests can fit within the total room capacity
  return guests <= totalCapacity;
}

// Function to compare original booking and new booking
function compareBookings(originalBooking, newBooking) {
  // Extract the room counts for original (DB) and new booking (API)
  const originalRooms = parseDbRooms(originalBooking.rooms); // Room IDs from DB
  const newRooms = parseApiRooms(newBooking.rooms); // Room counts from API

  // Compare room counts (new booking should have less or equal rooms)
  const isRoomValid =
    newRooms.singleRooms <= originalRooms.singleRooms &&
    newRooms.doubleRooms <= originalRooms.doubleRooms &&
    newRooms.suites <= originalRooms.suites;

  // Compare check-in and check-out dates (new booking dates should be the same or shorter)
  const isDateValid =
    new Date(newBooking.checkIn) >= new Date(originalBooking.checkIn) &&
    new Date(newBooking.checkOut) <= new Date(originalBooking.checkOut);

  // Return the appropriate message based on the comparison
  if (isRoomValid && isDateValid) {
    return "Only delete in Rooms is needed";
  } else {
    return "Need to do a new booking";
  }
}

// DynamoDB function to fetch booking by BookingId
async function getBookingById(BookingId) {
  const params = {
    TableName: "Bookings", // Name of the table in DynamoDB
    Key: { BookingId }, // Primary key of the table (assuming bookingId is the primary key)
  };

  try {
    // Perform a get operation using DynamoDBDocument client
    const result = await db.get(params);

    // If a booking is found, return the details
    if (result.Item) {
      return result.Item; // Return the booking item directly for further processing
    } else {
      // Return null if no booking is found
      return null;
    }
  } catch (error) {
    console.error("Error fetching booking:", error);
    throw new Error("An error occurred while fetching the booking.");
  }
}

// Lambda handler
exports.handler = async (event) => {
  try {
    // Parse the incoming event body
    const {
      BookingId,
      guests,
      rooms: roomsString,
      checkIn,
      checkOut,
    } = JSON.parse(event.body);

    // Parse API room input (new booking)
    const parsedApiRooms = parseApiRooms(roomsString);

    // Validate guest count per room
    if (!isGuestCountValid(guests, parsedApiRooms)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Too many guests for the selected rooms.",
        }),
      };
    }

    // Retrieve original booking using bookingId from the "Bookings" table
    const originalBooking = await getBookingById(BookingId);

    // Check if a booking was found
    if (!originalBooking) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "Booking not found.",
        }),
      };
    }

    // Create new booking object to compare (using the new booking details)
    const newBooking = {
      rooms: roomsString,
      checkIn,
      checkOut,
    };

    // Compare original booking and new booking
    const comparisonResult = compareBookings(originalBooking, newBooking);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: comparisonResult,
      }),
    };
  } catch (error) {
    console.error("Error in handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "An internal error occurred.",
      }),
    };
  }
};
