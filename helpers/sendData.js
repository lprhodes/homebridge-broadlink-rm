const assert = require('assert')

const getDevice = require('./getDevice');

module.exports = ({ host, hexData, log, name, debug }) => {
  assert(hexData && typeof hexData === 'string', '\x1b[31m[ERROR]: \x1b[30mHEX value is missing')

  // Get the Broadlink device
  const device = getDevice({ host, log })
  if (!device) {
    if (!host) return log(`\x1b[31m[ERROR] \x1b[30m${name} sendData (no auto-discovered device found and no "host" option set)`);

    return log(`\x1b[31m[ERROR] \x1b[30m${name} sendData (no device found at ${host})`);
  }

  if (!device.sendData) return log(`\x1b[31m[ERROR] \x1b[30mThe device at ${device.host.address} (${device.host.macAddress}) doesn't support the sending of IR or RF codes.`);
  if (hexData.includes('5aa5aa555')) return log('\x1b[31m[ERROR] \x1b[30mThis type of hex code (5aa5aa555...) is no longer valid. Use the included "Learn Code" accessory to find new (decrypted) codes.');

  const hexDataBuffer = new Buffer(hexData, 'hex');
  device.sendData(hexDataBuffer, debug);

  log(`${name} sendHex (${device.host.address}; ${device.host.macAddress})`);
}
