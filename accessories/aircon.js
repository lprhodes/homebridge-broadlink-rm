const { assert } = require('chai');
const uuid = require('uuid');

const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const { ServiceManagerTypes } = require('../helpers/serviceManager');
const catchDelayCancelError = require('../helpers/catchDelayCancelError');
const { getDevice } = require('../helpers/getDevice');
const BroadlinkRMAccessory = require('./accessory');

class AirConAccessory extends BroadlinkRMAccessory {

  constructor (log, config = {}, serviceManagerType) {    
    super(log, config, serviceManagerType);

    // Characteristic isn't defined until runtime so we set these the instance scope
    const HeatingCoolingStates = {
      off: Characteristic.TargetHeatingCoolingState.OFF,
      cool: Characteristic.TargetHeatingCoolingState.COOL,
      heat: Characteristic.TargetHeatingCoolingState.HEAT,
      auto: Characteristic.TargetHeatingCoolingState.AUTO
    };
    this.HeatingCoolingStates = HeatingCoolingStates;
    
    const HeatingCoolingConfigKeys = {};
    HeatingCoolingConfigKeys[Characteristic.TargetHeatingCoolingState.OFF] = 'off';
    HeatingCoolingConfigKeys[Characteristic.TargetHeatingCoolingState.COOL] = 'cool';
    HeatingCoolingConfigKeys[Characteristic.TargetHeatingCoolingState.HEAT] = 'heat';
    HeatingCoolingConfigKeys[Characteristic.TargetHeatingCoolingState.AUTO] = 'auto';
    this.HeatingCoolingConfigKeys = HeatingCoolingConfigKeys;

    this.monitorTemperature();

    this.updateTemperatureUI();
    if (!config.isUnitTest) setInterval(this.updateTemperatureUI.bind(this), config.temperatureUpdateFrequency * 1000)
  }

  correctReloadedState (state) {
    if (state.currentHeatingCoolingState === Characteristic.CurrentHeatingCoolingState.OFF)  {
      state.targetTemperature = undefined
    }

    state.targetHeatingCoolingState = state.currentHeatingCoolingState;

    if (state.userSpecifiedTargetTemperature) state.targetTemperature = state.userSpecifiedTargetTemperature
  }

  setDefaults () {
    const { config, state } = this;

    // Set config default values
    if (config.turnOnWhenOff === undefined) config.turnOnWhenOff = config.sendOnWhenOff || false; // Backwards compatible with `sendOnWhenOff`
    if (config.minimumAutoOnOffDuration === undefined) config.minimumAutoOnOffDuration = config.autoMinimumDuration || 120; // Backwards compatible with `autoMinimumDuration`
    config.minTemperature = config.minTemperature || -15;
    config.maxTemperature = config.maxTemperature || 50;
    config.temperatureUpdateFrequency = config.temperatureUpdateFrequency || 10;
    config.units = config.units ? config.units.toLowerCase() : 'c';
    config.temperatureAdjustment = config.temperatureAdjustment || 0;
    config.allowResend = config.allowResend || false;
    config.autoSwitchName = config.autoSwitch || config.autoSwitchName;

    // When a temperature hex doesn't exist we try to use the hex set for these
    // default temperatures
    config.defaultCoolTemperature = config.defaultCoolTemperature || 16;
    config.defaultHeatTemperature = config.defaultHeatTemperature || 30;

    // Used to determine when we should use the defaultHeatTemperature or the
    // defaultHeatTemperature
    config.heatTemperature = config.heatTemperature || 22;

    // When we turn on the thermostat with Siri it comes thrugh as "auto" which
    // isn't particularly supported at this time so we convert the mode to cool
    // or heat
    // Note that this is only used when you use Siri or press Auto immediately
    // after launching Homebridge. The rest of the time we'll use your last known
    // temperature
    config.replaceAutoMode = config.replaceAutoMode || 'cool';

    // Set state default values
    // state.targetTemperature = state.targetTemperature || config.minTemperature;
    state.currentHeatingCoolingState = state.currentHeatingCoolingState || Characteristic.CurrentHeatingCoolingState.OFF;
    state.targetHeatingCoolingState = state.targetHeatingCoolingState || Characteristic.TargetHeatingCoolingState.OFF;
    state.firstTemperatureUpdate = true;

    // Check required properties
    if (config.pseudoDeviceTemperature) {
      assert.isBelow(config.pseudoDeviceTemperature, config.maxTemperature, `The pseudoDeviceTemperature (${config.pseudoDeviceTemperature}) must be less than the maxTemperature (${config.maxTemperature})`)
      assert.isAbove(config.pseudoDeviceTemperature, config.minTemperature, `The pseudoDeviceTemperature (${config.pseudoDeviceTemperature}) must be more than the minTemperature (${config.minTemperature})`)
    }
  }

