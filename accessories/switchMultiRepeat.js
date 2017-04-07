const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration')
const BroadlinkRMAccessory = require('./accessory');

class SwitchMultiAccessory extends BroadlinkRMAccessory {

  constructor (log, config = {}) {
    super(log, config)

    const { data } = this

    if (!Array.isArray(data)) return log('The "switch-multi-repeat" type requires the config value for "data" an array of objects.')

    const nonObjects = data.filter(obj => typeof obj !== 'object')
    if (nonObjects.length > 0) return log('The "switch-multi-repeat" type requires the config value for "data" an array of objects.')
  }

  async setSwitchState () {
    if (this.switchState) this.performSend();
  }

  async performSend (hexConfig) {
    const { config, data, log } = this;
    let { disableAutomaticOff, interval, sendCount } = config;

    if (!interval) interval = 1;

    // Itterate through each hex config in the array
    for (let index = 0; index < data.length; index++) {
      await this.performRepeatSend(data[index]);

      if (index < data.length - 1) await delayForDuration(interval);
    }

    if (!disableAutomaticOff) {
      await delayForDuration(0.1);

      this.switchService.setCharacteristic(Characteristic.On, 0);
    }
  }

  async performRepeatSend (hexConfig) {
    const { host, log } = this;
    let { data, interval, sendCount } = hexConfig;

    interval = interval || 1;

    // Itterate through each hex config in the array
    for (let index = 0; index < sendCount; index++) {
      sendData({ host, hexData: data, log });

      if (index < sendCount - 1) await delayForDuration(interval);
    }
  }

  getServices () {
    const services = super.getServices();
    const { data, name } = this;

    const service = new Service.Switch(name);
    this.addNameService(service);

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.On,
      propertyName: 'switchState',
      onHex: data,
      setValuePromise: this.setSwitchState.bind(this)
    })

    services.push(service);

    this.switchService = service;

    return services;
  }
}

module.exports = SwitchMultiAccessory;
