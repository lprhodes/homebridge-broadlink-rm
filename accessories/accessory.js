const sendData = require('../helpers/sendData');
const persistentState = require('../helpers/persistentState');

const addSaveProxy = (target, saveFunc) => {
  const handler = {
    set (target, key, value) {
      target[key] = value;

      saveFunc(target);

      return true
    }
  }

  return new Proxy(target, handler);
}

class BroadlinkRMAccessory {

  constructor (log, config = {}) {
    let { host, name, data, persistState } = config;

    this.log = log;
    this.config = config;

    this.host = host;
    this.name = name;
    this.data = data;

    // Set defaults
    if (persistState === undefined) persistState = true;

    if (persistState) {
      const restoreStateOrder = this.restoreStateOrder();

      const state = persistentState.load({ host, name }) || {};

      this.state = addSaveProxy(state, (state) => {
        persistentState.save({ host, name, state });
      });

      this.correctReloadedState();
    } else {
      persistentState.clear({ host, name });

      this.state = {};
    }
  }

  restoreStateOrder () { }

  correctReloadedState () { }

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
      const { config, host, log, name } = this;
      const { resendHexAfterReload } = config;

      const capitalizedPropertyName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
      log(`${name} set${capitalizedPropertyName}: ${value}`);

      if (this.state[propertyName] === value && !resendHexAfterReload) {
        log(`${name} set${capitalizedPropertyName}: already ${value}`);

        callback(null, value);

        return;
      }

      const previousValue = this.state[propertyName];
      this.state[propertyName] = value;

      // Set toggle data if this is a toggle
      const hexData = value ? onHex : offHex;

      if (setValuePromise) {
        await setValuePromise(hexData, previousValue);
      } else if (hexData) {
        sendData({ host, hexData, log });
      }

      callback(null, this.state[propertyName]);
    } catch (err) {
      console.log('setCharacteristicValue err', err)

      callback(err)
    }
  }

  async getCharacteristicValue (props, callback) {
    const { propertyName, defaultValue, getValuePromise } = props;
    const { log, name } = this;

    const capitalizedPropertyName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);

    let value = this.state[propertyName];

    if (value === undefined) {
      value = (defaultValue !== undefined) ? defaultValue : 0;

      if (value === 'undefined') value = undefined;
    }

    if (getValuePromise) {
      const promiseValue = await getValuePromise();

      if (promiseValue !== undefined) value = promiseValue;
    }

    log(`${name} get${capitalizedPropertyName}: ${value}`);
    callback(null, value);
  }

  createToggleCharacteristic ({ service, characteristicType, onHex, offHex, propertyName, getValuePromise, setValuePromise, defaultValue }) {
    const { config } = this;

    service.getCharacteristic(characteristicType)
      .on('set', this.setCharacteristicValue.bind(this, { propertyName, onHex, offHex, setValuePromise }))
      .on('get', this.getCharacteristicValue.bind(this, { propertyName, defaultValue, getValuePromise }));

      // If there's already a default loaded from persistent state then set the value
      if (this.state[propertyName] !== undefined) {
        const value = this.state[propertyName]
        this.state[propertyName] = undefined;

        setTimeout(() => {
          service.setCharacteristic(characteristicType, value);
        }, 2000);
      }
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
