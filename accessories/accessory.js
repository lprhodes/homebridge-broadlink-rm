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

  async setCharacteristicValue (props, on, callback) {
    try {
      const { propertyName, onHex, offHex, setValuePromise } = props;
      const { host, log } = this;

      const capitalizedPropertyName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
      log(`set${capitalizedPropertyName}: ${on}`);

      this[propertyName] = on;

      const hexData = on ? onHex : offHex;

      if (setValuePromise) {
        await setValuePromise(hexData);
      } else if (hexData) {
        sendData(host, hexData, log);
      }

      callback(null, this[propertyName]);
    } catch (err) {
      console.log('setCharacteristicValue err', err)

      callback(err)
    }
  }

  getCharacteristicValue (propertyName, callback) {
    const { log } = this;

    const capitalizedPropertyName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
    log(`get${capitalizedPropertyName}: ${this[propertyName]}`);

    callback(null, this[propertyName]);
  }

  createToggleCharacteristic ({ service, characteristicType, onHex, offHex, propertyName, setValuePromise }) {
    service.getCharacteristic(characteristicType)
      .on('set', this.setCharacteristicValue.bind(this, { propertyName, onHex, offHex, setValuePromise }))
      .on('get', this.getCharacteristicValue.bind(this, propertyName));
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
