const assert = require('assert')

const getDevice = require('./getDevice');

module.exports = ({ host, hexData, log, name }) => {
  assert(hexData && typeof hexData === 'string', 'HEX value is missing')

  // Get the Broadlink device
  const device = getDevice({ host, log })
  if (!device) return log(`${name} sendData(no device found at ${host})`);

  if (!device.sendData) return log(`[ERROR] The device at ${device.host.address} (${device.host.macAddress}) doesn't support the sending of IR or RF codes.`);
  if (hexData.includes('5aa5aa555')) return log('[ERROR] This type of hex code (5aa5aa555...) is no longer valid. Use the included "Learn Code" accessory to find new (decrypted) codes.');

  const hexDataBuffer = new Buffer(hexData, 'hex');
  device.sendData(hexDataBuffer);

  log(`${name} sendHex (${device.host.address}; ${device.host.macAddress})`);
}
