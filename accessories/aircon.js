const { assert } = require('chai');
const uuid = require('uuid');
const fs = require('fs');

const delayForDuration = require('../helpers/delayForDuration');
const ServiceManagerTypes = require('../helpers/serviceManagerTypes');
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

    this.temperatureCallbackQueue = {};
    this.monitorTemperature();
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
    config.autoSwitchName = config.autoSwitch || config.autoSwitchName;

    if (config.preventResendHex === undefined && config.allowResend === undefined) {
      config.preventResendHex = false;
    } else if (config.allowResend !== undefined) {
      config.preventResendHex = !config.allowResend;
    }

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
      assert.isBelow(config.pseudoDeviceTemperature, config.maxTemperature + 1, `\x1b[31m[CONFIG ERROR] \x1b[33mpseudoDeviceTemperature\x1b[30m (${config.pseudoDeviceTemperature}) must be less than the maxTemperature (${config.maxTemperature})`)
      assert.isAbove(config.pseudoDeviceTemperature, config.minTemperature - 1, `\x1b[31m[CONFIG ERROR] \x1b[33mpseudoDeviceTemperature\x1b[30m (${config.pseudoDeviceTemperature}) must be more than the minTemperature (${config.minTemperature})`)
    }

    // minTemperature can't be more than 10 or HomeKit throws a fit
    assert.isBelow(config.minTemperature, 11, `\x1b[31m[CONFIG ERROR] \x1b[33mminTemperature\x1b[30m (${config.minTemperature}) must be <= 10`)
 
    // maxTemperature > minTemperature
    assert.isBelow(config.minTemperature, config.maxTemperature, `\x1b[31m[CONFIG ERROR] \x1b[33mmaxTemperature\x1b[30m (${config.minTemperature}) must be more than minTemperature (${config.minTemperature})`)
  }

  reset () {
    super.reset();
    
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

  updateServiceTargetHeatingCoolingState (value) {
    const { serviceManager, state } = this;

    delayForDuration(0.2).then(() => {
      serviceManager.setCharacteristic(Characteristic.TargetHeatingCoolingState, value);
    });
  }

  updateServiceCurrentHeatingCoolingState (value) {
    const { serviceManager, state } = this;

    delayForDuration(0.25).then(() => {
      serviceManager.setCharacteristic(Characteristic.CurrentHeatingCoolingState, value);
    });
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
    const { preventResendHex, minTemperature, maxTemperature } = config;

    if (state.targetTemperature === previousValue && preventResendHex && !this.previouslyOff) return;

    this.previouslyOff = false;

    if (state.targetTemperature < minTemperature) return log(`The target temperature (${this.targetTemperature}) must be more than the minTemperature (${minTemperature})`);
    if (state.targetTemperature > maxTemperature) return log(`The target temperature (${this.targetTemperature}) must be less than the maxTemperature (${maxTemperature})`);

    // Used within correctReloadedState() so that when re-launching the accessory it uses
    // this temperature rather than one automatically set.  
    state.userSpecifiedTargetTemperature = state.targetTemperature;

    // Do the actual sending of the temperature
    this.sendTemperature(state.targetTemperature, previousValue);
  }

	async setTargetHeatingCoolingState (hexData, previousValue) {
    const { HeatingCoolingConfigKeys, HeatingCoolingStates, config, data, host, log, name, serviceManager, state, debug } = this;
    const { preventResendHex, defaultCoolTemperature, defaultHeatTemperature, replaceAutoMode } = config;

    const targetHeatingCoolingState = HeatingCoolingConfigKeys[state.targetHeatingCoolingState];
    const lastUsedHeatingCoolingState = HeatingCoolingConfigKeys[state.lastUsedHeatingCoolingState];
    const currentHeatingCoolingState = HeatingCoolingConfigKeys[state.currentHeatingCoolingState];

    // Some calls are made to this without a value for some unknown reason
    if (state.targetHeatingCoolingState === undefined) return;

    // Check to see if it's changed
    if (state.targetHeatingCoolingState === state.currentHeatingCoolingState && preventResendHex) return;

    if (targetHeatingCoolingState === 'off') {
      this.updateServiceCurrentHeatingCoolingState(HeatingCoolingStates.off);
      await this.performSend(data.off);

      return;
    }

    // Perform the auto -> cool/heat conversion if `replaceAutoMode` is specified
    if (replaceAutoMode && targetHeatingCoolingState === 'auto') {
      log(`${name} setTargetHeatingCoolingState (converting from auto to ${replaceAutoMode})`);

      if (previousValue === Characteristic.TargetHeatingCoolingState.OFF) this.previouslyOff = true;  

      this.updateServiceTargetHeatingCoolingState(HeatingCoolingStates[replaceAutoMode]);

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

    if (previousValue === Characteristic.TargetHeatingCoolingState.OFF) this.previouslyOff = true;  
   
    serviceManager.setCharacteristic(Characteristic.TargetTemperature, temperature);
  }

  // Thermostat
  async sendTemperature (temperature, previousTemperature) {
    const { HeatingCoolingStates, config, data, host, log, name, state, debug } = this;
    const { preventResendHex, defaultCoolTemperature, heatTemperature } = config;

    log(`${name} Potential sendTemperature (${temperature})`);

    // If the air-conditioner is turned off then turn it on first and try this again
    if (this.checkTurnOnWhenOff()) {
      this.turnOnWhenOffDelayPromise = delayForDuration(.3);
      await this.turnOnWhenOffDelayPromise
    }

    const { hexData, finalTemperature } = this.getTemperatureHexData(temperature);

    state.targetTemperature = finalTemperature;

    const hasTemperatureChanged = (previousTemperature !== finalTemperature);

    if (!hasTemperatureChanged) {
      if (!state.firstTemperatureUpdate && state.currentHeatingCoolingState !== Characteristic.TargetHeatingCoolingState.OFF) {
        if (preventResendHex) return;
      }
    }

    state.firstTemperatureUpdate = false;

    let mode = hexData['pseudo-mode'];

    if (mode) assert.oneOf(mode, [ 'heat', 'cool' ], '\x1b[31m[CONFIG ERROR] \x1b[33mpseudo-mode\x1b[30m should be either "heat" or "cool"');
    
    if (!mode) {
      if (finalTemperature < heatTemperature) {
        mode = 'cool';
      } else {
        mode = 'heat';
      }
    }

    this.log(`${name} sendTemperature (${state.targetTemperature}, ${mode})`);

    state.targetHeatingCoolingState = HeatingCoolingStates[mode];
    this.updateServiceCurrentHeatingCoolingState(HeatingCoolingStates[mode]);
    this.serviceManager.refreshCharacteristicUI(Characteristic.CurrentHeatingCoolingState);
    this.serviceManager.refreshCharacteristicUI(Characteristic.TargetHeatingCoolingState);

    await this.performSend(hexData.data);
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

      assert(hexData, `\x1b[31m[CONFIG ERROR] \x1b[30m You need to provide a hex code for the following temperature:
        \x1b[33m{ "temperature${temperature}": { "data": "HEXCODE", "pseudo-mode" : "heat/cool" } }\x1b[30m 
        or provide the default temperature:
        \x1b[33m { "temperature${defaultTemperature}": { "data": "HEXCODE", "pseudo-mode" : "heat/cool" } }\x1b[30m`);
      

      this.log(`${name} Update to default temperature (${defaultTemperature})`);
      finalTemperature = defaultTemperature;
    }

    return { finalTemperature, hexData }
  }

  async checkTurnOnWhenOff () {
    const { config, data, debug, host, log, name, state } = this;
    const { on } = data;
    
    if (state.currentHeatingCoolingState === Characteristic.TargetHeatingCoolingState.OFF && config.turnOnWhenOff) {
      log(`${name} sendTemperature (sending "on" hex before sending temperature)`);

      if (on) await this.performSend(on);
  
      return true;
    }

    return false;
  }

  // Device Temperature Methods
  
  async monitorTemperature () {
    const { config, host, log, name, state } = this;
    const { temperatureFilePath, pseudoDeviceTemperature } = config;

    if (temperatureFilePath) return;
    if (pseudoDeviceTemperature !== undefined) return;

    const device = getDevice({ host, log });

    // Try again in a second if we don't have a device yet
    if (!device) {
      await delayForDuration(1);

      this.monitorTemperature();

      return;
    }

    log(`${name} monitorTemperature`);

    device.on('temperature', this.onTemperature.bind(this));
    device.checkTemperature();

    this.updateTemperatureUI();
    if (!config.isUnitTest) setInterval(this.updateTemperatureUI.bind(this), config.temperatureUpdateFrequency * 1000)
  }

  onTemperature (temperature) {
    const { config, host, log, name, state } = this;
    const { minTemperature, maxTemperature, temperatureAdjustment } = config;

    temperature += temperatureAdjustment
    
    state.currentTemperature = temperature;

    log(`${name} onTemperature (${temperature})`);
    
    assert.isBelow(temperature, config.maxTemperature + 1, `\x1b[31m[CONFIG ERROR] \x1b[33mmaxTemperature\x1b[30m (${config.maxTemperature}) must be more than the reported temperature (${temperature})`)
    assert.isAbove(temperature, config.minTemperature - 1, `\x1b[31m[CONFIG ERROR] \x1b[33mminTemperature\x1b[30m (${config.maxTemperature}) must be less than the reported temperature (${temperature})`)

    this.processQueuedTemperatureCallbacks(temperature);
  }

  addTemperatureCallbackToQueue (callback) {
    const { config, host, log, name } = this;
    const { temperatureFilePath } = config;
  
    const callbackIdentifier = uuid.v4();

    this.temperatureCallbackQueue[callbackIdentifier] = callback;
    
    // Make sure we're only calling one at a time
    if (Object.keys(this.temperatureCallbackQueue).length > 1) {
      log(`${name} getCurrentTemperature (waiting for device to return temperature)`);

      return;
    }

    if (temperatureFilePath) {
      this.updateTemperatureFromFile();

      return;
    }

    const device = getDevice({ host, log });

    if (!device) {
      this.processQueuedTemperatureCallbacks(0);

      return;
    }

    device.checkTemperature();
    log(`${name} addTemperatureCallbackToQueue (requested temperature from device, waiting)`);
  }

  updateTemperatureFromFile () {
    const { config, debug, host, log, name } = this;
    const { temperatureFilePath } = config;

    if (debug) log(`${name} updateTemperatureFromFile reading file: ${temperatureFilePath}`);

    fs.readFile(temperatureFilePath, 'utf8', (err, temperature) => {

      if (err) {
         log(`\x1b[31m[ERROR] \x1b[30m${name} updateTemperatureFromFile\n\n${err.message}`);
         
         return;
      }

      if (!temperature || temperature.trim().length === 0) {
        log(`\x1b[31m[ERROR] \x1b[30m${name} updateTemperatureFromFile (no temperature found)`);
        
        return;
      }

      if (debug) log(`${name} updateTemperatureFromFile (file content: ${temperature.trim()})`);

      temperature = parseFloat(temperature);

      if (debug) log(`${name} updateTemperatureFromFile (parsed temperature: ${temperature})`);
      
      this.onTemperature(temperature);
    });
  }

  processQueuedTemperatureCallbacks (temperature) {
    Object.keys(this.temperatureCallbackQueue).forEach((callbackIdentifier) => {
      const callback = this.temperatureCallbackQueue[callbackIdentifier];
      
      callback(null, temperature);
      delete this.temperatureCallbackQueue[callbackIdentifier];
    })

    this.temperatureCallbackQueue = {};

    this.checkTemperatureForAutoOnOff(temperature);
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

  async checkTemperatureForAutoOnOff (temperature) {
    const { config, host, log, name, serviceManager, state } = this;
    let { autoHeatTemperature, autoCoolTemperature, minimumAutoOnOffDuration } = config;

    if (this.shouldIgnoreAutoOnOff) {
      this.log(`${name} checkTemperatureForAutoOn (ignore within ${minimumAutoOnOffDuration}s of previous auto-on/off due to "minimumAutoOnOffDuration")`);

      return;
    }

    if (!autoHeatTemperature && !autoCoolTemperature) return;

    if (!this.isAutoSwitchOn()) {
      this.log(`${name} checkTemperatureForAutoOnOff (autoSwitch is off)`);

      return;
    }

    this.log(`${name} checkTemperatureForAutoOnOff`);


    if (autoHeatTemperature && temperature < autoHeatTemperature) {
      this.state.isRunningAutomatically = true;

      this.log(`${name} checkTemperatureForAutoOnOff (${temperature} < ${autoHeatTemperature}: auto heat)`);
      serviceManager.setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.HEAT);
    } else if (autoCoolTemperature && temperature > autoCoolTemperature) {
      this.state.isRunningAutomatically = true;

      this.log(`${name} checkTemperatureForAutoOnOff (${temperature} > ${autoCoolTemperature}: auto cool)`);
      serviceManager.setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.COOL);
    } else {
      this.log(`${name} checkTemperatureForAutoOnOff (temperature is ok)`);

      if (this.state.isRunningAutomatically) {
        this.isAutomatedOff = true;

        this.log(`${name} checkTemperatureForAutoOnOff (auto off)`);
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

  getTemperatureDisplayUnits (callback) {
    const { config } = this;

    const temperatureDisplayUnits = (config.units.toLowerCase() === 'f') ? Characteristic.TemperatureDisplayUnits.FAHRENHEIT : Characteristic.TemperatureDisplayUnits.CELSIUS;
    
    callback(temperatureDisplayUnits);
  }
  
  // Service Manager Setup

  setupServiceManager () {
    const { config, name, serviceManagerType } = this;
    const { minTemperature, maxTemperature } = config;

    this.serviceManager = new ServiceManagerTypes[serviceManagerType](name, Service.Thermostat, this.log);

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
        setValuePromise: this.setTargetTemperature.bind(this),
        ignorePreviousValue: true
      }
    });

    this.serviceManager.addToggleCharacteristic({
      name: 'targetHeatingCoolingState',
      type: Characteristic.TargetHeatingCoolingState,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        setValuePromise: this.setTargetHeatingCoolingState.bind(this),
        ignorePreviousValue: true
      }
    });

    this.serviceManager.addGetCharacteristic({
      name: 'currentTemperature',
      type: Characteristic.CurrentTemperature,
      method: this.getCurrentTemperature,
      bind: this
    })

    this.serviceManager.addGetCharacteristic({
      name: 'temperatureDisplayUnits',
      type: Characteristic.TemperatureDisplayUnits,
      method: this.getTemperatureDisplayUnits,
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
