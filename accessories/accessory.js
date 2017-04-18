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
    const { name } = this

    this.log(`Identify requested for ${name}`);

    callback();
  }

  getName (callback) {
    const { name } = this

		this.log(`${name} getName: ${name}`);

		callback(null, name);
	}

  addNameService (service) {
    service.getCharacteristic(Characteristic.Name).on('get', this.getName.bind(this));
  }

  async setCharacteristicValue (props, value, callback) {
    try {
      const { propertyName, onHex, offHex, setValuePromise } = props;
      const { host, log, name } = this;

      const capitalizedPropertyName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
      log(`${name} set${capitalizedPropertyName}: ${value}`);

      const previousValue = this[propertyName];
      this[propertyName] = value;

      // Set toggle data if this is a toggle
      const hexData = value ? onHex : offHex;

      if (setValuePromise) {
        await setValuePromise(hexData, previousValue);
      } else if (hexData) {
        sendData({ host, hexData, log });
      }

      callback(null, this[propertyName]);
    } catch (err) {
      console.log('setCharacteristicValue err', err)

      callback(err)
    }
  }

  getCharacteristicValue (propertyName, defaultValue, callback) {
    const { log, name } = this;

    const capitalizedPropertyName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);

    let value = this[propertyName]

    if (value === undefined) {
      value = (defaultValue !== undefined) ? defaultValue : 0

      if (value === 'undefined') value = undefined
    }

    log(`${name} get${capitalizedPropertyName}: ${value}`);
    callback(null, value);
  }

  createToggleCharacteristic ({ service, characteristicType, onHex, offHex, propertyName, setValuePromise, defaultValue }) {
    service.getCharacteristic(characteristicType)
      .on('set', this.setCharacteristicValue.bind(this, { propertyName, onHex, offHex, setValuePromise }))
      .on('get', this.getCharacteristicValue.bind(this, propertyName, defaultValue));
  }

  createDefaultValueGetCharacteristic ({ service, characteristicType, propertyName }) {
    service.getCharacteristic(characteristicType)
      .on('get', (callback) => {
        const value = this.data[propertyName] || 0;

        callback(null, value);
      });
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

module.exports = BroadlinkRMAccessory;
