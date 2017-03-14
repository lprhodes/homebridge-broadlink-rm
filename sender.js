const dgram = require('dgram');

module.exports = (host, payload, callback) => {
  const PORT = 80;

  const broadcast = new Buffer('5aa5aa555aa5aa55000000000000000000000000000000000000000000000000a2f3000037276a00528022a2f00d43b40100000090c80000178a382be0b953f51e066fa79407190dfec18c688af01de0dc428a1f11ace75a10dacb9050c542110e29cc734468d0ae6c476c87c99544bbd0587d14182256eb3b23c674c57d8a2852412c1c335003d6a5fa1d3080c9d1b6210983b3879657a6', 'hex');

  const message = new Buffer(payload, 'hex');

  const client = dgram.createSocket('udp4');

  client.send(broadcast, 0, broadcast.length, PORT, host, (err, bytes) => {
    if (err) throw err;
    console.log(`UDP message sent to ${host}:${PORT}`;

    client.send(message, 0, message.length, PORT, host, (err, bytes) => {
      if (err) throw err;
      console.log(`UDP message sent to ${host}:${PORT}`;

      client.close();

      callback(err);
    });
  });
}
