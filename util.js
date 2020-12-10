export function displayInInput(name, val) {
    document.getElementById(name).value = val;
}

export function displayInSpan(name, val) {
    Array.prototype.slice.call(document.getElementsByClassName(`${name}_span`)).map(each => each.innerText = val);
}

//deprecated, display logic no longer needs to be passed on load
// export function loadSetting(name, parseLogic, displayLogic) {
//     displayLogic(name, getSetting(name, parseLogic));
// }

// export function getSetting(name, parseLogic) {
//     return parseLogic(localStorage.getItem(name));
//     return val;
// }

// //attempts to get an item from local storage for every key on the destination object; naive version with no parsing.
// export function loadItems()