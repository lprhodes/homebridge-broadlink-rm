const BroadlinkJS = require('broadlinkjs');
const broadlink = new BroadlinkJS()

const discoveredDevices = {};

broadlink.discover();

broadlink.on('deviceReady', (device) => {
  // console.log('device', device)

  const macAddressParts = device.mac.toString('hex').match(/[\s\S]{1,2}/g) || []
  const macAddress = macAddressParts.join(':')
  console.log(`Discovered Broadlink RM device at ${device.host.address} (${macAddress})`)

  discoveredDevices[device.host.address] = device;
  discoveredDevices[macAddress] = device;
})

module.exports = discoveredDevices;
