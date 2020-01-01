const ping = require('net-ping').createSession({
  retries: 0,
  timeout: 1000
});

const pingIPAddress = (ipAddress, interval, callback) => {
  setInterval(() => {
    ping.pingHost(ipAddress, (error) => {
      callback(!error)
    })
  }, interval * 1000);
}

module.exports = pingIPAddress;
  