  reset () {
    this.state.isRunningAutomatically = false;

    if (this.shouldIgnoreAutoOnOffPromise) {
      this.shouldIgnoreAutoOnOffPromise.cancel();
      this.shouldIgnoreAutoOnOffPromise = undefined;

      this.shouldIgnoreAutoOnOff = false;
    }

    if (this.turnOnWhenOffDelayPromise) {
      this.turnOnWhenOffDelayPromise.cancel();
      this.turnOnWhenOffDelayPromise = undefined;
    }
  }

  updateServiceHeatingCoolingState (value) {
    const { serviceManager, state } = this;

    // Check for change
    if (state.currentHeatingCoolingState === value) return;

    serviceManager.setCharacteristic(Characteristic.CurrentHeatingCoolingState, value);
    serviceManager.setCharacteristic(Characteristic.TargetHeatingCoolingState, value);
  }
  
  // Allows this accessory to know about switch accessories that can determine whether  
  // auto-on/off should be permitted.
  updateAccessories (accessories) {
    const { config, name, log } = this;
    const { autoSwitchName } = config;

    if (!autoSwitchName) return;

    log(`${name} Linking autoSwitch "${autoSwitchName}"`)

    const autoSwitchAccessories = accessories.filter(accessory => accessory.name === autoSwitchName);

    if (autoSwitchAccessories.length === 0) return log(`${name} No accessory could be found with the name "${autoSwitchName}". Please update the "autoSwitchName" value or add a matching switch accessory.`);

    this.autoSwitchAccessory = autoSwitchAccessories[0];
  }

  isAutoSwitchOn () {
    return (!this.autoSwitchAccessory || (this.autoSwitchAccessory && this.autoSwitchAccessory.state && this.autoSwitchAccessory.state.switchState));
  }

	setTargetTemperature (hexData, previousValue) {
    const { config, log, name, state } = this;
    const { allowResend, minTemperature, maxTemperature } = config;

    if (state.targetTemperature === previousValue && !allowResend) return;

    if (state.targetTemperature < minTemperature) return log(`The target temperature (${this.targetTemperature}) must be more than the minTemperature (${minTemperature})`);
    if (state.targetTemperature > maxTemperature) return log(`The target temperature (${this.targetTemperature}) must be less than the maxTemperature (${maxTemperature})`);

    // Used within correctReloadedState() so that when re-launching the accessory it uses
    // this temperature rather than one automatically set.  
    state.userSpecifiedTargetTemperature = state.targetTemperature;

    // Do the actual sending of the temperature
    this.sendTemperature(state.targetTemperature, previousValue);
  }

	async setTargetHeatingCoolingState () {
    const { HeatingCoolingConfigKeys, HeatingCoolingStates, config, data, host, log, name, serviceManager, state, debug } = this;
    const { defaultCoolTemperature, defaultHeatTemperature, replaceAutoMode } = config;

    const targetHeatingCoolingState = HeatingCoolingConfigKeys[state.targetHeatingCoolingState];
    const lastUsedHeatingCoolingState = HeatingCoolingConfigKeys[state.lastUsedHeatingCoolingState];

    // Some calls are made to this without a value for some unknown reason
    if (state.targetHeatingCoolingState === undefined) return;

    // Check to see if it's changed
    if (state.targetHeatingCoolingState === state.currentHeatingCoolingState) return;

    if (targetHeatingCoolingState === 'off') {
      this.reset();

      this.updateServiceHeatingCoolingState(state.targetHeatingCoolingState);
      sendData({ host, hexData: data.off, log, name, debug });

      return;
    }

    // Perform the auto -> cool/heat conversion if `replaceAutoMode` is specified
    if (replaceAutoMode && targetHeatingCoolingState === 'auto') {
      log(`${name} setTargetHeatingCoolingState (converting from auto to ${replaceAutoMode})`);

      serviceManager.setCharacteristic(Characteristic.TargetHeatingCoolingState, HeatingCoolingStates[replaceAutoMode]);
      
      return;
    }

    let temperature;

    // Selecting a heating/cooling state allows a default temperature to be used for the given state.
    if (state.targetHeatingCoolingState === Characteristic.TargetHeatingCoolingState.HEAT) {
      temperature = defaultHeatTemperature;
    } else if (state.targetHeatingCoolingState === Characteristic.TargetHeatingCoolingState.COOL) {
      temperature = defaultCoolTemperature;
    } else {
      temperature = state.targetTemperature;
    }

    await delayForDuration(0.2);
    serviceManager.setCharacteristic(Characteristic.TargetTemperature, temperature);
  }

