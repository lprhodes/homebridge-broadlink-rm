const BroadlinkJS = require('broadlinkjs-rm');
const broadlink = new BroadlinkJS()

const discoveredDevices = {};

const limit = 5;

let discovering = false;

const discoverDevices = (count = 0) => {
  discovering = true;

  if (count >= 5) {
    discovering = false;

    return;
  }

  broadlink.discover();
  count++;

  setTimeout(() => {
    discoverDevices(count);
  }, 5 * 1000)
}

discoverDevices();

broadlink.on('deviceReady', (device) => {
  const macAddressParts = device.mac.toString('hex').match(/[\s\S]{1,2}/g) || []
  const macAddress = macAddressParts.join(':')
  device.host.macAddress = macAddress

  if (discoveredDevices[device.host.address] || discoveredDevices[device.host.macAddress]) return;

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
    if (hosts.length === 0) {
      log(`Send data (no devices found)`);
      if (!discovering) {
        log(`Attempting to discover RM devices for 5s`);

        discoverDevices()
      }

      return
    }

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
      if (!device && !discovering) {
        log(`Attempting to discover RM devices for 5s`);

        discoverDevices()
      }
    } else {
      device = discoveredDevices[hosts[0]];

      if (!device) log(`Send data (no device found at ${host})`);
      if (!device && !discovering) {
        log(`Attempting to discover RM devices for 5s`);

        discoverDevices()
      }
    }
  }

  return device;
}

module.exports = getDevice;
