// Import necessary modules

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
  // guets: string, rooms: [ number, number, number ], checkIn: Date, checkOut: Date, name: String, emil: String
  const {
    bookingId,
    guests,
    rooms: roomsString,
    checkIn,
    checkOut,
  } = JSON.parse(event.body);

  //reformat rooms from string to array to be able to calc if number of guests compared to rooms is valid.
  const rooms = parseRooms(roomsString);

  // kontrollera att antalet gäster per rum ej är för mkt
  // Check that the number of guests per room is not too many
  if (!isGuestCountValid(guests, rooms)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Too many guests for the selected rooms.",
      }),
    };
  } else {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Guest count is valid.",
      }),
    };
  }

  // hämta orginal-bokningen med hjälp av bookingId i table Bookings

  // ändra till mindre nätter, antal rum etc. => DELETE.

  //bryter ut alla nätter rum som är utöver orginal-bokningen
  //roomstyp + datum => loopa igenom
};
//Planera
//Antal gäster
//Vilka rumstyper och antal
//Datum för in-och utcheckning
