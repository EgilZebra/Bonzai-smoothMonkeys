const checkParams = async ( name, email, guests, rooms, checkIn, checkOut ) => {

    let allstrings;
    let dateOK;
    let guestsCalc;
    let roomCalc;

        if ( typeof name === 'string' 
          && typeof email === "string"
          && typeof guests === 'string'
          && typeof rooms === 'string'
          && typeof checkIn === 'string'
          && typeof checkOut === 'string'
        ) {
            allstrings = true
        } else {
            return "your have the wrong input!"
        }

        let roomsNumber = JSON.parse(rooms)
        let beds = (( roomsNumber[0] * 1 ) + ( roomsNumber[1] * 2 ) + ( roomsNumber[2] * 3 ))
        if ( Number(guests) <= beds ) {
            guestsCalc = true
        } else {
            return "That number of guests will not fit into those rooms, add more rooms."
        }

        if ( roomsNumber[0] <= 10 && roomsNumber[1] <= 5 && roomsNumber[2] <= 5) {
            roomCalc = true
        } else {
            return "You are trying to book more rooms than we have. Remember, we have 10 single-rooms, 5 double-rooms and 5 suites"
        }

        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if ( regex.test(checkIn) && regex.test(checkOut) ) {
            dateOK = true
        } else {
            return "Those dates are in the wrong format!"
        }

        if ( allstrings && dateOK && guestsCalc && roomCalc ) {
            return true
        }
}

module.exports = { checkParams }