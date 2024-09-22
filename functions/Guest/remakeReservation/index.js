import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  BatchWriteItemCommand,
  BatchWriteCommand,
  UpdateCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
require("dotenv").config();
const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

function isGuestCountValid(guestCount, rooms) {
  const [singleRooms, doubleRooms, suites] = rooms.split(",").map(Number);
  const guests = Number(guestCount);

  if (singleRooms > 10) {
    return {
      isValid: false,
      message: "Sorry, the hotel only have 10 singlerooms",
    };
  }

  if (doubleRooms > 5) {
    return {
      isValid: false,
      message: "Sorry, the hotel only have 5 doublerooms",
    };
  }

  if (suites > 5) {
    return {
      isValid: false,
      message: "Sorry, the hotel only have 5 suites",
    };
  }

  if (guests > singleRooms + doubleRooms * 2 + suites * 3) {
    return {
      isValid: false,
      message:
        "Sorry, you can max stay 1 person in singles, 2 in doubles and 3 in suites and your provided number of guests exceeds that. Book more rooms or less guests.",
    };
  }

  return {
    isValid: true,
    message: "Guest count and room allocation are valid.",
  };
}
function responseMaker(statusCode, type, text) {
  return {
    statusCode: statusCode,
    body: JSON.stringify({
      [type]: text,
    }),
  };
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

  // Helper function to generate an array of dates excluding the checkOut date
  function getDatesArray(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);

    while (currentDate < new Date(endDate)) {
      dates.push(new Date(currentDate).toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  // Determine the earliest check-in and latest check-out
  const earliestCheckIn = new Date(
    Math.min(new Date(originalBooking.checkIn), new Date(newBooking.checkIn))
  );

  const latestCheckOut = new Date(
    Math.max(new Date(originalBooking.checkOut), new Date(newBooking.checkOut))
  );

  // Generate booking date arrays
  const originalBookingDates = getDatesArray(
    originalBooking.checkIn,
    originalBooking.checkOut
  );

  const newBookingDates = getDatesArray(
    newBooking.checkIn,
    newBooking.checkOut
  );

  // Combine all dates from both bookings, removing duplicates
  const allDates = getDatesArray(
    earliestCheckIn.toISOString().split("T")[0],
    latestCheckOut.toISOString().split("T")[0]
  );

  const originalRoomsArray = originalBooking.rooms.split(",").map(Number);
  const newRoomsArray = newBooking.rooms.split(",").map(Number);

  let hasChanges = false;

  // Iterate through all dates in the combined date set
  allDates.forEach((date) => {
    const originalHasDate = originalBookingDates.includes(date);
    const newHasDate = newBookingDates.includes(date);

    // If both original and new bookings contain the date, compare room differences
    if (originalHasDate && newHasDate) {
      const roomDifferences = originalRoomsArray.map(
        (roomCount, index) => newRoomsArray[index] - roomCount
      );

      // If there's a difference in the rooms, mark hasChanges as true
      if (roomDifferences.some((difference) => difference !== 0)) {
        hasChanges = true;
        results.push({
          date,
          rooms: roomDifferences.join(","),
        });
      }
    } else if (newHasDate && !originalHasDate) {
      // New booking contains a date not in the original (e.g., an extension)
      hasChanges = true;
      results.push({
        date,
        rooms: newRoomsArray.join(","),
      });
    } else if (originalHasDate && !newHasDate) {
      // Original booking has a date not in the new booking (e.g., cancellation)
      hasChanges = true;
      results.push({
        date,
        rooms: originalRoomsArray.map((count) => -count).join(","), // Indicate rooms are not needed
      });
    }
  });

  // If no changes were detected in rooms or dates, return false
  if (!hasChanges) {
    return false;
  }

  return results;
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

async function checkBookingIsPossibleOld(comparisonResults) {
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
    return originalBookingResult.Item;
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

async function deleteRooms(comparisonResults, BookingId) {
  for (const change of comparisonResults) {
    const { date, rooms } = change;
    const requiredRooms = rooms.split(",").map(Number);

    for (let i = 0; i < requiredRooms.length; i++) {
      if (requiredRooms[i] < 0) {
        const roomType = i === 0 ? "single" : i === 1 ? "double" : "suite";
        const roomsToDelete = Math.abs(requiredRooms[i]);

        // Fetch the IDs of rooms booked for this BookingId and date
        const getParams = {
          TableName: "Rooms",
          FilterExpression: "BookingId = :bookingId and #d = :date",
          ExpressionAttributeNames: {
            "#d": "date",
          },
          ExpressionAttributeValues: {
            ":bookingId": BookingId,
            ":date": date,
          },
        };

        try {
          const result = await dynamoDb.send(new ScanCommand(getParams));
          const bookedRooms = result.Items || [];

          // Filter room IDs by type and limit to the number we need to delete
          const roomIdsToDelete = bookedRooms
            .filter((room) => {
              const roomId = Number(room.roomId);
              return (
                (roomType === "single" && roomId >= 1 && roomId <= 10) ||
                (roomType === "double" && roomId >= 11 && roomId <= 15) ||
                (roomType === "suite" && roomId >= 16 && roomId <= 20)
              );
            })
            .slice(0, roomsToDelete); // Take only the number we need to delete

          // Prepare delete requests
          const deleteRequests = roomIdsToDelete.map((room) => ({
            DeleteRequest: {
              Key: {
                roomId: room.roomId, // roomId is a string
                date: date,
              },
            },
          }));

          if (deleteRequests.length > 0) {
            const params = {
              RequestItems: {
                Rooms: deleteRequests,
              },
            };

            await dynamoDb.send(new BatchWriteCommand(params));
            console.log(
              `Deleted ${deleteRequests.length} ${roomType} rooms for BookingId ${BookingId} on date ${date}.`
            );
          }
        } catch (error) {
          console.error("Error deleting rooms:", error);
          throw new Error("Failed to delete rooms: " + error.message);
        }
      }
    }
  }
}
async function getRoomIdsByBookingId(BookingId) {
  const getParams = {
    TableName: "Rooms",
    FilterExpression: "BookingId = :bookingId",
    ExpressionAttributeValues: {
      ":bookingId": BookingId,
    },
  };

  try {
    const result = await dynamoDb.send(new ScanCommand(getParams));
    const rooms = result.Items || [];

    // Collect all roomIds into an array
    const roomIds = rooms.map((room) => room.roomId);

    // Join the roomIds into a comma-separated string
    return roomIds.join(",");
  } catch (error) {
    console.error("Error fetching room IDs:", error);
    throw new Error("Database connection error: " + error.message);
  }
}
async function updateBooking(updateBookingTable) {
  const { BookingId, guests, rooms, checkIn, checkOut } = updateBookingTable;

  const updateParams = {
    TableName: "Bookings",
    Key: { BookingId },
    UpdateExpression:
      "SET guests = :guests, rooms = :rooms, checkIn = :checkIn, checkOut = :checkOut",
    ExpressionAttributeValues: {
      ":guests": guests,
      ":rooms": rooms,
      ":checkIn": checkIn,
      ":checkOut": checkOut,
    },
  };

  try {
    await dynamoDb.send(new UpdateCommand(updateParams));
    console.log("Booking updated successfully:", BookingId);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Booking updated successfully" }),
    };
  } catch (error) {
    console.error("Error updating booking:", error);
    throw new Error("Failed to update booking: " + error.message);
  }
}
async function fetchFreeRooms(date, bookingId) {
  console.log("bookingId----", bookingId);
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

    // Set to track booked room IDs
    const bookedRoomIds = new Set();

    // Collect all room IDs from the bookings, except for the current bookingId
    bookings.forEach((booking) => {
      bookedRoomIds.add(Number(booking.roomId)); // This tracks all booked rooms
    });

    // Fetch booked rooms for the current bookingId
    const currentBookingRooms = bookings
      .filter((booking) => booking.BookingId === bookingId)
      .map((booking) => Number(booking.roomId));

    // Define total room IDs (1-20)
    const totalRoomIds = Array.from({ length: 20 }, (_, i) => i + 1);

    // Calculate free room IDs by filtering out the booked ones
    const freeRoomIds = totalRoomIds.filter((id) => !bookedRoomIds.has(id));

    // Concatenate current booking rooms with free room IDs, ensuring no duplicates
    const allAvailableRoomIds = [
      ...new Set([...freeRoomIds, ...currentBookingRooms]),
    ];

    // Convert to a comma-separated string
    const allAvailableRoomIdsString = allAvailableRoomIds.join(",");

    return allAvailableRoomIdsString;
  } catch (error) {
    console.error("Error fetching bookings:", error);
    throw new Error("Database connection error: " + error.message);
  }
}
async function isNewBookingPossible(newBookingRoomsByType) {
  const { BookingId, checkIn, checkOut, rooms } = newBookingRoomsByType;
  const [singleRoomsNeeded, doubleRoomsNeeded, suitesNeeded] = rooms
    .split(",")
    .map(Number);

  // Helper function to get date range
  function getDateRange(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate < new Date(endDate)) {
      dates.push(currentDate.toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }

  // Get all dates for the stay
  const datesOfStay = getDateRange(checkIn, checkOut);

  console.log("datesOfStay", datesOfStay);
  console.log(
    "singleRoomsNeeded",
    singleRoomsNeeded,
    "doubleRoomsNeeded",
    doubleRoomsNeeded,
    "suitesNeeded",
    suitesNeeded
  );

  // Initialize availability for room types (arrays will hold room IDs)
  const roomAvailability = {
    single: new Set(Array.from({ length: 10 }, (_, i) => i + 1)), // IDs 1-10
    double: new Set(Array.from({ length: 5 }, (_, i) => i + 11)), // IDs 11-15
    suites: new Set(Array.from({ length: 5 }, (_, i) => i + 16)), // IDs 16-20
  };

  // Fetch available room IDs for all dates
  for (const date of datesOfStay) {
    const availableRoomIdsString = await fetchFreeRooms(date, BookingId);
    const availableRoomIds = availableRoomIdsString.split(",").map(Number);

    // Filter room IDs based on their ranges for singles, doubles, and suites
    const availableSingleRooms = new Set(
      availableRoomIds.filter((id) => id >= 1 && id <= 10)
    );
    const availableDoubleRooms = new Set(
      availableRoomIds.filter((id) => id >= 11 && id <= 15)
    );
    const availableSuites = new Set(
      availableRoomIds.filter((id) => id >= 16 && id <= 20)
    );

    // Update room availability for the current date by intersecting with existing availability
    roomAvailability.single = new Set(
      [...roomAvailability.single].filter((id) => availableSingleRooms.has(id))
    );
    roomAvailability.double = new Set(
      [...roomAvailability.double].filter((id) => availableDoubleRooms.has(id))
    );
    roomAvailability.suites = new Set(
      [...roomAvailability.suites].filter((id) => availableSuites.has(id))
    );

    // Check if there's still enough availability for the required rooms
    if (
      roomAvailability.single.size < singleRoomsNeeded ||
      roomAvailability.double.size < doubleRoomsNeeded ||
      roomAvailability.suites.size < suitesNeeded
    ) {
      return false; // Not enough rooms available across all dates
    }
  }

  // Allocate rooms
  const roomIdsToBook = {
    single: [],
    double: [],
    suites: [],
  };

  // Helper to allocate rooms
  function allocateRooms(roomSet, roomsNeeded, roomIdsToBook) {
    let allocated = [];
    for (const roomId of roomSet) {
      if (allocated.length < roomsNeeded) {
        allocated.push(roomId);
        roomSet.delete(roomId); // Remove this room from future allocations
      }
    }
    if (allocated.length === roomsNeeded) {
      roomIdsToBook.push(...allocated);
      return true;
    }
    return false;
  }

  // Try to allocate single rooms
  if (
    !allocateRooms(
      roomAvailability.single,
      singleRoomsNeeded,
      roomIdsToBook.single
    )
  ) {
    return false;
  }

  // Try to allocate double rooms
  if (
    !allocateRooms(
      roomAvailability.double,
      doubleRoomsNeeded,
      roomIdsToBook.double
    )
  ) {
    return false;
  }

  // Try to allocate suites
  if (
    !allocateRooms(roomAvailability.suites, suitesNeeded, roomIdsToBook.suites)
  ) {
    return false;
  }

  // Combine all allocated room IDs and return them
  const allRoomIds = [
    ...roomIdsToBook.single,
    ...roomIdsToBook.double,
    ...roomIdsToBook.suites,
  ];

  return allRoomIds.length > 0 ? allRoomIds : false;
}
async function bookRooms(newBookingRoomsByType, roomIdsToBook) {
  const { checkIn, checkOut, BookingId } = newBookingRoomsByType;

  // Helper function to get all dates between check-in and check-out (exclusive of check-out)
  const getDatesBetween = (start, end) => {
    const dates = [];
    let currentDate = new Date(start);
    const endDate = new Date(end);

    while (currentDate < endDate) {
      dates.push(currentDate.toISOString().split("T")[0]); // Format date as YYYY-MM-DD
      currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
    }

    return dates;
  };

  const datesToBook = getDatesBetween(checkIn, checkOut);
  const roomsToBook = [];
  const alreadyBookedRoomIds = new Set();

  // Check for already booked rooms for the current BookingId
  for (let date of datesToBook) {
    const bookedRoomIds = await fetchBookedRoomsBookingId(date, BookingId);
    if (bookedRoomIds) {
      bookedRoomIds.split(",").forEach((id) => alreadyBookedRoomIds.add(id));
    }
  }

  // Filter out roomIdsToBook to get only those that are not already booked
  for (let roomId of roomIdsToBook) {
    if (!alreadyBookedRoomIds.has(roomId.toString())) {
      roomsToBook.push(roomId);
    } else {
      console.log(
        `Room ${roomId} is already booked for the current BookingId. Skipping.`
      );
    }
  }

  if (roomsToBook.length === 0 && alreadyBookedRoomIds.size === 0) {
    return {
      status: "warning",
      message: "No available rooms to book for the current BookingId.",
    };
  }

  const bookingPromises = [];

  console.log("datesToBook", datesToBook);
  console.log("BookingId", BookingId);
  console.log("roomsToBook", roomsToBook);

  // Book the rooms for the specified dates
  for (let roomId of roomsToBook) {
    for (let date of datesToBook) {
      const putParams = {
        TableName: "Rooms",
        Item: {
          roomId: roomId.toString(), // Ensure roomId is a string
          date,
          BookingId,
        },
      };

      console.log("Attempting to book with params:", putParams); // Log before booking

      const bookingPromise = dynamoDb
        .send(new PutCommand(putParams))
        .then(() => {
          console.log(`Room ${roomId} successfully booked for ${date}`);
        })
        .catch((error) => {
          console.error(`Error booking room ${roomId} for ${date}:`, error);
        });

      bookingPromises.push(bookingPromise);
    }
  }

  // Wait for all bookings to complete
  await Promise.all(bookingPromises);

  // Construct the final message
  const bookedRoomIds = [...roomsToBook, ...Array.from(alreadyBookedRoomIds)];

  const bookedRoomsFlow = bookedRoomIds.join(", ");

  return {
    status: "success",
    bookedRoomsFlow: bookedRoomsFlow,
    message: `You have booked the rooms (${bookedRoomIds.join(
      ", "
    )}) for the dates (${checkIn} to ${checkOut}).`,
  };
}

async function fetchBookedRoomsBookingId(date, bookingId) {
  console.log("bookingId----", bookingId);
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

    // Collect booked room IDs for the specific bookingId
    const bookedRoomIds = bookings
      .filter((booking) => booking.BookingId === bookingId)
      .map((booking) => Number(booking.roomId));

    // Convert to a comma-separated string
    const bookedRoomIdsString = bookedRoomIds.join(",");

    return bookedRoomIdsString;
  } catch (error) {
    console.error("Error fetching bookings:", error);
    throw new Error("Database connection error: " + error.message);
  }
}

function findRoomsToDelete(originalBookingRoomsByIds, newBookingRoomsById) {
  // Parse the checkIn and checkOut dates
  const originalCheckIn = new Date(originalBookingRoomsByIds.checkIn);
  const originalCheckOut = new Date(originalBookingRoomsByIds.checkOut);
  const newCheckIn = new Date(newBookingRoomsById.checkIn);
  const newCheckOut = new Date(newBookingRoomsById.checkOut);

  // Determine the longest check-in and check-out dates
  const startDate = new Date(Math.min(originalCheckIn, newCheckIn));
  const endDate = new Date(Math.max(originalCheckOut, newCheckOut));

  // Create an array to hold the date range
  const dateRange = [];
  for (let dt = startDate; dt <= endDate; dt.setDate(dt.getDate() + 1)) {
    dateRange.push(dt.toISOString().split("T")[0]); // Format as YYYY-MM-DD
  }

  console.log("Date Range:", dateRange); // Log the date range

  // Extract room IDs
  const originalRoomIds = originalBookingRoomsByIds.rooms
    .split(",")
    .map((id) => id.trim());
  const newRoomIds = newBookingRoomsById.rooms
    .split(",")
    .map((id) => id.trim());

  console.log("Original Room IDs:", originalRoomIds); // Log original room IDs
  console.log("New Room IDs:", newRoomIds); // Log new room IDs

  // Prepare an array to hold the results
  const removeDateRoomIds = [];

  // Compare rooms
  originalRoomIds.forEach((roomId) => {
    if (!newRoomIds.includes(roomId)) {
      removeDateRoomIds.push({ [originalBookingRoomsByIds.checkIn]: roomId });
      console.log(
        `Room ${roomId} is not in new booking, adding to remove list.`
      ); // Log rooms to remove
    } else {
      console.log(`Room ${roomId} is still booked.`); // Log rooms that are still booked
    }
  });

  console.log("Remove Date Room IDs:", removeDateRoomIds); // Log the final result
  return removeDateRoomIds;
}

exports.handler = async (event) => {
  try {
    // Fetch variables and save to object.
    const newBookingRoomsByType = JSON.parse(event.body);

    // Validate number of guests and number of roomTypes.
    const validateGuestsAndRooms = isGuestCountValid(
      newBookingRoomsByType.guests,
      newBookingRoomsByType.rooms
    );
    if (!validateGuestsAndRooms.isValid) {
      return responseMaker(404, "error", validateGuestsAndRooms.message);
    }

    // Fetch the original booking.
    const originalBookingRoomsByIds = await connectAndFetchBooking(
      newBookingRoomsByType.BookingId
    );
    if (!originalBookingRoomsByIds) {
      return responseMaker(
        404,
        "error",
        `No booking found with BookingId ${newBookingRoomsByType.BookingId}.`
      );
    }

    // Convert originalBooking roomsByIds to roomsByType
    const parsedOriginalRooms = parseDbRooms(originalBookingRoomsByIds.rooms);
    const convertedRoomsString = `${parsedOriginalRooms.singleRooms},${parsedOriginalRooms.doubleRooms},${parsedOriginalRooms.suites}`;
    const originalBookingRoomsByType = {
      ...originalBookingRoomsByIds,
      rooms: convertedRoomsString,
    };

    // Compare originalBooking w newBooking
    const diffrenceNewBookingOriginalBooking = compareBookingsDayByDay(
      originalBookingRoomsByType,
      newBookingRoomsByType
    );
    if (!diffrenceNewBookingOriginalBooking) {
      return responseMaker(404, "error", "No changes in booking.");
    }

    /**
    //check new func
    const mockDate = "2024-01-03";
    const testNewFunc = await fetchFreeRooms(
      mockDate,
      newBookingRoomsByType.BookingId,
      (format = "type")
    );
 */

    // returns roomIds of the rooms to book
    const roomIdsToBook = await isNewBookingPossible(newBookingRoomsByType);
    if (!roomIdsToBook) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "booking can't be made",
        }),
      };
    }
    /**
    mockDate = "2024-01-01";
    idUser = "test1234";
    const trial = await fetchBookedRoomsBookingId(mockDate, idUser);
    return {
      statusCode: 404,
      body: JSON.stringify({
        trial: trial,
      }),
    };
 */

    // attempt to book rooms
    const newRoomsBooked = await bookRooms(
      newBookingRoomsByType,
      roomIdsToBook
    );

    const newBookingRoomsById = {
      ...newBookingRoomsByType,
      rooms: newRoomsBooked.bookedRoomsFlow,
    };

    console.log("originalBookingRoomsByIds", originalBookingRoomsByIds);
    console.log("newBookingRoomsById", newBookingRoomsById);

    //try do delete rooms not existing in new booking
    const roomsToDelete = findRoomsToDelete(
      originalBookingRoomsByIds,
      newBookingRoomsById
    );
    console.log("roomsToDelete", roomsToDelete); // Output: [{ date: "2024-01-01", roomId: "1" }]

    return {
      statusCode: 200,
      body: JSON.stringify({
        roomsToDelete: roomsToDelete,
        // bookedRoomsFlow: newRoomsBooked.bookedRoomsFlow, => hold the roomIds for the new booking
      }),
    };

    /**
 
    // Check if all roomTypes & dates are free.
    const newBookingIsPossible = await checkBookingIsPossible(
      newBookingRoomsByType
    );
    if (!newBookingIsPossible) {
      return responseMaker(404, "error", "Not enough roomS Free");
    }
 
    
  
   

    

    // book all the extra Rooms
    const bookedRooms = await bookNewRooms(comparisonResults, BookingId);

    // delete rooms if the newBooking contains less rooms.
    await deleteRooms(comparisonResults, BookingId);

    // update Bookings w newBooking-details
    const roomIdsString = await getRoomIdsByBookingId(newBooking.BookingId);
    const updateBookingTable = { ...newBooking, rooms: roomIdsString };
    const updateResult = await updateBooking(updateBookingTable);

    return responseMaker(200, "msg", "all good"); */
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
