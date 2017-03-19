const discoveredDevices = require('./devices.js');

let closeClient = null;
let timeout = null;
let getDataTimeout = null;

const PORT = 80;


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

  const device = discoveredDevices[host];
  if (!device) return log(`LearnIR (no device found at ${host})`);

  closeClient = (err) => {
    if (timeout) clearTimeout(timeout);
    timeout = null;

    if (getDataTimeout) clearTimeout(getDataTimeout);
    getDataTimeout = null;
    // log(`UDP learn server stopped on ${host}:${PORT}`);

    // device.removeListener('rawData');
  }

  // There's no device.removeListener for some reason so this is a quick hack
  // so not to duplicate the listener
  if (!device.hasListener) {
    device.hasListener = true

    device.on('rawData', (message) => {
      const hex = message.toString('hex');
      log(`Learn IR (learned hex code: ${hex})`);
      log(`Learn IR (complete)`);

      closeClient();
      closeClient = null

      turnOffCallback()
    });
  }

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
