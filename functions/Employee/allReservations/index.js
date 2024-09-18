import { responseMaker } from "../../services/responseMaker";
import { db } from "../../../data";

exports.handler = async (event) => {
  const params = {
    TableName: "Bookings",
    ProjectionExpression:
      "BookingId, startDate, endDate, guests, rooms, customer",
  };

  try {
    const book = await db.scan(params).promise();
    const bookings = book.Items.map((item) => ({
      BookingNumber: item.BookingId,
      CheckInDate: item.startDate,
      CheckOutDate: item.endDate,
      NumberOfGuests: item.guests,
      NumberOfRooms: item.rooms,
      CustomerName: item.customer,
    }));

    return responseMaker(200, bookings);
  } catch (error) {
    return responseMaker(500, { message: "cant find bookings" });
  }
};

//exports.handler = async (event) => {
//  return {
//    statusCode: 200,
//    body: JSON.stringify({
//      message: "Go Serverless v4! Your function executed successfully!",
//    }),
//  };
//};

// exports.handler = async (event) => {
//   // const bookings = {
//   //   TableName: "Bookings",
//   // };

//   try {
//     // const books = await db.scan(bookings).promise();
//     return responseMaker(200, { message: "hello" });
//   } catch (error) {
//     return responseMaker(500, { message: "Error finding bookings" });
//   }
// };
