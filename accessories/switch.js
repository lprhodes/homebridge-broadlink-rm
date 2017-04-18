const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration')
const BroadlinkRMAccessory = require('./accessory');

class SwitchAccessory extends BroadlinkRMAccessory {

  async setSwitchState (hexData) {
    const { config, data, host, log } = this;
    let { disableAutomaticOff, onDuration } = config;

    // Set defaults
    if (disableAutomaticOff === undefined) disableAutomaticOff = true;
    if (!onDuration) onDuration = 60;

    if (hexData) sendData({ host, hexData, log });

    if (this.switchState && !disableAutomaticOff) {
      delayForDuration(onDuration).then(() => {
        this.switchService.setCharacteristic(Characteristic.On, 0);
      })
    }
  }

  getServices () {
    const services = super.getServices();

    const { data, name } = this;
    const { on, off } = data;

    const service = new Service.Switch(name);
    this.addNameService(service);

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.On,
      propertyName: 'switchState',
      onHex: on,
      offHex: off,
      setValuePromise: this.setSwitchState.bind(this)
    });

    this.switchService = service;

    services.push(service);

    return services;
  }
}

module.exports = SwitchAccessory;
