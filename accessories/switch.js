const sendData = require('../helpers/sendData');
const BroadlinkRMAccessory = require('./accessory');

class SwitchAccessory extends BroadlinkRMAccessory {

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
      offHex: off
    });

    services.push(service);

    return services;
  }
}

module.exports = SwitchAccessory;
