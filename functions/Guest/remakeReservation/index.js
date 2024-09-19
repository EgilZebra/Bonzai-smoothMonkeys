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
      return {
        statusCode: 200,
        body: JSON.stringify(result.Item),
      };
    } else {
      // Return 404 if no booking is found
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Booking not found." }),
      };
    }
  } catch (error) {
    console.error("Error fetching booking:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "An error occurred while fetching the booking.",
      }),
    };
  }
}

// Define max capacity for each room type
const MAX_SINGLE_ROOM_CAPACITY = 1; // Single room can hold 1 guest
const MAX_DOUBLE_ROOM_CAPACITY = 2; // Double room can hold 2 guests
const MAX_SUITE_ROOM_CAPACITY = 3; // Suite can hold 3 guests

// Function to check if the guest count is valid
function isGuestCountValid(guests, rooms) {
  const [singleRooms, doubleRooms, suites] = rooms;

  // Calculate the total maximum capacity
  const totalCapacity =
    singleRooms * MAX_SINGLE_ROOM_CAPACITY +
    doubleRooms * MAX_DOUBLE_ROOM_CAPACITY +
    suites * MAX_SUITE_ROOM_CAPACITY;

  // Check if the number of guests exceeds total capacity
  if (guests > totalCapacity) {
    return false; // Guests exceed room capacity
  }

  return true; // Guests fit within the room capacity
}

function parseRooms(roomsString) {
  // Convert the string "1,0,0" into an array of numbers [1, 0, 0]
  return roomsString.split(",").map(Number);
}

exports.handler = async (event) => {
  // Parse the incoming event body
  const {
    BookingId,
    guests,
    rooms: roomsString,
    checkIn,
    checkOut,
  } = JSON.parse(event.body);

  // Reformat rooms from string to array to be able to calc if number of guests compared to rooms is valid
  const rooms = parseRooms(roomsString);

  // Validate guest count per room
  if (!isGuestCountValid(guests, rooms)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Too many guests for the selected rooms.",
      }),
    };
  }

  // Retrieve original booking using bookingId from the "Bookings" table
  const bookingResponse = await getBookingById(BookingId);

  //check if there is a Booking w the bookingRef
  if (!bookingResponse) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Booking not found",
      }),
    };
  } else {
    // Kontrollera om bokning är samma eller mindre, då kan vi bara köra delete
    // 1. omvandla rumsnummer till rumstyp, 1-10 => single, 11-15=> double, 16-20 => suite
    // 2. jämföra varje rumstyp och dateRange, är allt samma eller mindre i ombokningen ska vi köra en delete av entries i Rooms
    return {
      statusCode: 200,
      body: JSON.stringify({
        bookingResponse,
      }),
    };
  }

  //bryter ut alla nätter rum som är utöver orginal-bokningen
  //kontrollera om de är ledia en efter en. ALLA lediga = boka med samma bokRef
  //roomstyp + datum => loopa igenom
};
