const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
require("dotenv").config();

const client = new DynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const bookings = {
    TableName: "Bookings",
  };

  try {
    const books = await db.scan(bookings);
    return responseMaker(200, { bookings: books.Items });
  } catch (error) {
    return responseMaker(500, { message: "Error finding bookings" });
  }
};
