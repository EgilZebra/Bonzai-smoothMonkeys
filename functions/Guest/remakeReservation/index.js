// Import necessary modules
const { db } = require("../../../data/index.js"); // Assuming 'db-file' is where you define the DynamoDB connection.

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
      // Return 404 if no booking is found
      return null;
    }
  } catch (error) {
    console.error("Error fetching booking:", error);
    throw new Error("An error occurred while fetching the booking.");
  }
}

// Define max capacity for each room type
const MAX_SINGLE_ROOM_CAPACITY = 1; // Single room can hold 1 guest
const MAX_DOUBLE_ROOM_CAPACITY = 2; // Double room can hold 2 guests
const MAX_SUITE_ROOM_CAPACITY = 3; // Suite can hold 3 guests

// Function to check if the guest count is valid
function isGuestCountValid(guests, rooms) {
  const { singleRooms, doubleRooms, suites } = rooms;

  // Calculate the total maximum capacity
  const totalCapacity =
    singleRooms * MAX_SINGLE_ROOM_CAPACITY +
    doubleRooms * MAX_DOUBLE_ROOM_CAPACITY +
    suites * MAX_SUITE_ROOM_CAPACITY;

  // Check if the number of guests exceeds total capacity
  return guests <= totalCapacity; // Return true if guests fit within the room capacity
}

// Function to categorize rooms into single, double, and suites based on the room number
function categorizeRooms(roomsString) {
  const roomsArray = roomsString.split(",").map(Number); // Split the string into an array of numbers
  let singleRooms = 0;
  let doubleRooms = 0;
  let suites = 0;

  // Loop through each room number and categorize it
  roomsArray.forEach((roomNumber) => {
    if (roomNumber >= 1 && roomNumber <= 10) {
      singleRooms++;
    } else if (roomNumber >= 11 && roomNumber <= 15) {
      doubleRooms++;
    } else if (roomNumber >= 16 && roomNumber <= 20) {
      suites++;
    }
  });

  return {
    singleRooms,
    doubleRooms,
    suites,
  };
}

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

    // Categorize rooms from the incoming roomsString
    const categorizedRooms = categorizeRooms(roomsString);

    // Validate guest count per room
    if (!isGuestCountValid(guests, categorizedRooms)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Too many guests for the selected rooms.",
        }),
      };
    }

    // Retrieve original booking using bookingId from the "Bookings" table
    const booking = await getBookingById(BookingId);

    // Check if a booking was found
    if (!booking) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "Booking not found.",
        }),
      };
    }

    // Extract rooms from the booking and categorize them
    const originalRoomsString = booking.rooms;
    const originalCategorizedRooms = categorizeRooms(originalRoomsString);

    // For now, you can compare the original booking's categorized rooms with the new one if needed
    // Here, you might add logic for further room comparison, validation, or changes.
    // Example: comparing room types or handling updates based on the original booking.

    return {
      statusCode: 200,
      body: JSON.stringify({
        booking,
        originalCategorizedRooms,
        newCategorizedRooms: categorizedRooms, // Newly categorized rooms for comparison
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
