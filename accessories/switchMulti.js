const sendData = require('../helpers/sendData');
const BroadlinkRMAccessory = require('./accessory');

class SwitchMultiAccessory extends BroadlinkRMAccessory {

  async setSwitchState (hexData, on) {
    const { host } = this;

    if (this.switchState) {
      this.performSend(host, hexData);
    } else {
      if (this.performSendTimeout) clearTimeout(this.performSendTimeout)
      this.sendIndex = 0
    }
  }

  performSend (host, hexData) {
    const { config, log } = this;
    let { interval, sendCount } = config;

    if (!Array.isArray(hexData)) return log('The "switch-multi" type requires the config value for "data" an array of hex strings.')

    if (!interval) interval = 1;

    sendData(host, hexData[this.sendIndex], log);

    if (this.sendIndex >= hexData.length -1) {
      if (this.performSendTimeout) clearTimeout(this.performSendTimeout);

      this.sendIndex = 0;

      setTimeout(() => {
        this.switchService.setCharacteristic(Characteristic.On, 0);
      }, 100);

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
      setValuePromise: this.setSwitchState
    })

    services.push(service);

    this.switchService = service;

    return services;
  }
}

module.exports = SwitchMultiAccessory;
