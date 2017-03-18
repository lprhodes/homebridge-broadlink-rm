const dgram = require('dgram');

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

  const learn = new Buffer('5aa5aa555aa5aa55000000000000000000000000000000000000000000000000ebd100002a276a00fd8228d7e734ea3401000000b2be000067d80ec677be29b99fb1b17a690ca2a1', 'hex');

  const client = dgram.createSocket('udp4');
  closeClient = (err) => {
    if (timeout) clearTimeout(timeout);
    timeout = null;

    if (getDataTimeout) clearTimeout(getDataTimeout);
    getDataTimeout = null;
    client.close();
    // log(`UDP learn server stopped on ${host}:${PORT}`);
  }

  client.on('listening', () => {
    const address = client.address();
    // log(`UDP learn server listening on ${host}:${PORT}`);
  });

  client.on('message', (message, remote) => {
    const hex = message.toString('hex');

    if (hex.length > 144) {
      log(`Learn IR (learned hex code: ${hex})`);
      log(`Learn IR (complete)`);

      closeClient();
      closeClient = null

      turnOffCallback()
    }
  });


  client.send(learn, 0, learn.length, PORT, host, (err, bytes) => {
    if (err) throw err;
    log(`Learn IR (ready)`);
    // log(`UDP learn message sent to ${host}:${PORT}`);

    callback();

    getData(client, host);

    // Timeout the client after 10 seconds
    timeout = setTimeout(() => {
      log('Learn IR (stopped - 10s timeout)')
      closeClient()
      closeClient = null

      turnOffCallback()
    }, 10000); // 10s
  });
}

const getData = (client, host) => {
  if (getDataTimeout) clearTimeout(getDataTimeout);
  if (!closeClient) return;

  const getDataHex = new Buffer('5aa5aa555aa5aa5500000000000000000000000000000000000000000000000064d300002a276a00698328d7e734ea3401000000b3be000037f3d5e05e99e3e330f1df6eca06e2ac', 'hex');
  client.send(getDataHex, 0, getDataHex.length, PORT, host, (err, bytes) => { });

  getDataTimeout = setTimeout(() => {
    getData(client, host);
  }, 1000)
}

module.exports = { start, stop }
