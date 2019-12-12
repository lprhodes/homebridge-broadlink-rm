const assert = require('assert')

const { getDevice } = require('./getDevice');
const convertProntoCode = require('./convertProntoCode')

const retryInterval = 3000;
const retryCount = 6;

const sendData = async ({host, hexData, log, name, debug}) => {
  // Will return true on sucess and flase on failure
  assert(hexData && typeof hexData === 'string', `\x1b[31m[ERROR]: \x1b[0m${name} sendData (HEX value is missing)`);

  // Check for pronto code
  if (hexData.substring(0, 4) === '0000') {
    if (debug) log(`\x1b[33m[DEBUG]\x1b[0m ${name} sendHex (Converting Pronto code "${hexData}" to Broadlink code)`);
    hexData = convertProntoCode(hexData);
    if (debug) log(`\x1b[33m[DEBUG]\x1b[0m ${name} sendHex (Pronto code successfuly converted: "${hexData}")`);

    if (!hexData) {
      log(`\x1b[31m[ERROR] \x1b[0m${name} sendData (A Pronto code was detected however its conversion to a Broadlink code failed.)`);
      return false;
    }

  }

  // Get the Broadlink device
  const device = getDevice({ host, log });

  if (!device) {
    if (!host) {
      log(`\x1b[31m[ERROR] \x1b[0m${name} sendData (no device found)`);
      return false;
    }

    log(`\x1b[31m[ERROR] \x1b[0m${name} sendData (no device found at ${host})`);
    return false;
  }

  if (!device.sendData) {
    log(`\x1b[31m[ERROR] \x1b[0mThe device at ${device.host.address} (${device.host.macAddress}) doesn't support the sending of IR or RF codes.`);
    return false;
  }
  if (hexData.includes('5aa5aa555')) {
    log(`\x1b[31m[ERROR] \x1b[0mThis type of hex code (5aa5aa555...) is no longer valid. Use the included "Learn Code" accessory to find new (decrypted) codes.`);
    return false;
  }

  waitForDevice(device, name, log, debug)
  .then(() => {
    const hexDataBuffer = new Buffer(hexData, 'hex');
    device.sendData(hexDataBuffer, debug, hexData);
    log(`${name} sendHex (${device.host.address}; ${device.host.macAddress}) ${hexData}`);
    return true;
  })
  .catch(() => {
    log(`\x1b[31m[ERROR] \x1b[0mThe device at ${device.host.address} (${device.host.macAddress}) is not available.`);
    return false;
  });
  
  return false;
}

const waitForDevice = (device, name, log, debug) => {
  return new Promise(async (res, rej) => {
    let count = 0;

    while (device.state !== 'active' && count < retryCount ) {
      if(debug) log(`\x1b[33m[DEBUG]\x1b[0m ${name} Device ${device.state}, pausing (attempt ${count+1})...`);
      count++;

      await wait(retryInterval);
    }

    if (count >= retryCount) {
      rej();
    }

    res();
  });
}

const wait = delay => {
  return new Promise(res => {
    setTimeout(() => {
      res();
    }, delay);
  });
}

module.exports = sendData
