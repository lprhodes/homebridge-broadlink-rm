const broadlink = require('./broadlink')
const delayForDuration = require('./delayForDuration')

const pingFrequency = 5000; // 5s

let ping

const setupPing = (log) => {
  if (ping) return

  try {
    ping = require('net-ping').createSession({
      retries: 3,
      timeout: 2000
    });
  } catch (err) {
    if (err.message.includes('was compiled against a different Node.js version')) {
      log(`Broadlink RM won't detect device failures due to a version conflict with "net-ping". Please run "npm r homebridge-broadlink-rm -g && npm i homebridge-broadlink-rm -g" to resolve.`);
    } else if (err.message.includes('Operation not permitted')) {
      log(`Broadlink RM won't detect device failures due to a permissions issues with "net-ping".\n\nTo fix:\n\n 1. Run "which node" to determine your node path.\n2. Run "sudo setcap cap_net_raw+ep /path/to/node".\n\nNote: Replacing /path/to/node with the path you found in the first step.`);
    } else {
      log(err.message);
    }
  }
}

const startPing = (device, log) => {
  setupPing(log)

  if (!ping) return

  device.state = 'unknown';

  setInterval(() => {
    ping.pingHost(device.host.address, (error, target) => {
      if (error && device.state === 'active') {
        log(`Broadlink RM device at ${device.host.address} (${device.host.macAddress || ''}) is no longer reachable. (${target}, ${error.message})`);

        device.state = 'inactive';
      } else if (!error && device.state !== 'active') {
        if (device.state === 'inactive') log(`Broadlink RM device at ${device.host.address} (${device.host.macAddress || ''}) has been re-discovered.`);

        device.state = 'active';
      }
    })
  }, pingFrequency);
}

const discoveredDevices = {};
const manualDevices = {};
let discoverDevicesInterval;

const discoverDevices = (automatic = true, log, debug, deviceDiscoveryTimeout = 60) => {
  broadlink.log = log
  broadlink.debug = debug

  if (automatic) {
    this.discoverDevicesInterval = setInterval(() => {
      broadlink.discover();
    }, 2000);

    delayForDuration(deviceDiscoveryTimeout).then(() => {
      clearInterval(this.discoverDevicesInterval);
    });

    broadlink.discover();
  }

  broadlink.on('deviceReady', (device) => {
    const macAddressParts = device.mac.toString('hex').match(/[\s\S]{1,2}/g) || []
    const macAddress = macAddressParts.join(':')
    device.host.macAddress = macAddress

    log(`\x1b[35m[INFO]\x1b[0m Discovered ${device.model} (${device.type.toString(16)}) at ${device.host.address} (${device.host.macAddress})`)
    addDevice(device)

    startPing(device, log)
  })
}

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

      startPing(device, log)
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
