const _ = require('lodash');
const hideLastFourDigits = (number) => {
    if (number.length >= 4) {
        let hiddenPart = "x".repeat(4);
        return number.slice(0, -4) + hiddenPart;
    } else {
        return "xxxx"; // If the number is less than four digits
    }
}
const compareArraysById = (array1, array2) => {
    const compareData = _.differenceBy([...array1, ...array2], '$id');
    const uniqueArray = _.uniqBy(compareData, '$id');
    return uniqueArray;
}
module.exports = {
    hideLastFourDigits, compareArraysById

}