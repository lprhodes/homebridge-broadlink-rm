const sendData = require('../helpers/sendData');
const BroadlinkRMAccessory = require('./accessory');

class ChannelAccessory extends BroadlinkRMAccessory {

  setChannel (hexData, channel, callback) {
    const { host, log, name } = this;

    log(`setChannel: ${channel}`);
    sendData({ host, hexData: hexData[channel], callback, log, name });
  }

  getServices () {
    const services = super.getServices();
    const { data, name } = this;

    const service = new Service.Channel(name);
    this.addNameService(service);
    service.getCharacteristic(Characteristic.ChannelState).on('set', this.setChannel.bind(this, data));

    return services;
  }
}

module.exports = ChannelAccessory
