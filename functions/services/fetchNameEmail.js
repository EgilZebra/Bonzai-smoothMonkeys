import { db } from "../../data"

const fetchNameEmail = async (bookingid) => {
    const bokID = bookingid;
    console.log({bokID: bokID});
    try {
        const nameEmail = await db.query({
            TableName: "Bookings",
            KeyConditionExpression: "BookingId = :bookingid ",
            ExpressionAttributeValues: {
                ":bookingid": bokID
            }
        });
        console.log({ name: nameEmail.Items[0].customer}); 
        console.log({ email: nameEmail.Items[0].email}); 
        const oldname = await nameEmail.Items.customer;
        const oldEmail = await nameEmail.Items.email;
        const oldStart = await nameEmail.Items.startDate;
        const oldEnd = await nameEmail.Items.endDate;

        const oldEntry = [oldname, oldEmail, oldStart, oldEnd];
        return { name: nameEmail.Items[0].customer, email: nameEmail.Items[0].email, oldstart: oldStart, oldEnd: oldEnd };
    } catch (error) {
        return false;
    }

}
module.exports = { fetchNameEmail }