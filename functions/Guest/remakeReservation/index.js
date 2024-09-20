import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
require("dotenv").config();
const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

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
async function connectAndFetchBooking(BookingId) {
  const client = new DynamoDBClient({});
  const dynamoDb = DynamoDBDocumentClient.from(client);

  const getParams = {
    TableName: "Bookings",
    Key: { BookingId },
  };

  try {
    const originalBookingResult = await dynamoDb.send(
      new GetCommand(getParams)
    );
    return originalBookingResult.Item; // Return the fetched booking
  } catch (error) {
    console.error("Error fetching booking:", error);
    throw new Error("Database connection error.");
  }
}
function compareBookingsDayByDay(originalBooking, newBooking) {
  const results = [];

  // Helper function to generate an array of dates between checkIn and checkOut, excluding checkOut
  function getDatesArray(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);

    while (currentDate < new Date(endDate)) {
      dates.push(new Date(currentDate).toISOString().split("T")[0]); // Format as YYYY-MM-DD
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  // Get date ranges for both bookings, excluding the checkOut date
  const originalBookingDates = getDatesArray(
    originalBooking.checkIn,
    originalBooking.checkOut
  );
  const newBookingDates = getDatesArray(
    newBooking.checkIn,
    newBooking.checkOut
  );

  // Find the union of the two date ranges (to compare both date ranges)
  const allDates = new Set([...originalBookingDates, ...newBookingDates]);

  // Split room strings into arrays for easy comparison
  const originalRoomsArray = originalBooking.rooms.split(",").map(Number);
  const newRoomsArray = newBooking.rooms.split(",").map(Number);

  // Iterate through each date and calculate the room differences
  allDates.forEach((date) => {
    const originalHasDate = originalBookingDates.includes(date);
    const newHasDate = newBookingDates.includes(date);

    if (originalHasDate && newHasDate) {
      // Calculate differences in room counts
      const roomDifferences = originalRoomsArray.map(
        (roomCount, index) => newRoomsArray[index] - roomCount
      );

      results.push({
        date,
        rooms: roomDifferences.join(","),
      });
    } else {
      // If one of the bookings doesn't include this date, you can choose how to handle it.
      // For now, we will just ignore it, but you could log a difference if needed.
    }
  });

  // If no results were found, return an appropriate message
  if (results.length === 0) {
    return { error: "No differences found between the bookings." };
  } else {
    return results;
  }
}
async function fetchDateBooking(date) {
  const client = new DynamoDBClient({});
  const dynamoDb = DynamoDBDocumentClient.from(client);

  console.log("Fetching bookings for date:", date);

  const getParams = {
    TableName: "Rooms",
    FilterExpression: "#d = :date",
    ExpressionAttributeNames: {
      "#d": "date", // Use a placeholder for the reserved keyword
    },
    ExpressionAttributeValues: {
      ":date": date,
    },
  };

  try {
    const result = await dynamoDb.send(new ScanCommand(getParams));
    console.log("Scan Result:", JSON.stringify(result, null, 2));
    const bookings = result.Items || [];

    // Initialize room counts
    let singleRoomsBooked = 0;
    let doubleRoomsBooked = 0;
    let suitesBooked = 0;

    // Calculate booked rooms
    bookings.forEach((booking) => {
      const roomId = booking.roomId;
      if (roomId >= 1 && roomId <= 10) {
        singleRoomsBooked++;
      } else if (roomId >= 11 && roomId <= 15) {
        doubleRoomsBooked++;
      } else if (roomId >= 16 && roomId <= 20) {
        suitesBooked++;
      }
    });

    // Total capacity for each room type
    const totalSingleRooms = 10; // IDs 1-10
    const totalDoubleRooms = 5; // IDs 11-15
    const totalSuites = 5; // IDs 16-20

    // Calculate available rooms
    const availableSingleRooms = totalSingleRooms - singleRoomsBooked;
    const availableDoubleRooms = totalDoubleRooms - doubleRoomsBooked;
    const availableSuites = totalSuites - suitesBooked;

    // Format the result as rooms("availableSingle,availableDouble,availableSuites")
    const roomStatus = `${availableSingleRooms},${availableDoubleRooms},${availableSuites}`;
    return roomStatus;
  } catch (error) {
    console.error("Error fetching bookings:", error);
    throw new Error("Database connection error: " + error.message);
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

    const newBooking = {
      BookingId,
      guests,
      rooms: roomsString,
      checkIn,
      checkOut,
    };

    // Validate guest count
    const parsedApiRooms = parseApiRooms(roomsString);
    if (!isGuestCountValid(guests, parsedApiRooms)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Guest count not valid" }),
      };
    }

    // Fetch the original booking info
    const originalBooking = await connectAndFetchBooking(BookingId);
    if (!originalBooking) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: `No booking found with BookingId ${BookingId}.`,
        }),
      };
    }

    // Convert originalBooking from booked room IDs to booked room types
    const parsedOriginalRooms = parseDbRooms(originalBooking.rooms);
    const convertedRoomsString = `${parsedOriginalRooms.singleRooms},${parsedOriginalRooms.doubleRooms},${parsedOriginalRooms.suites}`;
    const convertedBooking = {
      ...originalBooking,
      rooms: convertedRoomsString,
    };

    //compare originalBooking and newBooking
    const comparisonResults = compareBookingsDayByDay(
      convertedBooking,
      newBooking
    );
    /**   if (comparisonResults.error) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No changes in new booking" }),
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({ changes: comparisonResults }),
      };
    }
       */

    // fetch freeRooms rooms("1,2,3 ") for a specific date
    const date = "2024-01-02";
    bookingsDate = await fetchDateBooking(date);

    return {
      statusCode: 200,
      body: JSON.stringify({ roomStatus: bookingsDate }),
    };

    /** 
    return {
      statusCode: 200,
      body: JSON.stringify({ originalBookingConverted: convertedBooking }),
    };

    return {
      statusCode: 200,
      body: JSON.stringify({ changes: comparisonResults }),
    };
    */
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
