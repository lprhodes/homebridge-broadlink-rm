const { getDevice } = require('./getDevice');

let closeClient = null;
let timeout = null;
let getDataTimeout = null;

const stop = (log) => {
  // Reset existing learn requests
  if (!closeClient) return;

  closeClient();
  closeClient = null;

  log(`\x1b[35m[INFO]\x1b[0m Learn Code (stopped)`);
}

const start = (host, callback, turnOffCallback, log, disableTimeout) => {
  stop()

  // Get the Broadlink device
  const device = getDevice({ host, log, learnOnly: true });
  if (!device) {
    return log(`\x1b[31m[ERROR]\x1b[0m Learn Code (Couldn't learn code, device not found)`);
  }

  if (!device.enterLearning) return log(`\x1b[31m[ERROR]\x1b[0m Learn Code (IR learning not supported for device at ${host})`);

  let onRawData;

  closeClient = (err) => {
    if (timeout) clearTimeout(timeout);
    timeout = null;

    if (getDataTimeout) clearTimeout(getDataTimeout);
    getDataTimeout = null;

    device.removeListener('rawData', onRawData);
    device.cancelLearn();
  };

  onRawData = (message) => {
    if (!closeClient) return;

    const hex = message.toString('hex');
    log(`\x1b[35m[RESULT]\x1b[0m Learn Code (learned hex code: ${hex})`);
    log(`\x1b[35m[INFO]\x1b[0m Learn Code (complete)`);

    closeClient();

    turnOffCallback();
  };

  device.on('rawData', onRawData);

  device.enterLearning()
  log(`Learn Code (ready)`);

  if (callback) callback();

  getDataTimeout = setTimeout(() => {
    getData(device);
  }, 1000)

  if (disableTimeout) return;

  // Timeout the client after 10 seconds
  timeout = setTimeout(() => {
    log('\x1b[35m[INFO]\x1b[0m Learn Code (stopped - 10s timeout)');
    device.cancelLearn();

    closeClient();

    turnOffCallback();
  }, 10000); // 10s
}

const getData = (device) => {
  if (getDataTimeout) clearTimeout(getDataTimeout);
  if (!closeClient) return;

  device.checkData()

  getDataTimeout = setTimeout(() => {
    getData(device);
  }, 1000);
}

module.exports = { start, stop }
