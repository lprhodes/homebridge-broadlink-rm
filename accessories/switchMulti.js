const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration')
const BroadlinkRMAccessory = require('./accessory');

class SwitchMultiAccessory extends BroadlinkRMAccessory {

  constructor (log, config = {}) {
    super(log, config)

    const { data } = this

    if (!Array.isArray(data)) return log('The "switch-multi" type requires the config value for "data" to be an array of hex codes.')
  }

  async setSwitchState (hexData) {
    if (hexData) this.performSend(hexData);
  }

  async performSend (data) {
    const { config, host, log, name, state } = this;
    let { disableAutomaticOff, interval } = config;

    // Itterate through each hex config in the array
    for (let index = 0; index < data.length; index++) {
      const hexData = data[index]

      sendData({ host, hexData, log, name });

      if (index < data.length - 1) await delayForDuration(interval);
    }

    if (state.switchState && !disableAutomaticOff) {
      await delayForDuration(0.1);

      this.switchService.setCharacteristic(Characteristic.On, 0);
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
