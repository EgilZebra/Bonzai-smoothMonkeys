const priceCalc = async ( rooms ) => {
    console.log(rooms.length, typeof rooms)
    try {
        let total = 0
        for ( i = 0 ; i < rooms.length ; i++ ) {
            if ( rooms[i] < 11 && rooms[i] > 0 ) {
                total = total + 500;
            } else if ( rooms[i] > 10 && rooms[i] < 16) {
                total = total + 1000
            } else if ( rooms[i] > 15 ) {
                total = total + 1500
            }
            console.log(total);
        }
        return total 
    } catch (error) {
        return 0
    }
   
}


module.exports = { priceCalc }