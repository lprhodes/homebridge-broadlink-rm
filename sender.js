const discoveredDevices = require('./devices.js');

module.exports = (host, payload, callback, log) => {
  const PORT = 80;

  const device = discoveredDevices[host];
  if (!device) return log(`LearnIR (no device found at ${host})`);

  if (payload.includes('5aa5aa555')) {
    log('[ERROR] This type of hex code (5aa5aa555...) is no longer valid. Use the learn accessory to find new codes.');

    return callback();
  }

  const packet = new Buffer(payload, 'hex');
  device.sendData(packet);

  log(`Payload message sent to Broadlink RM device (${host}:${PORT})`);

  callback()
}
