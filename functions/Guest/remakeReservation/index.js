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

exports.handler = async (event) => {
  try {
    //fetch variables and save to object.
    const newBooking = ({ BookingId, guests, rooms, checkIn, checkOut } =
      JSON.parse(event.body));

    // Validate number of guests and number of roomTypes.
    const validateGuestsAndRooms = isGuestCountValid(guests, rooms);
    if (!validateGuestsAndRooms.isValid) {
      return responseMaker(404, "error", validateGuestsAndRooms.message);
    }

    // Fetch the original booking.
    const originalBooking = await connectAndFetchBooking(BookingId);
    if (!originalBooking) {
      return responseMaker(
        404,
        "error",
        `No booking found with BookingId ${BookingId}.`
      );
    }

    // Convert roomIds in originalBooking (table: Bookings) to amount of rooms for each roomType => ("SR, DR, S")
    const parsedOriginalRooms = parseDbRooms(originalBooking.rooms);
    const convertedRoomsString = `${parsedOriginalRooms.singleRooms},${parsedOriginalRooms.doubleRooms},${parsedOriginalRooms.suites}`;
    const convertedBooking = {
      ...originalBooking,
      rooms: convertedRoomsString,
    };

    //compare originalBooking w newBooking => return change for each date [{"YYYY-MM-DD", "1, 2, 3"}, {"YYYY-MM-DD", "1, 2, 3"}]
    const comparisonResults = compareBookingsDayByDay(
      convertedBooking,
      newBooking
    );
    if (!comparisonResults) {
      return responseMaker(404, "error", "No changes in booking.");
    }

    // Check if all roomTypes & dates are free.
    const bookingIsPossible = await checkBookingPossible(comparisonResults);
    if (!bookingIsPossible) {
      return responseMaker(404, "error", "Not enough roomS Free");
    }

    // book all the extra Rooms
    const bookedRooms = await bookNewRooms(comparisonResults, BookingId);

    // delete rooms if the newBooking contains less rooms.
    await deleteRooms(comparisonResults, BookingId);

    // update Bookings w newBooking-details

    return responseMaker(200, "msg", "all good");
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
