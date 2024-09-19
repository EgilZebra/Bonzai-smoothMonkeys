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

exports.handler = async (event) => {
  // guets: string, rooms: [ number, number, number ], checkIn: Date, checkOut: Date, name: String, emil: String
  const { bookingId, guests, rooms, checkIn, checkOut } = JSON.parse(
    event.body
  );
  //rooms = "1,2,0"

  // kontrollera att antalet gäster per rum ej är för mkt
  if (!isGuestCountValid(guests, rooms)) {
    return responseMaker(400, {
      error: "Too many guests for the selected rooms.",
    });
  } else {
    return {
      message: "guest okay",
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
