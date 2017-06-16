const BroadlinkRMAccessory = require('./accessory');
const getDevice = require('../helpers/getDevice');
const sendData = require('../helpers/sendData');

class AirCon2Accessory extends BroadlinkRMAccessory {

  constructor (log, config) {
    super(log, config)

    const { state } = this;
    const { defaultCoolTemperature, defaultHeatTemperature, heatTemperature, minTemperature, maxTemperature, pseudoDeviceTemperature, units } = config

    if (state.currentHeatingCoolingState === undefined) state.currentHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;
    if (state.targetHeatingCoolingState === undefined) state.targetHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;

    config.minTemperature = minTemperature || 0;
    config.maxTemperature = maxTemperature || 30;

    if (config.temperatureDisplayUnits === undefined) config.temperatureDisplayUnits = (units && units.toLowerCase() === 'f') ? Characteristic.TemperatureDisplayUnits.FAHRENHEIT : Characteristic.TemperatureDisplayUnits.CELSIUS;

    // When a temperature hex doesn't exist we try to use the hex set for these
    // default temperatures
    config.defaultCoolTemperature = defaultCoolTemperature || 16;
    config.defaultHeatTemperature = defaultHeatTemperature || 30;

    if (config.pseudoDeviceTemperature < config.minTemperature) throw new Error(`The pseudoDeviceTemperature (${pseudoDeviceTemperature}) must be more than the minTemperature (${config.minTemperature})`);
    if (config.pseudoDeviceTemperature > config.maxTemperature) throw new Error(`The pseudoDeviceTemperature (${pseudoDeviceTemperature}) must be less than the maxTemperature (${config.maxTemperature})`);

    this.callbackQueue = {};
  }

