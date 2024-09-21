import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  BatchWriteItemCommand,
  BatchWriteCommand,
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

  return { singleRooms, doubleRooms, suites };
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

  return { valid: isRoomValid && isDateValid, originalRooms, newRooms };
}

function compareBookingsDayByDay(originalBooking, newBooking) {
  const results = [];

  function getDatesArray(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);

    while (currentDate < new Date(endDate)) {
      dates.push(new Date(currentDate).toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  const originalBookingDates = getDatesArray(
    originalBooking.checkIn,
    originalBooking.checkOut
  );
  const newBookingDates = getDatesArray(
    newBooking.checkIn,
    newBooking.checkOut
  );

  const allDates = new Set([...originalBookingDates, ...newBookingDates]);
  const originalRoomsArray = originalBooking.rooms.split(",").map(Number);
  const newRoomsArray = newBooking.rooms.split(",").map(Number);

  allDates.forEach((date) => {
    const originalHasDate = originalBookingDates.includes(date);
    const newHasDate = newBookingDates.includes(date);

    if (originalHasDate && newHasDate) {
      const roomDifferences = originalRoomsArray.map(
        (roomCount, index) => newRoomsArray[index] - roomCount
      );

      results.push({
        date,
        rooms: roomDifferences.join(","),
      });
    }
  });

  return results.length === 0
    ? { error: "No differences found between the bookings." }
    : results;
}

async function fetchDateBooking(date, format = "type") {
  const getParams = {
    TableName: "Rooms",
    FilterExpression: "#d = :date",
    ExpressionAttributeNames: {
      "#d": "date",
    },
    ExpressionAttributeValues: {
      ":date": date,
    },
  };

  console.log("Fetching bookings for date:", date);
  try {
    const result = await dynamoDb.send(new ScanCommand(getParams));
    const bookings = result.Items || [];

    // Keep track of booked room IDs as strings
    let bookedRoomIds = new Set();

    // Collect all room IDs from the bookings
    bookings.forEach((booking) => {
      bookedRoomIds.add(booking.roomId); // roomId is a string
    });

    // Define total room IDs by type (as strings)
    const totalSingleRoomIds = Array.from({ length: 10 }, (_, i) =>
      (i + 1).toString()
    ); // ["1", "2", ..., "10"]
    const totalDoubleRoomIds = Array.from({ length: 5 }, (_, i) =>
      (i + 11).toString()
    ); // ["11", "12", ..., "15"]
    const totalSuiteRoomIds = Array.from({ length: 5 }, (_, i) =>
      (i + 16).toString()
    ); // ["16", "17", ..., "20"]

    // Calculate free room IDs
    const availableSingleRoomIds = totalSingleRoomIds.filter(
      (id) => !bookedRoomIds.has(id)
    );
    const availableDoubleRoomIds = totalDoubleRoomIds.filter(
      (id) => !bookedRoomIds.has(id)
    );
    const availableSuiteRoomIds = totalSuiteRoomIds.filter(
      (id) => !bookedRoomIds.has(id)
    );

    if (format === "ids") {
      // Return free room IDs as a single string
      const allAvailableRoomIds = [
        ...availableSingleRoomIds,
        ...availableDoubleRoomIds,
        ...availableSuiteRoomIds,
      ];
      return allAvailableRoomIds.join(",");
    } else {
      // Default: return the count of free rooms by type
      const availableSingleRooms = availableSingleRoomIds.length;
      const availableDoubleRooms = availableDoubleRoomIds.length;
      const availableSuites = availableSuiteRoomIds.length;

      return `${availableSingleRooms},${availableDoubleRooms},${availableSuites}`;
    }
  } catch (error) {
    console.error("Error fetching bookings:", error);
    throw new Error("Database connection error: " + error.message);
  }
}

async function checkBookingPossible(comparisonResults) {
  for (const change of comparisonResults) {
    const { date, rooms } = change;
    const requiredRooms = rooms.split(",").map(Number); // Room differences to be accommodated

    console.log(`Checking rooms for date: ${date}`);
    console.log(`Required rooms: ${requiredRooms}`);

    // Fetch available rooms for the specific date
    const availableRoomsString = await fetchDateBooking(date);
    const availableRooms = availableRoomsString.split(",").map(Number);

    console.log(`Available rooms on ${date}: ${availableRooms}`);

    // Compare required vs available rooms for each room type
    for (let i = 0; i < requiredRooms.length; i++) {
      if (requiredRooms[i] > availableRooms[i]) {
        console.log(
          `Not enough rooms for date ${date}: Required ${requiredRooms[i]}, Available ${availableRooms[i]}`
        );
        return false; // If not enough rooms are available, return false
      } else {
        console.log(
          `Enough rooms for date ${date}: Required ${requiredRooms[i]}, Available ${availableRooms[i]}`
        );
      }
    }
  }

  // If all required rooms can be accommodated, return true
  return true;
}

async function connectAndFetchBooking(BookingId) {
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

async function bookNewRooms(comparisonResults, BookingId) {
  const roomIdMappings = {
    single: Array.from({ length: 10 }, (_, i) => i + 1), // Room IDs 1-10
    double: Array.from({ length: 5 }, (_, i) => i + 11), // Room IDs 11-15
    suite: Array.from({ length: 5 }, (_, i) => i + 16), // Room IDs 16-20
  };

  const bookedRooms = [];

  for (const change of comparisonResults) {
    const { date, rooms } = change;
    const requiredRooms = rooms.split(",").map(Number);

    // Fetch available room IDs for the specific date
    const availableRoomIdsString = await fetchDateBooking(date, "ids");
    const availableRoomIds = new Set(
      availableRoomIdsString.split(",").map(Number)
    );

    // Book the required number of rooms
    for (let i = 0; i < requiredRooms.length; i++) {
      const roomType = i === 0 ? "single" : i === 1 ? "double" : "suite";
      const availableRoomIdsOfType = roomIdMappings[roomType].filter((id) =>
        availableRoomIds.has(id)
      );

      // Book the required number of rooms
      for (let j = 0; j < requiredRooms[i]; j++) {
        const availableRoomId = availableRoomIdsOfType[j]; // Get the next available room ID
        if (availableRoomId) {
          bookedRooms.push({
            roomId: availableRoomId,
            BookingId,
            date,
          });
        } else {
          console.log(
            `Not enough available ${roomType} rooms for date ${date}.`
          );
        }
      }
    }
  }

  // Check if any rooms were booked
  if (bookedRooms.length === 0) {
    console.log(`No rooms booked for the given dates.`);
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: "No rooms available to book.",
      }),
    };
  }

  // Insert bookings into DynamoDB
  const putRequests = bookedRooms.map((room) => ({
    PutRequest: {
      Item: {
        roomId: room.roomId.toString(), // Ensure roomId is a string
        date: room.date,
        BookingId: room.BookingId,
      },
    },
  }));

  const params = {
    RequestItems: {
      Rooms: putRequests, // The table name for the bookings
    },
  };

  try {
    await dynamoDb.send(new BatchWriteCommand(params)); // Use BatchWriteCommand
    console.log("Rooms booked successfully:", bookedRooms);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Rooms booked successfully",
        bookedRooms,
      }),
    };
  } catch (error) {
    console.error("Error booking rooms:", error);
    throw new Error("Booking failed: " + error.message);
  }
}

