const getDevice = require('./getDevice');

let closeClient = null;
let isClosingClient = false;
let timeout = null;
let getDataTimeout = null;
let getDataTimeout2 = null;
let getDataTimeout3 = null;

let currentDevice

const stop = (log, device) => {
  // Reset existing learn requests
  if (!closeClient || isClosingClient) return;

  isClosingClient = true;

  if (currentDevice) currentDevice.cancelRFSweep();

  setTimeout(() => {
    closeClient();
    closeClient = null;
    isClosingClient = false;

    if (log) log(`Scan RF (stopped)`);
  }, 500)
}

const start = (host, callback, turnOffCallback, log, disableTimeout) => {
  stop()

  // Get the Broadlink device
  const device = getDevice({ host, log, learnOnly: true })
  if (!device) return;
  if (!device.enterLearning) return log(`Learn Code (IR learning not supported for device at ${host})`);
  if (!device.enterRFSweep) return log(`Scan RF (RF learning not supported for device at ${host})`);

  currentDevice = device

  let onRawData;
  let onRawData2;
  let onRawData3;

  closeClient = (err) => {
    if (timeout) clearTimeout(timeout);
    timeout = null;

    if (getDataTimeout) clearTimeout(getDataTimeout);
    getDataTimeout = null;

    if (getDataTimeout2) clearTimeout(getDataTimeout2);
    getDataTimeout2 = null;

    if (getDataTimeout3) clearTimeout(getDataTimeout3);
    getDataTimeout2 = null;


    device.removeListener('rawRFData', onRawData);
    device.removeListener('rawRFData2', onRawData2);
    device.removeListener('rawData', onRawData3);
  };

  onRawData = (message) => {
    if (!closeClient) return;

    if (getDataTimeout) clearTimeout(getDataTimeout);
    getDataTimeout = null;

    log(`Scan RF (found frequency - 1 of 2)`);
    log(`[Keep holding that button!]`)

    getDataTimeout2 = setTimeout(() => {
      getData2(device);
    }, 1000);
  };

  onRawData2 = (message) => {
    if (!closeClient) return;

    if (getDataTimeout2) clearTimeout(getDataTimeout2);
    getDataTimeout = null;

    log(`Scan RF (found frequency - 2 of 2)`)
    log(`[Press the RF button multiple times with a pause between them]`);

    getDataTimeout3 = setTimeout(() => {
      getData3(device);
    }, 1000);
  };

  onRawData3 = (message) => {
    if (!closeClient) return;

    const hex = message.toString('hex');
    log(`Scan RF (complete)`);
    log(`[Hex Code: ${hex}]`);

    device.cancelRFSweep();

    closeClient();

    turnOffCallback();
  };

  device.on('rawRFData', onRawData);
  device.on('rawRFData2', onRawData2);
  device.on('rawData', onRawData3);

  device.enterRFSweep();
  log(`Scan RF (scanning)`);
  log(`[Hold down the button that sends the RF frequency]`);

  if (callback) callback();

  getDataTimeout = setTimeout(() => {
    getData(device);
  }, 1000);

  if (disableTimeout) return;

  // Timeout the client after 20 seconds
  timeout = setTimeout(() => {
    device.cancelRFSweep()

    setTimeout(() => {
      log('Scan RF (stopped - 20s timeout)');
      closeClient();

      turnOffCallback();
    }, 1000);
  }, 20 * 1000); // 20s
}

const getData = (device) => {
  if (getDataTimeout) clearTimeout(getDataTimeout);
  if (!closeClient) return;

  device.checkRFData();

  getDataTimeout = setTimeout(() => {
    getData(device);
  }, 1000);
}

const getData2 = (device) => {
  if (getDataTimeout2) clearTimeout(getDataTimeout2);
  if (!closeClient) return;

  device.checkRFData2();

  getDataTimeout2 = setTimeout(() => {
    getData2(device);
  }, 1000);
}

const getData3 = (device) => {
  if (getDataTimeout3) clearTimeout(getDataTimeout3);
  if (!closeClient) return;

  device.checkData()

  getDataTimeout3 = setTimeout(() => {
    getData3(device);
  }, 1000);
}

module.exports = { start, stop }
