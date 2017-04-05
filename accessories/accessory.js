const sendData = require('../helpers/sendData');

class BroadlinkRMAccessory {

  constructor (log, config = {}) {
    const { host, name, data } = config;

    this.log = log;
    this.config = config;

    this.host = host;
    this.name = name;
    this.data = data;
  }

  identify (callback) {
    this.log(`Identify requested for ${this.name}`);

    callback();
  }

  getName (name, callback) {
		this.log(`getName: ${name}`);

		callback(null, name);
	}

  addNameService (service) {
    const { name } = this

    service.getCharacteristic(Characteristic.Name).on('get', this.getName.bind(this, name));
  }

  async setToggleValue (props, on, callback) {
    const { propertyName, onHex, offHex, setTogglePromise } = props
    const { host, log } = this

    const capitalizedPropertyName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
    log(`set${capitalizedPropertyName}: ${currentStatus}`);

    this[propertyName] = on

    const hexData = on ? onHex : offHex

    if (setTogglePromise) {
      await setTogglePromise(hexData)

      callback(null, this[propertyName])
    } else {
      sendData(host, hexData, callback, log);
    }
  }

  getToggleValue (propertyName, callback) {
    const { log } = this

    const capitalizedPropertyName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
    log(`get${capitalizedPropertyName}: ${currentStatus}`);

    callback(null, this[propertyName])
  }

  createToggleCharacteristic ({ service, characteristicType, onHex, offHex, propertyName, setTogglePromise }) {
    service.getCharacteristic(characteristicType)
      .on('set', this.setToggleValue.bind(this, { propertyName, onHex, offHex, setTogglePromise }))
      .on('get', this.getToggleValue.bind(this, propertyName));
  }

  getServices () {
    const informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Broadlink')
      .setCharacteristic(Characteristic.Model, 'RM Mini or Pro')
      .setCharacteristic(Characteristic.SerialNumber, this.host);

    return [ informationService ];
  }
}

module.exports = BroadlinkRMAccessory
