const ping = require('ping');

const pingIPAddress = (ipAddress, interval, callback) => {
  setInterval(() => {
    ping.sys.probe(ipAddress, (isActive) => {
      callback(isActive)
    })
  }, interval * 1000);
}

module.exports = pingIPAddress;
  