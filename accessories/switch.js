const sendData = require('../helpers/sendData');
const BroadlinkRMAccessory = require('./accessory');

class SwitchAccessory extends BroadlinkRMAccessory {

  constructor (log, config, thermostatData) {
    super(log, config, thermostatData)

    this.switchState = 0
  }

  setSwitchState (onHex, offHex, currentStatus, callback) {
    const { host, log } = this

    log(`setSwitchState: ${currentStatus}`);

    const hexData = currentStatus ? onHex : offHex;
    this.switchState = currentStatus

    sendData(host, hexData, callback, log);
  }

  getSwitchState (callback) {
    this.log(`getSwitchState: ${this.switchState}`);

    callback(null, this.switchState)
  }

  getServices () {
    const services = super.getServices();
    const { data, name } = this;

    const service = new Service.Switch(name);
    this.addNameService(service);
    service.getCharacteristic(Characteristic.On)
      .on('set', this.setSwitchState.bind(this, data.on, data.off))
      .on('get', this.getSwitchState.bind(this));
    services.push(service);

    return services;
  }
}

module.exports = SwitchAccessory