  getServices () {
    const services = super.getServices();
    const { data, config, name } = this;
    const { minTemperature, maxTemperature } = config;

    const service = new Service.Thermostat(name);
    this.addNameService(service);

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.CurrentHeatingCoolingState,
      propertyName: 'currentHeatingCoolingState',
      getValuePromise: this.getCurrentHeatingCoolingState.bind(this)
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.TargetTemperature,
      propertyName: 'targetTemperature',
      setValuePromise: this.setTargetTemperature.bind(this),
      defaultValue: minTemperature
    });

    service
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .on('set', this.setTargetHeatingCoolingState.bind(this));

    service
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', this.getCurrentTemperature.bind(this));

    service
      .getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .on('get', (callback) => callback(config.temperatureDisplayUnits));

    service
      .getCharacteristic(Characteristic.TargetTemperature)
      .setProps({
        minValue: minTemperature,
        maxValue: maxTemperature,
        minStep: 1
      });

    service
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: minTemperature,
        maxValue: maxTemperature,
        minStep: 1
      });

    this.thermostatService = service;
    services.push(service);

    setTimeout(() => {
      this.updateTemperatureUI();
    }, 2000);

    return services;
  }

  updateServiceHeatingCoolingState (value) {
    const { state } = this;

    if (state.currentHeatingCoolingState === value) return;

    setTimeout(() => {
      this.thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState, value);
      this.thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, value);
    }, 200)
  }

  updateTemperatureUI () {
    const { config, host, log, name, state } = this;
    const { pseudoDeviceTemperature, autoHeatTemperature, autoCoolTemperature } = config;

    // Some devices don't include a thermometer
    if (pseudoDeviceTemperature !== undefined) return;

    if (!autoHeatTemperature && !autoCoolTemperature) return;

    this.getCurrentTemperature((err, temperature) => {
      this.thermostatService.setCharacteristic(Characteristic.CurrentTemperature, temperature);

      this.checkTemperatureForAutoOn(temperature);

      setTimeout(() => {
        this.updateTemperatureUI();
      }, 10 * 1000);
    })
  }

  // Thermostat
  sendTemperature (temperature, previousTemperature) {
    const { config, data, host, log, name, state } = this;
    const { defaultHeatTemperature, defaultCoolTemperature, heatTemperature } = config;

    log(`${name} Potential sendTemperature (${temperature})`);

    let hasTemperatureChanged = (previousTemperature !== temperature);
    let hexData = data[`temperature${temperature}`];

    // You may not want to set the hex data for every single mode...
    if (!hexData) {
      const defaultTemperature = (temperature >= heatTemperature) ? defaultHeatTemperature : defaultCoolTemperature;
      hexData = data[`temperature${defaultTemperature}`];

      if (!hexData) {
        const error = Error(`You need to set the defaultHeatTemperature and defaultCoolTemperature or provide a hex code for the given mode/temperature:
          ({ "temperature${temperature}": { "data": "HEXCODE", "pseudo-mode" : "auto/heat/cool" } })
          or at the very least, the default mode/temperature
          ({ "temperature${defaultTemperature}": { "data": "HEXCODE", "pseudo-mode" : "auto/heat/cool" } })`);

        throw new Error(`${name} ${error.message}`);
      }

      hasTemperatureChanged = (state.targetTemperature !== defaultTemperature);
      this.log(`${name} Update to default temperature (${defaultTemperature})`);

      state.targetTemperature = defaultTemperature;
    } else {
      state.targetTemperature = temperature;
    }

    if (!hasTemperatureChanged && state.currentHeatingCoolingState !== Characteristic.TargetHeatingCoolingState.OFF) return;

    const mode = hexData['pseudo-mode'];
    this.log(`${name} sendTemperature (${state.targetTemperature}, ${mode})`);
    this.thermostatService.setCharacteristic(Characteristic.TargetTemperature, state.targetTemperature);

    state.lastUsedTemperature = state.targetTemperature;
    sendData({ host, hexData: hexData.data, log, name });
  }

	getCurrentHeatingCoolingState () {
    const { state } = this;
	}

  setTargetHeatingCoolingState(value, callback) {  
    const { config, data, host, log, name, state } = this;     
    switch(value) {
      case Characteristic.CurrentHeatingCoolingState.OFF:
      this.log(`${name} Setting Mode = OFF` + value); 
      sendData({ host, hexData: data["off"], log, name });
      break;        
      case Characteristic.CurrentHeatingCoolingState.HEAT:
      this.log(`${name} Setting Mode = HEAT` + value); 
      sendData({ host, hexData: data["heat"], log, name });
      break;
      case Characteristic.CurrentHeatingCoolingState.COOL:
      this.log(`${name} Setting Mode = COOL` + value); 
      sendData({ host, hexData: data["cool"], log, name });
      break;
      case Characteristic.CurrentHeatingCoolingState.AUTO:
      case 3: // Characteristic.CurrentHeatingCoolingState.AUTO is undefined?
      this.log(`${name} Setting Mode = AUTO` + value);
      sendData({ host, hexData: data["auto"], log, name }); 
      break;
      default:
      this.log(this.logPrefix + ": Unknown state sent to setTargetHeatingCoolingState (" + value + ")" + " - defaulted to OFF");
      sendData({ host, hexData: data["off"], log, name });
      break;
    }
    callback(null);
  }


	getCurrentTemperature (callback) {
    const { config, host, log, name, state } = this;
    const { pseudoDeviceTemperature } = config;

    // Some devices don't include a thermometer
    if (pseudoDeviceTemperature !== undefined) {
      log(`${name} getCurrentTemperature (using ${pseudoDeviceTemperature} from config)`);

      return callback(null, pseudoDeviceTemperature);
    }

	}

	setTargetTemperature (hexData, previousValue) {
    const { config, log, name, state } = this;
    const { minTemperature, maxTemperature } = config;

    if (state.targetTemperature < minTemperature) return log(`The target temperature (${this.targetTemperature}) must be more than the minTemperature (${minTemperature})`);
    if (state.targetTemperature > maxTemperature) return log(`The target temperature (${this.targetTemperature}) must be less than the maxTemperature (${maxTemperature})`);

    if (state.targetTemperature === previousValue) return

    this.sendTemperature(state.targetTemperature, previousValue);
	}

  configKeyForCurrentHeatingCoolingState () {
    const { state } = this;

    return this.configKeyForHeatingCoolingState(state.currentHeatingCoolingState);
  }

  configKeyForHeatingCoolingState (state) {
    switch (state) {
      case Characteristic.TargetHeatingCoolingState.AUTO:
        return 'auto';
      case Characteristic.TargetHeatingCoolingState.COOL:
        return 'cool';
      case Characteristic.TargetHeatingCoolingState.HEAT:
        return 'heat';
      default:
        return 'off';
    }
  }

  heatingCoolingStateForConfigKey (configKey) {
    switch (configKey) {
      case 'off':
        return Characteristic.TargetHeatingCoolingState.OFF;
      case 'cool':
        return Characteristic.TargetHeatingCoolingState.COOL;
      case 'heat':
        return Characteristic.TargetHeatingCoolingState.HEAT;
      default:
        return Characteristic.TargetHeatingCoolingState.AUTO;
    }
  }
}

module.exports = AirCon2Accessory