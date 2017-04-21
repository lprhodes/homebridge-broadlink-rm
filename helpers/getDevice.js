const BroadlinkJS = require('broadlinkjs');
const broadlink = new BroadlinkJS()

const discoveredDevices = {};

broadlink.discover();

broadlink.on('deviceReady', (device) => {
  const macAddressParts = device.mac.toString('hex').match(/[\s\S]{1,2}/g) || []
  const macAddress = macAddressParts.join(':')
  device.host.macAddress = macAddress

  console.log(`Discovered Broadlink RM device at ${device.host.address} (${device.host.macAddress})`)

  discoveredDevices[device.host.address] = device;
  discoveredDevices[device.host.macAddress] = device;
})

const getDevice = ({ host, log, learnOnly }) => {
  let device;

  if (host) {
    device = discoveredDevices[host];
  } else { // use the first one of no host is provided
    const hosts = Object.keys(discoveredDevices);
    if (hosts.length === 0) return log(`Send data (no devices found)`);

    // Only return device that can Learn Code codes
    if (learnOnly) {
      for (let i = 0; i < hosts.length; i++) {
        let currentDevice = discoveredDevices[hosts[i]];

        if (currentDevice.enterLearning) {
          device = currentDevice

          break;
        }
      }

      if (!device) log(`Learn Code (no device found at ${host})`)
    } else {
      device = discoveredDevices[hosts[0]];

      if (!device) log(`Send data (no device found at ${host})`);
    }
  }

  return device;
}

module.exports = getDevice;
