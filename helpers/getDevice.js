const ping = require('ping');
const BroadlinkJS = require('broadlinkjs-rm');
const broadlink = new BroadlinkJS()

const pingFrequency = 5000;

const startPing = (device) => {
  device.state = 'unknown';

  setInterval(() => {
    ping.sys.probe(device.host.address, (active) => {
      if (!active && device.state === 'active') {
        console.log(`Broadlink RM device at ${device.host.address} (${device.host.macAddress || ''}) is no longer reachable.`);

        device.state = 'inactive';
      } else if (active && device.state !== 'active') {
        if (device.state === 'inactive') console.log(`Broadlink RM device at ${device.host.address} (${device.host.macAddress || ''}) has been re-discovered.`);

        device.state = 'active';
      }
    })
  }, pingFrequency);
}

const discoveredDevices = {};
const manualDevices = {};

let discovering = false;

const discoverDevices = () => {
  setInterval(() => {
    broadlink.discover()
  }, 2000)

  broadlink.discover()
}

broadlink.on('deviceReady', (device) => {
  const macAddressParts = device.mac.toString('hex').match(/[\s\S]{1,2}/g) || []
  const macAddress = macAddressParts.join(':')
  device.host.macAddress = macAddress

  console.log(`\x1b[36m[INFO]\x1b[0m Discovered Broadlink RM device at ${device.host.address} (${device.host.macAddress})`)
  addDevice(device)

  startPing(device)
})

const addDevice = (device) => {
  if (!device.isUnitTestDevice && (discoveredDevices[device.host.address] || discoveredDevices[device.host.macAddress])) return;

  discoveredDevices[device.host.address] = device;
  discoveredDevices[device.host.macAddress] = device;
}

const getDevice = ({ host, log, learnOnly }) => {
  let device;

  if (host) {
    device = discoveredDevices[host];

    // Create manual device
    if (!device && !manualDevices[host]) {
      const device = { host: { address: host } };
      manualDevices[host] = device;

      startPing(device)
    }
  } else { // use the first one of no host is provided
    const hosts = Object.keys(discoveredDevices);
    if (hosts.length === 0) {
      // log(`Send data (no devices found)`);

      return;
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

      if (!device) log(`Learn Code (no device found at ${host})`);
    } else {
      device = discoveredDevices[hosts[0]];

      if (!device) log(`Send data (no device found at ${host})`);
    }
  }

  return device;
}

module.exports = { getDevice, discoverDevices, addDevice };
