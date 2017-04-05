const sendData = require('../helpers/sendData');
const BroadlinkRMAccessory = require('./accessory');

class FanAccessory extends BroadlinkRMAccessory {

  constructor (log, config, thermostatData) {
    super(log, config, thermostatData)

    this.switchState = 0
    this.swingMode = 0
    this.rotationSpeed = 0
  }

  setSwitchState (onHex, offHex, currentStatus, callback) {
    const { host, log } = this

    log(`setSwitchState: ${currentStatus}`);

    const hexData = currentStatus ? onHex : offHex;
    this.switchState = currentStatus

    sendData(host, hexData, callback, log);
  }

  setSwingMode (toggleSwingHex, currentStatus, callback) {
    const { host, log } = this

    log(`setSwingMode: ${currentStatus}`);

    const hexData = toggleSwingHex;
    this.swingMode = currentStatus

    sendData(host, hexData, callback, log);
  }

  setRotationSpeed (toggleSpeedHex, currentStatus, callback) {
    const { host, log } = this

    log(`setRotationSpeed: ${currentStatus}`);

    const hexData = toggleSpeedHex
    this.rotationSpeed = currentStatus

    sendData(host, hexData, callback, log);
  }

  getSwitchState (callback) {
    this.log(`getSwitchState: ${this.switchState}`);
    callback(null, this.switchState)
  }
  getSwingMode (callback) {
    this.log(`getSwingMode: ${this.swingMode}`);
    callback(null, this.swingMode)
  }
  getRotationSpeed (callback) {
    this.log(`getRotationSpeed: ${this.rotationSpeed}`);
    callback(null, this.rotationSpeed)
  }

  getServices () {
    const services = super.getServices();
    const { data, name } = this;

    const service = new Service.Fanv2(name);
    this.addNameService(service);

    service.getCharacteristic(Characteristic.Active)
    .on('set', this.setSwitchState.bind(this, data.on, data.off))
    .on('get', this.getSwitchState.bind(this));

    service.getCharacteristic(Characteristic.RotationSpeed)
    .on('set', this.setRotationSpeed.bind(this, data.speedToggle))
    .on('get', this.getRotationSpeed.bind(this));

    service.getCharacteristic(Characteristic.SwingMode)
    .on('set', this.setSwingMode.bind(this, data.swingToggle))
    .on('get', this.getSwingMode.bind(this));

    services.push(service);

    return services;
  }
}

module.exports = FanAccessory
