const ping = require('ping');

const pingIPAddress = function (ipAddress, interval, callback) {
  performPing(this.isActive, callback)
  
  return setInterval(() => {
    performPing(this.isActive, callback)
  }, interval * 1000);
}

const performPing = (isActive, callback) => {
  // Fake Latency
  setTimeout(() => {
    callback(isActive)
  }, 200)
}

module.exports = pingIPAddress;
  