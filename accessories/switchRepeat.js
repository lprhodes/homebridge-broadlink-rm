const sendData = require('../helpers/sendData');
const BroadlinkRMAccessory = require('./accessory');

class SwitchRepeatAccessory extends BroadlinkRMAccessory {

  constructor (log, config, thermostatData) {
    super(log, config, thermostatData)

    this.sendCount = 0
    this.switchState = 0
  }

  setSwitchState (on, callback) {
    const { data, host, log } = this

    log(`setSwitchState: ${on}`);

    this.switchState = on

    if (on) {
      this.performSend(host, data);

      callback()
    } else {
      if (this.performSendTimeout) clearTimeout(this.performSendTimeout)
      this.sendCount = 0

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

    if (!interval) interval = 1

    sendData(host, hexData, null, log);
    this.sendCount++

    if (this.sendCount >= sendCount) {
      if (this.performSendTimeout) clearTimeout(this.performSendTimeout)
      this.sendCount = 0

      setTimeout(() => {
        this.switchService.setCharacteristic(Characteristic.On, 0);
      }, 100)
      return
    }

    this.performSendTimeout = setTimeout(() => {
      this.performSend(host, hexData)
    }, interval * 1000)
  }

  getServices () {
    const services = super.getServices();
    const { data, name } = this;

    const service = new Service.Switch(name);
    this.addNameService(service);
    service.getCharacteristic(Characteristic.On)
      .on('set', this.setSwitchState.bind(this))
      .on('get', this.getSwitchState.bind(this));

    services.push(service);

    this.switchService = service

    return services;
  }
}

module.exports = SwitchRepeatAccessory
