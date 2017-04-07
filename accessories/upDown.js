const sendData = require('../helpers/sendData');
const BroadlinkRMAccessory = require('./accessory');

class UpDownAccessory extends BroadlinkRMAccessory {

  setUpDown (hexData, value, callback) {
    const { host, log } = this;

    if (value === 0) return callback()

    let type

    if (value > 0) {
      log(`setUpDownState (up)`);
      type = 'up'
    } else {
      log(`setUpDownState (down)`);
      type='down'
    }

    sendData({ host, hexData: hexData[type], log });
  }

  getServices () {
    const services = super.getServices();
    const { data, name } = this;

    const service = new Service.UpDown(name);
    this.addNameService(service);
    service.getCharacteristic(Characteristic.UpDownState).on('set', this.setUpDown.bind(this, data));

    return services;
  }
}

module.exports = UpDownAccessory
