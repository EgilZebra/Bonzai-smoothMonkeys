const priceCalc = async ( rooms ) => {
    let total = 0
    for ( i = 0 ; i < rooms.lenght ; i++ ) {
        if ( rooms[i] < 11 ) {
            total = total + 500;
        } else if ( 10 < rooms[i] < 16) {
            total = total + 1000
        } else if ( rooms[i] > 15 ) {
            total = total + 1500
        }
    }
    return total
}


module.exports = { priceCalc }