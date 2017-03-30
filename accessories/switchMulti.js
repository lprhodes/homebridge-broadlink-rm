const sendData = require('../helpers/sendData');
const BroadlinkRMAccessory = require('./accessory');

class SwitchMultiAccessory extends BroadlinkRMAccessory {

  constructor (log, config, thermostatData) {
    super(log, config, thermostatData)

    this.sendIndex = 0
    this.switchState = 0
  }

  setSwitchState (hexData, on, callback) {
    const { host, log } = this

    log(`setSwitchState: ${on}`);

    this.switchState = on

    if (on) {
      this.performSend(host, hexData);

      callback()
    } else {
      if (this.performSendTimeout) clearTimeout(this.performSendTimeout)
      this.sendIndex = 0

      callback()
    }
  }

  getSwitchState (callback) {
    this.log(`getSwitchState: ${this.switchState}`);

    callback(null, this.switchState)
  }

  performSend (host, hexData) {
    const { config, log } = this
    let { interval, sendCount } = config

    if (!Array.isArray(hexData)) return log('The "switch-multi" type requires the config value for "data" an array of hex strings.')

    if (!interval) interval = 1

    sendData(host, hexData[this.sendIndex], null, log);

    if (this.sendIndex >= hexData.length -1) {
      if (this.performSendTimeout) clearTimeout(this.performSendTimeout)
      this.sendIndex = 0

      setTimeout(() => {
        this.switchService.setCharacteristic(Characteristic.On, 0);
      }, 100)

      return
    }

    this.performSendTimeout = setTimeout(() => {
      this.sendIndex++
      this.performSend(host, hexData)
    }, interval * 1000)
  }

  getServices () {
    const services = super.getServices();
    const { data, name } = this;

    const service = new Service.Switch(name);
    this.addNameService(service);
    service.getCharacteristic(Characteristic.On)
      .on('set', this.setSwitchState.bind(this, data))
      .on('get', this.getSwitchState.bind(this));
    services.push(service);

    this.switchService = service

    return services;
  }
}

module.exports = SwitchMultiAccessory
