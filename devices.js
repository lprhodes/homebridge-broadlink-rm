const BroadlinkJS = require('broadlinkjs');

const broadlink = new BroadlinkJS()

const discoveredDevices = {};

broadlink.discover();

broadlink.on('deviceReady', (device) => {
  discoveredDevices[device.host.address] = device;
})

module.exports = discoveredDevices;
