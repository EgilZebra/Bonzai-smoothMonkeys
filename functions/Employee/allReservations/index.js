import { responseMaker } from "../../services/responseMaker";
import { db } from "../../../data";
require("dotenv").config();


exports.handler = async (event) => {
  const bookings = {
    TableName: "Bookings",
  };

  try {
    const books = await db.scan(
      bookings
    );
    return responseMaker(200, books.Items);
  } catch (error) {
    return responseMaker(500, { message: "Error finding bookings" });
  }
};
