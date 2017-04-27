const sendData = require('../helpers/sendData');
const persistentState = require('../helpers/persistentState');

const addSaveProxy = (name, target, saveFunc) => {
  const handler = {
    set (target, key, value) {
      target[key] = value;

      // console.log(`${name} save ${key} ${value}`, target)
      saveFunc(target);

      return true
    }
  }

  return new Proxy(target, handler);
}

class BroadlinkRMAccessory {

  constructor (log, config = {}) {
    let { disableLogs, host, name, data, persistState } = config;


    this.log = !disableLogs ? log : () => {};
    this.config = config;

    this.host = host;
    this.name = name;
    this.data = data;

    // Set defaults
    if (persistState === undefined) persistState = true;

    if (persistState) {
      this.isReloadingState = true;

      const restoreStateOrder = this.restoreStateOrder();

      const state = persistentState.load({ host, name }) || {};
      this.correctReloadedState(state);

      this.state = addSaveProxy(name, state, (state) => {
        persistentState.save({ host, name, state });
      });

      setTimeout(() => {
        this.isReloadingState = false;
      }, 2300);
    } else {
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
      const { propertyName, onHex, offHex, setValuePromise, ignorePreviousValue } = props;
      const { config, host, log, name } = this;
      const { resendHexAfterReload } = config;

      const capitalizedPropertyName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
      log(`${name} set${capitalizedPropertyName}: ${value} (isReloadingState: ${this.isReloadingState})`);

      const previousValue = this.state[propertyName];
      this.state[propertyName] = value;

      if ((!ignorePreviousValue && this.state[propertyName] === value && !this.isReloadingState) || (this.isReloadingState && !resendHexAfterReload)) {
        log(`${name} set${capitalizedPropertyName}: already ${value}`);

        callback(null, value);

        return;
      }

      // Set toggle data if this is a toggle
      const hexData = value ? onHex : offHex;

      if (setValuePromise) {
        await setValuePromise(hexData, previousValue);
      } else if (hexData) {
        sendData({ host, hexData, log, name });
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

  createToggleCharacteristic ({ service, characteristicType, onHex, offHex, propertyName, getValuePromise, setValuePromise, defaultValue, ignorePreviousValue }) {
    const { config } = this;

    service.getCharacteristic(characteristicType)
      .on('set', this.setCharacteristicValue.bind(this, { propertyName, onHex, offHex, setValuePromise, ignorePreviousValue }))
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
