const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration')
const SwitchAccessory = require('./switch');

class SwitchMultiAccessory extends SwitchAccessory {

  constructor (log, config = {}) {
    super(log, config)

    const { data } = this

    if (!Array.isArray(data)) return log('The "switch-multi" type requires the config value for "data" to be an array of hex codes.')
  }

  checkStateWithPing () { }

  async setSwitchState (hexData) {
    if (hexData) this.performSend(hexData);
  }

  async performSend (data) {
    const { config, host, log, name, state, debug } = this;
    let { interval } = config;


    // Itterate through each hex config in the array
    for (let index = 0; index < data.length; index++) {
      const hexData = data[index]

      sendData({ host, hexData, log, name, debug });

      if (index < data.length - 1) await delayForDuration(interval);
    }

    this.checkAutoOff();
    this.checkAutoOn();
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
