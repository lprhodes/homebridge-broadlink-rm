const sendData = require('../helpers/sendData');
const BroadlinkRMAccessory = require('./accessory');

class SwitchAccessory extends BroadlinkRMAccessory {

  constructor (log, config, thermostatData) {
    super(log, config, thermostatData)

    this.switchState = 0
  }

  setSwitchState (currentStatus, callback) {
    const { data, host, log } = this
    const { on, off } = data

    log(`setSwitchState: ${currentStatus}`);

    const hexData = currentStatus ? on : off;
    this.switchState = currentStatus

    sendData(host, hexData, callback, log);
  }

  getSwitchState (callback) {
    this.log(`getSwitchState: ${this.switchState}`);

    callback(null, this.switchState)
  }

  getServices () {
    const services = super.getServices();
    const { name } = this;

    const service = new Service.Switch(name);
    this.addNameService(service);
    service.getCharacteristic(Characteristic.On)
      .on('set', this.setSwitchState.bind(this))
      .on('get', this.getSwitchState.bind(this));

    services.push(service);

    return services;
  }
}

module.exports = SwitchAccessory
