const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const SwitchAccessory = require('./switch');

class SwitchMultiAccessory extends SwitchAccessory {

  constructor (log, config = {}) {
    super(log, config)

    const { data } = this

    if (!Array.isArray(data)) return log('The "switch-multi-repeat" type requires the config value for "data" an array of objects.')

    const nonObjects = data.filter(obj => typeof obj !== 'object')
    if (nonObjects.length > 0) return log('The "switch-multi-repeat" type requires the config value for "data" an array of objects.')
  }

  checkStateWithPing () { }

  async setSwitchState (hexData) {
    if (hexData) this.performSend(hexData);
  }

  async performSend (data) {
    const { name, config, log, state } = this;
    let { interval, pause, sendCount } = config;

    // Set defaults
    if (!interval) interval = 1;

    // Itterate through each hex config in the array
    for (let index = 0; index < data.length; index++) {
      const { pause } = data[index]

      await this.performRepeatSend(data[index]);

      if (pause) {
        await delayForDuration(pause);
      } else if (index < data.length - 1) {
        await delayForDuration(interval);
      }
    }

    this.checkAutoOff();
    this.checkAutoOn();
  }

  async performRepeatSend (hexConfig) {
    const { host, log, name, debug } = this;
    let { data, interval, sendCount } = hexConfig;

    interval = interval || 1;

    // Itterate through each hex config in the array
    for (let index = 0; index < sendCount; index++) {
      sendData({ host, hexData: data, log, name, debug });

      if (index < sendCount - 1) await delayForDuration(interval);
    }
  }

  getServices () {
    const services = super.getInformationServices();
    const { data, name } = this;

    const service = new Service.Switch(name);
    this.addNameService(service);

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.On,
      propertyName: 'switchState',
      onData: Array.isArray(data) ? data : data.on,
      offData: Array.isArray(data) ? undefined : data.off,
      setValuePromise: this.setSwitchState.bind(this)
    })

    services.push(service);

    this.switchService = service;

    return services;
  }
}

module.exports = SwitchMultiAccessory;
