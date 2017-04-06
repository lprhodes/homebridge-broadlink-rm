const assert = require('assert')

const discoveredDevices = require('./devices.js');

function sendData(host, payload, log, callback) {
  if (payload instanceof Array) {
    if (payload.length > 0) {
      sendData(host,payload[0],log,function(){
        sendData(host,payload.slice(1),log,callback)
      })
    }    
  } 
  if (!(payload instanceof Array) && payload instanceof Object) {
    if (payload.repeat) {
      const repeatedPayload = []
      const payloadClone = JSON.parse(JSON.stringify(payload))
      delete payloadClone.repeat
      for (let i =0; i< payload.repeat; i++) {
        repeatedPayload.push(payloadClone);
      }
      sendData(host,repeatedPayload,log,callback)
    } else {
      if (payload.waitAfter) {
        sendData(host,payload.hex,log,null)
        setTimeout(function(){
          callback()
        },payload.waitAfter)        
      }    
    }
    
  }
  if (typeof payload === 'string') {
    // Get the Broadlink device, use the first one of no host is provided
    let device;

    if (host) {
      device = discoveredDevices[host];
    } else {
      const hosts = Object.keys(discoveredDevices);
      if (hosts.length === 0) return log(`Send data (no devices found)`);

      device = discoveredDevices[hosts[0]];
    }

    if (!device) return log(`Send data (no device found at ${host})`);

    const macAddressParts = device.mac.toString('hex').match(/[\s\S]{1,2}/g) || []
    const macAddress = macAddressParts.join(':')

    if (!device.sendData) {
      log(`[ERROR] The device at ${device.host.address} (${macAddress}) doesn't support the sending of IR or RF codes.`);

      return
    }

    if (payload.includes('5aa5aa555')) {
      log('[ERROR] This type of hex code (5aa5aa555...) is no longer valid. Use the included "Learn IR" accessory to find new (decrypted) codes.');

      return
    }
    
    const packet = new Buffer(payload, 'hex');
    device.sendData(packet);
    

    log(`Payload message sent to Broadlink RM device (${device.host.address}; ${macAddress})`);
    if (typeof callback == 'function') {
      callback()
    }
  }
}

module.exports = sendData
