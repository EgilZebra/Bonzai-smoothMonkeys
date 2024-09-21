import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
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

async function fetchDateBooking(date) {
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

    let singleRoomsBooked = 0;
    let doubleRoomsBooked = 0;
    let suitesBooked = 0;

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

    const totalSingleRooms = 10;
    const totalDoubleRooms = 5;
    const totalSuites = 5;

    const availableSingleRooms = totalSingleRooms - singleRoomsBooked;
    const availableDoubleRooms = totalDoubleRooms - doubleRoomsBooked;
    const availableSuites = totalSuites - suitesBooked;

    return `${availableSingleRooms},${availableDoubleRooms},${availableSuites}`;
  } catch (error) {
    console.error("Error fetching bookings:", error);
    throw new Error("Database connection error: " + error.message);
  }
}

async function checkBookingPossible(comparisonResults) {
  for (const change of comparisonResults) {
    const { date, rooms } = change;
    const requiredRooms = rooms.split(",").map(Number);

    const availableRoomsString = await fetchDateBooking(date);
    const availableRooms = availableRoomsString.split(",").map(Number);

    for (let i = 0; i < requiredRooms.length; i++) {
      if (requiredRooms[i] > availableRooms[i]) {
        console.log(
          `Not enough rooms for date ${date}: Required ${requiredRooms[i]}, Available ${availableRooms[i]}`
        );
        return false;
      }
    }
  }
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

    // freeRooms specific date => "1, 2, 3"
    const mockDate = "2024-01-01";
    const freeRoomsDate = await fetchDateBooking(mockDate);

    return {
      statusCode: 200,
      body: JSON.stringify({
        //originalBooking: originalBooking, works
        //convertedBooking: convertedBooking, works
        //comparisonResults: comparisonResults, works
        //newBooking: newBooking,
        //freeRoomsDate: freeRoomsDate, works
        message: "api call worked.",
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
