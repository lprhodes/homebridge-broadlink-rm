let ping

const pingIPAddress = (ipAddress, interval, callback) => {
  if (!ping) {
    ping = require('net-ping').createSession({
      retries: 0,
      timeout: 1000
    });
  }

  setInterval(() => {
    ping.pingHost(ipAddress, (error) => {
      callback(!error)
    })
  }, interval * 1000);
}

module.exports = pingIPAddress;
  