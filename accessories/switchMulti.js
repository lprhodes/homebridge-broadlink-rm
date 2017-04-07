const sendData = require('../helpers/sendData');
const BroadlinkRMAccessory = require('./accessory');

class SwitchMultiAccessory extends BroadlinkRMAccessory {

  async setSwitchState () {
    const { data, host } = this;

    this.sendIndex = this.sendIndex || 0

    if (this.switchState) {
      this.performSend(host, data);
    } else {
      if (this.performSendTimeout) clearTimeout(this.performSendTimeout)

      this.sendIndex = 0
    }
  }

  performSend (host, hexData) {
    const { config, log } = this;
    let { disableAutomaticOff, interval, sendCount } = config;

    if (!Array.isArray(hexData)) return log('The "switch-multi" type requires the config value for "data" an array of hex strings.')

    if (!interval) interval = 1;

    sendData({ host, hexData: hexData[this.sendIndex], log });

    if (this.sendIndex >= hexData.length -1) {
      if (this.performSendTimeout) clearTimeout(this.performSendTimeout);

      this.sendIndex = 0;

      if (!disableAutomaticOff) {
        setTimeout(() => {
          this.switchService.setCharacteristic(Characteristic.On, 0);
        }, 100);
      }

      return;
    }

    this.performSendTimeout = setTimeout(() => {
      this.sendIndex++;

      this.performSend(host, hexData);
    }, interval * 1000);
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
