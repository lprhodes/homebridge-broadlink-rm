const ping = require('ping');
const broadlink = require('./broadlink')
const delayForDuration = require('./delayForDuration')

const pingFrequency = 5000;
const pingTimeout = 5;

const startPing = (device, log) => {
  device.state = 'unknown';
  var retryCount = 1;

  setInterval(() => {
    try {
      ping.sys.probe(device.host.address, (active, err) => {
        if(err){
           log(`\x1b[31m[ERROR] \x1b[0m Error pinging Broadlink RM device at ${device.host.address} (${device.host.macAddress || ''}): ${err}`);
           active = false;
        }
        
        if (!active && device.state === 'active' && retryCount === 2) {
          log(`Broadlink RM device at ${device.host.address} (${device.host.macAddress || ''}) is no longer reachable after three attempts.`);

          device.state = 'inactive';
          retryCount = 0;
        } else if (!active && device.state === 'active') {
          if(broadlink.debug) log(`Broadlink RM device at ${device.host.address} (${device.host.macAddress || ''}) is no longer reachable. (attempt ${retryCount})`);

          retryCount += 1;
        } else if (active && device.state !== 'active') {
          if (device.state === 'inactive') log(`Broadlink RM device at ${device.host.address} (${device.host.macAddress || ''}) has been re-discovered.`);

          device.state = 'active';
          retryCount = 0;
        } else if (active && retryCount !== 0 ) {
          //Acive - reset retry counter
          retryCount = 0;
        }
      }, {timeout: pingTimeout})
    } catch (err) {
      log(`\x1b[31m[ERROR] \x1b[0m Error pinging Broadlink RM device at ${device.host.address} (${device.host.macAddress || ''}): ${err}`);
    }
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
