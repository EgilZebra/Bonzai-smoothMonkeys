import { responseMaker } from "../../services/responseMaker";
import { db } from "../../../data";

exports.handler = async (event) => {
  const bookings = {
    TableName: "Bookings",
  };

  try {
    const books = await db.scan(bookings).promise();
    return responseMaker(200, books.Items);
  } catch (error) {
    return responseMaker(500, { message: "Error finding bookings" });
  }
};
