const { HomebridgeAccessory } = require('homebridge-platform-helper');

class BroadlinkRMAccessory extends HomebridgeAccessory {

  constructor (log, config) {
    super(log, config);

    this.manufacturer = 'Broadlink';
    this.model = 'RM Mini or Pro';
    this.serialNumber = this.host;

    config.resendDataAfterReload = config.resendHexAfterReload;
  }

  performSetValueAction ({ host, data, log, name }) {
    sendData({ host, hexData: data, log, name });
  }
}

module.exports = BroadlinkRMAccessory;
