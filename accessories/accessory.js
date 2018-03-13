const uuid = require('uuid');

const { HomebridgeAccessory } = require('homebridge-platform-helper');

const sendData = require('../helpers/sendData');

class BroadlinkRMAccessory extends HomebridgeAccessory {

  constructor (log, config = {}, serviceManagerType) {
    if (config.debug) this.debug = true
    if (!config.name) config.name = "Unknown Accessory"

    config.resendDataAfterReload = config.resendHexAfterReload;

    super(log, config, serviceManagerType);


    this.manufacturer = 'Broadlink';
    this.model = 'RM Mini or Pro';
    this.serialNumber = uuid.v4();
  }

  performSetValueAction ({ host, data, log, name, debug }) {
    sendData({ host, hexData: data, log, name, debug });
  }
}

module.exports = BroadlinkRMAccessory;
