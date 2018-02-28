const { HomebridgeAccessory } = require('homebridge-platform-helper');

const sendData = require('../helpers/sendData');

class BroadlinkRMAccessory extends HomebridgeAccessory {

  constructor (log, config) {
    if (config.debug) this.debug = true

    config.resendDataAfterReload = config.resendHexAfterReload;

    super(log, config);

    this.manufacturer = 'Broadlink';
    this.model = 'RM Mini or Pro';
    this.serialNumber = this.host;
  }

  performSetValueAction ({ host, data, log, name, debug }) {
    sendData({ host, hexData: data, log, name, debug });
  }
}

module.exports = BroadlinkRMAccessory;