  // Thermostat
  async sendTemperature (temperature, previousTemperature) {
    const { HeatingCoolingStates, config, data, host, log, name, state, debug } = this;
    const { allowResend, defaultCoolTemperature, heatTemperature } = config;

    log(`${name} Potential sendTemperature (${temperature})`);

    // If the air-conditioner is turned off then turn it on first and try this again
    if (this.checkTurnOnWhenOff()) {
      this.turnOnWhenOffDelayPromise = delayForDuration(.3);
      await this.turnOnWhenOffDelayPromise
    }

    const { hexData, finalTemperature } = this.getTemperatureHexData(temperature);

    state.targetTemperature = finalTemperature;

    const hasTemperatureChanged = (previousTemperature !== finalTemperature);
    log('hasTemperatureChanged', hasTemperatureChanged)

    if (!hasTemperatureChanged) {
      if (!state.firstTemperatureUpdate && state.currentHeatingCoolingState !== Characteristic.TargetHeatingCoolingState.OFF) {
        if (!allowResend) return;
      }
    }

    state.firstTemperatureUpdate = false;

    const mode = hexData['pseudo-mode'];
    this.log(`${name} sendTemperature (${state.targetTemperature}, ${mode})`);

    this.updateServiceHeatingCoolingState(HeatingCoolingStates[mode]);

    sendData({ host, hexData: hexData.data, log, name, debug });
  }

  getTemperatureHexData (temperature) {
    const { config, data, name, state, debug } = this;
    const { defaultHeatTemperature, defaultCoolTemperature, heatTemperature } = config;

    let finalTemperature = temperature;
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

          console.log('error', error)
        throw new Error(`${name} ${error.message}`);
      }

