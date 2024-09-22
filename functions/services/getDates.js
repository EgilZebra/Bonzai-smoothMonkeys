  

  const getDates = async (checkIn, checkOut) => {

    const startDate = new Date(checkIn);
    console.log({startDate: startDate});
    const stopDate = new Date(checkOut);
    console.log({stopDate: stopDate});
    
    Date.prototype.addDays = function(days) {
        var date = new Date(this.valueOf());
        date.setDate(date.getDate() + days);
        return date;
    }

    let dateArray = new Array();
    let currentDate = startDate;
    while (currentDate <= stopDate) {
        const newDate = new Date (currentDate);
        const dateString = newDate.toISOString();
        dateArray.push( dateString.slice(0, 10) );
        currentDate = currentDate.addDays(1);
    }
    console.log(dateArray);
    return dateArray;
}
    

module.exports = { getDates };