const sendData = require('../helpers/sendData');
const BroadlinkRMAccessory = require('./accessory');

class FanAccessory extends BroadlinkRMAccessory {

  constructor (log, config, thermostatData) {
    super(log, config, thermostatData)

    this.switchState = 0
    this.swingMode = 0
    this.rotationSpeed = 0
  }

  setRotationSpeed (currentStatus, callback) {
    const { data, host, log } = this
    const { swingToggle } = data

    log(`setRotationSpeed: ${currentStatus}`);

    this.rotationSpeed = currentStatus

    sendData(host, swingToggle, callback, log);
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
    const { on, off, swingToggle } = data

    const service = new Service.Fanv2(name);
    this.addNameService(service);

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.Active,
      propertyName: 'switchState',
      onHex: on,
      offHex: off
    })

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.SwingMode,
      propertyName: 'swingMode',
      onHex: swingToggle,
      offHex: swingToggle
    })

    this.createToggleCharacteristic(Characteristic.RotationSpeed)
      .on('set', this.setRotationSpeed.bind(this))
      .on('get', this.getRotationSpeed.bind(this));

    services.push(service);

    return services;
  }
}

module.exports = FanAccessory