      this.log(`${name} Update to default temperature (${defaultTemperature})`);
      finalTemperature = defaultTemperature;
    }

    return { finalTemperature, hexData }
  }

  checkTurnOnWhenOff () {
    const { config, data, debug, host, log, name, state } = this;
    const { on } = data;
    
    if (state.currentHeatingCoolingState === Characteristic.TargetHeatingCoolingState.OFF && config.turnOnWhenOff) {
      log(`${name} sendTemperature (sending "on" hex before sending temperature)`);

      if (on) sendData({ host, hexData: on, log, name, debug });

      return true;
    }

    return false;
  }

  // Device Temperature Methods
  
  monitorTemperature () {
    const { config, host, log, name, state } = this;
    const { pseudoDeviceTemperature, minTemperature, maxTemperature, temperatureAdjustment } = config;

    this.temperatureCallbackQueue = {};
    
    const onTemperature = (temperature) => {
      temperature += temperatureAdjustment
      
      state.currentTemperature = temperature;

      log(`${name} onTemperature (${temperature})`);

      if (temperature > maxTemperature) {
        log(`${name} getCurrentTemperature (reported temperature too high, settings to 0: ${temperature})`);

        temperature = 0
      }

      if (temperature < minTemperature) {
        
        log(`${name} getCurrentTemperature (reported temperature too low, setting to 0: ${temperature})`);

        temperature = 0
      }

      this.processQueuedTemperatureCallbacks(temperature);
    }

    const device = getDevice({ host, log });
   	device.on('temperature', onTemperature);
  }

  addTemperatureCallbackToQueue (callback) {
    const { host, log, name } = this;
  
    const callbackIdentifier = uuid.v4();
    this.temperatureCallbackQueue[callbackIdentifier] = callback;
    
    // Make sure we're only calling one at a time
    if (Object.keys(this.temperatureCallbackQueue).length > 1) {
      log(`${name} getCurrentTemperature (waiting for device to return temperature)`);

      return;
    }

    const device = getDevice({ host, log });
    device.checkTemperature();
    log(`${name} getCurrentTemperature (requested for temperature from device, waiting)`);
     
  }

  processQueuedTemperatureCallbacks (temperature) {
    Object.keys(this.temperatureCallbackQueue).forEach((callbackIdentifier) => {
      const callback = this.temperatureCallbackQueue[callbackIdentifier];
      
      callback(null, temperature)
    })

    this.checkTemperatureForAutoOn(temperature);

    this.temperatureCallbackQueue = {}
  }

  updateTemperatureUI () {
    const { serviceManager } = this;

    serviceManager.refreshCharacteristicUI(Characteristic.CurrentTemperature)
  }

	getCurrentTemperature (callback) {
    const { config, host, log, name, state } = this;
    const { pseudoDeviceTemperature } = config;

    // Some devices don't include a thermometer and so we can use `pseudoDeviceTemperature` instead
    if (pseudoDeviceTemperature !== undefined) {
      log(`${name} getCurrentTemperature (using pseudoDeviceTemperature ${pseudoDeviceTemperature} from config)`);

      return callback(null, pseudoDeviceTemperature);
    }

    this.addTemperatureCallbackToQueue(callback);
	}

  async checkTemperatureForAutoOn (temperature) {
    const { config, host, log, name, serviceManager, state } = this;
    let { autoHeatTemperature, autoCoolTemperature, minimumAutoOnOffDuration } = config;

    if (this.shouldIgnoreAutoOnOff) {
      this.log(`${name} getCurrentTemperature (ignore auto-check within ${minimumAutoOnOffDuration}s of starting)`);

      return;
    }

    if ((!autoHeatTemperature && !autoCoolTemperature) || !this.isAutoSwitchOn()) return;


    if (autoHeatTemperature && temperature < autoHeatTemperature) {
      this.state.isRunningAutomatically = true;

      this.log(`${name} getCurrentTemperature (${temperature} < ${autoHeatTemperature}: auto heat)`);
      serviceManager.setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.HEAT);
    } else if (autoCoolTemperature && temperature > autoCoolTemperature) {
      this.state.isRunningAutomatically = true;

      this.log(`${name} getCurrentTemperature (${temperature} > ${autoCoolTemperature}: auto cool)`);
      serviceManager.setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.COOL);
    } else {
      this.log(`${name} getCurrentTemperature (temperature is ok)`);

      if (this.state.isRunningAutomatically) {
        this.state.isRunningAutomatically = false;

        this.log(`${name} getCurrentTemperature (auto off)`);
        serviceManager.setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.OFF);
      } else {
        return;
      }
    }

    this.shouldIgnoreAutoOnOff = true;
    this.shouldIgnoreAutoOnOffPromise = delayForDuration(minimumAutoOnOffDuration);
    await this.shouldIgnoreAutoOnOffPromise;

    this.shouldIgnoreAutoOnOff = false;
  }
  
  // Service Manager Setup

  setupServiceManager () {
    const { config, name, serviceManagerType } = this;
    const { minTemperature, maxTemperature, units } = config;

    this.serviceManager = new ServiceManagerTypes[serviceManagerType](name, Service.Fanv2, this.log);

    this.serviceManager.addToggleCharacteristic({
      name: 'currentHeatingCoolingState',
      type: Characteristic.CurrentHeatingCoolingState,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {

      }
    });

    this.serviceManager.addToggleCharacteristic({
      name: 'targetTemperature',
      type: Characteristic.TargetTemperature,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        setValuePromise: this.setTargetTemperature.bind(this)
      }
    });

    this.serviceManager.addToggleCharacteristic({
      name: 'targetHeatingCoolingState',
      type: Characteristic.TargetHeatingCoolingState,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        setValuePromise: this.setTargetHeatingCoolingState.bind(this)
      }
    });

    this.serviceManager.addToggleCharacteristic({
      name: 'targetHeatingCoolingState',
      type: Characteristic.TargetHeatingCoolingState,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        setValuePromise: this.setTargetHeatingCoolingState.bind(this)
      }
    });

    this.serviceManager.addGetCharacteristic({
      name: 'currentTemperature',
      type: Characteristic.CurrentTemperature,
      method: this.getCurrentTemperature.bind(this),
      bind: this
    })

    this.serviceManager.addGetCharacteristic({
      name: 'temperatureDisplayUnits',
      type: Characteristic.TemperatureDisplayUnits,
      method: (callback) => {
        const temperatureDisplayUnits = (units.toLowerCase() === 'f') ? Characteristic.TemperatureDisplayUnits.FAHRENHEIT : Characteristic.TemperatureDisplayUnits.CELSIUS;
        
        callback(temperatureDisplayUnits);
      },
      bind: this
    })

    this.serviceManager
      .getCharacteristic(Characteristic.TargetTemperature)
      .setProps({
        minValue: minTemperature,
        maxValue: maxTemperature,
        minStep: 1
      });

    this.serviceManager
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: minTemperature,
        maxValue: maxTemperature,
        minStep: 1
      });
  }
}

module.exports = AirConAccessory
