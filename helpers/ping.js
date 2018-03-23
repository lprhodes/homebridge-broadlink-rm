const ping = require('ping');

const pingIPAddress = (ipAddress, interval, callback) => {
  setInterval(() => {
    try {
      ping.sys.probe(ipAddress, (isActive) => {
        callback(isActive)
      })
    } catch (err) {
      callback(false)
    }
  }, interval * 1000);
}

module.exports = pingIPAddress;
  