exports.handler = async (event) => {
  //fetch variables from API-call
  try {
    const {
      BookingId,
      guests,
      rooms: roomsString,
      checkIn,
      checkOut,
    } = JSON.parse(event.body);

    //create object for newBooking => {}
    const newBooking = {
      BookingId,
      guests,
      rooms: roomsString,
      checkIn,
      checkOut,
    };

    // Validate guest count => true/ false
    const parsedApiRooms = parseApiRooms(roomsString);
    if (!isGuestCountValid(guests, parsedApiRooms)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Guest count not valid" }),
      };
    }

    // Fetch the original booking => [{}]
    const originalBooking = await connectAndFetchBooking(BookingId);
    if (!originalBooking) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: `No booking found with BookingId ${BookingId}.`,
        }),
      };
    }

    // Convert roomIds in originalBooking to amount of rooms for each roomType => ("1, 2, 3")
    const parsedOriginalRooms = parseDbRooms(originalBooking.rooms);
    const convertedRoomsString = `${parsedOriginalRooms.singleRooms},${parsedOriginalRooms.doubleRooms},${parsedOriginalRooms.suites}`;
    const convertedBooking = {
      ...originalBooking,
      rooms: convertedRoomsString,
    };

    //compare originalBooking w newBooking => [{"YYYY-MM-DD", "1, 2, 3"}, {"YYYY-MM-DD", "1, 2, 3"}]
    const comparisonResults = compareBookingsDayByDay(
      convertedBooking,
      newBooking
    );
    if (comparisonResults.error) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "No changes in new booking" }),
      };
    }

    /**
    // freeRooms specific date => "1, 2, 3"
    const mockDate = "2024-01-01";
    const freeRoomsDate = await fetchDateBooking(mockDate, "ids");

    return {
      statusCode: 202,
      body: JSON.stringify({
        msg: freeRoomsDate,
      }),
    };
    */

    // Check if all roomTypes & dates are free.
    const bookingIsPossible = await checkBookingPossible(comparisonResults);
    if (!bookingIsPossible) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Not enough freeRooms to make booking",
        }),
      };
    }

    // Try to book all the roomTypes in the newBooking. Error-return is in the function bookNewRooms.
    // If it return here it means the booking went through.
    const bookedRooms = await bookNewRooms(comparisonResults, BookingId);
    console.log("Successfully booked rooms:", bookedRooms);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Successfully booked rooms:",
        bookedRooms: bookedRooms,
      }),
    };
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
