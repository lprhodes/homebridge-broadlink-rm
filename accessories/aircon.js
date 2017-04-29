const BroadlinkRMAccessory = require('./accessory');
const getDevice = require('../helpers/getDevice');
const sendData = require('../helpers/sendData');

class AirConAccessory extends BroadlinkRMAccessory {

  correctReloadedState (state) {
    state.lastUsedHeatingCoolingState = undefined;
    state.lastUsedTemperature = undefined;

    if (state.currentHeatingCoolingState === 0)  {
      state.targetTemperature = undefined
    }

    state.targetHeatingCoolingState = state.currentHeatingCoolingState;
  }

  constructor (log, config) {
    super(log, config)

    const { state } = this;
    const { defaultCoolTemperature, defaultHeatTemperature, heatTemperature, minTemperature, maxTemperature, pseudoDeviceTemperature, replaceAutoMode, units } = config

    // if (config.resendHexAfterReload === undefined) config.resendHexAfterReload = true;

    if (state.currentHeatingCoolingState === undefined) state.currentHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;
    if (state.targetHeatingCoolingState === undefined) state.targetHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;

    // if (state.targetTemperature === undefined) state.targetTemperature = minTemperature || 0;
    if (state.firstTemperatureUpdate === undefined) state.firstTemperatureUpdate = true;

    config.minTemperature = minTemperature || 0;
    config.maxTemperature = maxTemperature || 30;

    if (config.temperatureDisplayUnits === undefined) config.temperatureDisplayUnits = (units && units.toLowerCase() === 'f') ? Characteristic.TemperatureDisplayUnits.FAHRENHEIT : Characteristic.TemperatureDisplayUnits.CELSIUS;

    // When a temperature hex doesn't exist we try to use the hex set for these
    // default temperatures
    config.defaultCoolTemperature = defaultCoolTemperature || 16;
    config.defaultHeatTemperature = defaultHeatTemperature || 30;

    // Used to determine when we should use the defaultHeatTemperature or the
    // defaultHeatTemperature
    config.heatTemperature = heatTemperature || 22;

    // When we turn on the thermostat with Siri it comes thrugh as "auto" which
    // isn't particularly supported at this time so we convert the mode to cool
    // or heat
    // Note that this is only used when you use Siri or press Auto immediately
    // after launching Homebridge. The rest of the time we'll use your last known
    // temperature
    config.replaceAutoMode = replaceAutoMode || 'cool';

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

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.TargetHeatingCoolingState,
      propertyName: 'targetHeatingCoolingState',
      setValuePromise: this.setTargetHeatingCoolingState.bind(this)
    });

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
    const { pseudoDeviceTemperature } = config;

    // Some devices don't include a thermometer
    if (pseudoDeviceTemperature !== undefined) return;


    this.getCurrentTemperature((err, temperature) => {
      this.thermostatService.setCharacteristic(Characteristic.CurrentTemperature, temperature);

      this.checkTemperatureForAutoOn(temperature);

      setTimeout(() => {
        this.updateTemperatureUI();
      }, 10 * 1000);
    })
  }

  checkTemperatureForAutoOn (temperature) {
    const { config, host, log, name, state } = this;
    let { autoHeatTemperature, autoCoolTemperature, autoMinimumDuration } = config;

    // Defaults
    if (!autoMinimumDuration) autoMinimumDuration = 120;

    if (this.autoOnTimeout) {
      this.log(`${name} getCurrentTemperature (ignore auto-check within ${autoMinimumDuration}s of starting)`);

      return;
    }
    if (!autoHeatTemperature && !autoCoolTemperature) return;

    if (autoHeatTemperature && temperature < autoHeatTemperature) {
      this.state.runningAutomatically = true;

      this.log(`${name} getCurrentTemperature (${temperature} < ${autoHeatTemperature}: auto heat)`);
      this.thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.HEAT);
    } else if (autoCoolTemperature && temperature > autoCoolTemperature) {
      this.state.runningAutomatically = true;

      this.log(`${name} getCurrentTemperature (${temperature} > ${autoCoolTemperature}: auto cool)`);
      this.thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.COOL);
    } else {
      this.log(`${name} getCurrentTemperature (temperature is ok)`);

      if (this.state.runningAutomatically) {
        this.state.runningAutomatically = false;

        this.log(`${name} getCurrentTemperature (auto off)`);
        this.thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.OFF);
      } else {
        return;
      }
    }

    this.autoOnTimeout = setTimeout(() => {
      this.resetAutoOnTimeout();
    }, autoMinimumDuration * 1000);
  }

  resetAutoOnTimeout () {
    if (this.autoOnTimeout) clearTimeout(this.autoOnTimeout);
    this.autoOnTimeout = undefined
  }

  // Thermostat
  sendTemperature (temperature) {
    const { config, data, host, log, name, state } = this;
    const { defaultHeatTemperature, defaultCoolTemperature, heatTemperature } = config;

    log(`Potential ${name} sendTemperature (${temperature})`);

    let hasTemperatureChanged = (state.targetTemperature !== temperature);
    let hexData = data[`temperature${temperature}`];

    // You may not want to set the hex data for every single mode...
    if (!hexData) {
      const defaultTemperature = (temperature >= heatTemperature) ? defaultHeatTemperature : defaultCoolTemperature;
      hexData = data[`temperature${defaultTemperature}`];

      if (!hexData) {
        const error = Error(`You need to set the defaultHeatTemperature and defaultCoolTemperature or provide a hex code for the given mode/temperature:
          ({ "temperature${state.targetTemperature}": { "data": "HEXCODE", "pseudo-mode" : "auto/heat/cool" } })
          or at the very least, the default mode/temperature
          ({ "temperature${defaultTemperature}": { "data": "HEXCODE", "pseudo-mode" : "auto/heat/cool" } })`);

        throw new Error(`${name} ${error.message}`);
      }

      hasTemperatureChanged = (state.targetTemperature !== defaultTemperature);
      this.log(`Update to default ${name} temperature (${defaultTemperature})`);

      state.targetTemperature = defaultTemperature;
    } else {
      state.targetTemperature = temperature;
    }

    if (!hasTemperatureChanged && !state.firstTemperatureUpdate && state.currentHeatingCoolingState !== Characteristic.TargetHeatingCoolingState.OFF) return;

    state.firstTemperatureUpdate = false;

    const mode = hexData['pseudo-mode'];
    this.log(`${name} sendTemperature (${state.targetTemperature}, ${mode})`);
    this.updateServiceHeatingCoolingState(this.heatingCoolingStateForConfigKey(hexData['pseudo-mode']));

    this.thermostatService.setCharacteristic(Characteristic.TargetTemperature, state.targetTemperature);

    state.lastUsedTemperature = state.targetTemperature;
    state.lastUsedHeatingCoolingState = state.currentHeatingCoolingState;

    sendData({ host, hexData: hexData.data, log, name });
  }

	getCurrentHeatingCoolingState () {
    const { state } = this;

    this.updateServiceHeatingCoolingState(state.currentHeatingCoolingState);
	}

	setTargetHeatingCoolingState () {
    const { config, data, host, log, name, state } = this;
    const { defaultCoolTemperature, defaultHeatTemperature, replaceAutoMode } = config;

    // Perform the auto -> cool/heat conversion descrived in constructor()
    if (replaceAutoMode && this.configKeyForHeatingCoolingState(this.targetHeatingCoolingState) === 'auto') {
      if (state.firstTemperatureUpdate || state.lastUsedHeatingCoolingState === this.heatingCoolingStateForConfigKey('auto')) {
     		log(`${name} setTargetHeatingCoolingState (converting from auto to ${replaceAutoMode})`);

        setTimeout(() => {
          this.thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, this.heatingCoolingStateForConfigKey(replaceAutoMode));
        }, 300)
      } else {
        state.targetTemperature = state.lastUsedTemperature

        log(`${name} setTargetHeatingCoolingState (converting from auto to last used - ${this.configKeyForHeatingCoolingState(state.lastUsedHeatingCoolingState)})`);
        setTimeout(() => {
          this.thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, state.lastUsedHeatingCoolingState);
        }, 300)
      }

      return;
    }

    if (state.targetHeatingCoolingState === undefined) return; // Some calls are made to this without a value
    if (state.targetHeatingCoolingState === state.currentHeatingCoolingState) return;

    let temperature = state.targetTemperature;

    if (state.targetHeatingCoolingState === Characteristic.TargetHeatingCoolingState.HEAT) {
      temperature = defaultHeatTemperature
    } else if (state.targetHeatingCoolingState === Characteristic.TargetHeatingCoolingState.COOL) {
      temperature = defaultCoolTemperature;
    }

    const currentModeConfigKey = this.configKeyForHeatingCoolingState(state.targetHeatingCoolingState);

    if (currentModeConfigKey === 'off') {
      this.state.runningAutomatically = false;
      this.resetAutoOnTimeout();

      this.updateServiceHeatingCoolingState(state.targetHeatingCoolingState);
      sendData({ host, hexData: data.off, log, name });
    } else {
      this.sendTemperature(temperature);
    }
	}

	getCurrentTemperature (callback) {
    const { config, host, log, name, state } = this;
    const { pseudoDeviceTemperature } = config;

    // Some devices don't include a thermometer
    if (pseudoDeviceTemperature !== undefined) {
      log(`${name} getCurrentTemperature (using ${pseudoDeviceTemperature} from config)`);

      return callback(null, pseudoDeviceTemperature);
    }

    const device = getDevice({ host, log })
    if (!device) return callback(null, pseudoDeviceTemperature || 0);

    const callbackIdentifier = Date.now();
    this.callbackQueue[callbackIdentifier] = callback;

    // Make sure we're only calling one at a time
    if (Object.keys(this.callbackQueue).length > 1) return;

    let onTemperature;

    onTemperature = (temperature) => {
      if (temperature > this.config.maxTemperature) temperature = this.config.maxTemperature
      if (temperature < this.config.minTemperature) temperature = this.config.minTemperature
      state.currentTemperature = temperature;

      if (this.removeTemperatureListenerTimer) clearTimeout(this.removeTemperatureListenerTimer)
      device.removeListener('temperature', onTemperature);
      this.processQueuedCallbacks();

      log(`${name} getCurrentTemperature (${temperature})`);
 		}

    // Add a 3 second timeout
    this.removeTemperatureListenerTimer = setTimeout(() => {
      device.removeListener('temperature', onTemperature);
      this.processQueuedCallbacks();

   		log(`${name} getCurrentTemperature (3s timeout)`);
    }, 3000)

   	device.on('temperature', onTemperature);

 		device.checkTemperature();
	}

  processQueuedCallbacks () {
    const { config, state } = this;
    const { minTemperature, maxTemperature } = config;

    if (state.currentTemperature < minTemperature) throw new Error(`The current temperature (${state.currentTemperature}) must be more than the minTemperature (${minTemperature})`);
    if (state.currentTemperature > maxTemperature) throw new Error(`The current temperature (${state.currentTemperature}) must be less than the maxTemperature (${maxTemperature})`);


    Object.keys(this.callbackQueue).forEach((callbackIdentifier) => {
      const callback = this.callbackQueue[callbackIdentifier];
      callback(null, state.currentTemperature);

      delete this.callbackQueue[callbackIdentifier];
    })
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

module.exports = AirConAccessory
