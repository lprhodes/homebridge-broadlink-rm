const assert = require('assert')

const discoveredDevices = require('./devices.js');

module.exports = (host, payload, log) => {
  assert(payload && typeof payload === 'string', 'HEX value is missing')

  // Get the Broadlink device, use the first one of no host is provided
  let device;

  if (host) {
    device = discoveredDevices[host];
  } else {
    const hosts = Object.keys(discoveredDevices);
    if (hosts.length === 0) return log(`Send data (no devices found)`);

    device = discoveredDevices[hosts[0]];
  }

  if (!device) return log(`Send data (no device found at ${host})`);

  const macAddressParts = device.mac.toString('hex').match(/[\s\S]{1,2}/g) || []
  const macAddress = macAddressParts.join(':')

  if (!device.sendData) {
    log(`[ERROR] The device at ${device.host.address} (${macAddress}) doesn't support the sending of IR or RF codes.`);

    return
  }

  if (payload.includes('5aa5aa555')) {
    log('[ERROR] This type of hex code (5aa5aa555...) is no longer valid. Use the included "Learn IR" accessory to find new (decrypted) codes.');

    return
  }

  const packet = new Buffer(payload, 'hex');
  device.sendData(packet);

  log(`Payload message sent to Broadlink RM device (${device.host.address}; ${macAddress})`);
}
