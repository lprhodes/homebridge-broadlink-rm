const getDevice = require('./getDevice');

let closeClient = null;
let timeout = null;
let getDataTimeout = null;

const stop = (log) => {
  // Reset existing learn requests
  if (closeClient) {
    closeClient();
    closeClient = null;

    log(`Learn IR (stopped)`);
  }
}

const start = (host, callback, turnOffCallback, log) => {
  stop()

  // Get the Broadlink device
  const device = getDevice({ host, log, learnOnly: true })
  if (!device) return;
  if (!device.enterLearning) return log(`Learn IR (IR learning not supported for device at ${host})`);

  let onRawData;

  closeClient = (err) => {
    if (timeout) clearTimeout(timeout);
    timeout = null;

    if (getDataTimeout) clearTimeout(getDataTimeout);
    getDataTimeout = null;

    device.removeListener('rawData', onRawData);
  };

  onRawData = (message) => {
    const hex = message.toString('hex');
    log(`Learn IR (learned hex code: ${hex})`);
    log(`Learn IR (complete)`);

    closeClient();
    closeClient = null

    turnOffCallback()
  };

  device.on('rawData', onRawData);

  device.enterLearning()
  log(`Learn IR (ready)`);

  callback();

  getDataTimeout = setTimeout(() => {
    getData(device);
  }, 1000)

  // Timeout the client after 10 seconds
  timeout = setTimeout(() => {
    log('Learn IR (stopped - 10s timeout)')
    closeClient()
    closeClient = null

    turnOffCallback()
  }, 10000); // 10s
}

const getData = (device) => {
  if (getDataTimeout) clearTimeout(getDataTimeout);
  if (!closeClient) return;

  device.checkData()

  getDataTimeout = setTimeout(() => {
    getData(device);
  }, 1000)
}

module.exports = { start, stop }
