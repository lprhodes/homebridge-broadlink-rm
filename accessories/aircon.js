const { assert } = require('chai');
const uuid = require('uuid');
const fs = require('fs');
const findKey = require('find-key');

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

    // Set state default values
    // state.targetTemperature = state.targetTemperature || config.minTemperature;
    state.currentHeatingCoolingState = state.currentHeatingCoolingState || Characteristic.CurrentHeatingCoolingState.OFF;
    state.targetHeatingCoolingState = state.targetHeatingCoolingState || Characteristic.TargetHeatingCoolingState.OFF;
    state.firstTemperatureUpdate = true;

    // Check required properties
    if (config.pseudoDeviceTemperature) {
      assert.isBelow(config.pseudoDeviceTemperature, config.maxTemperature + 1, `\x1b[31m[CONFIG ERROR] \x1b[33mpseudoDeviceTemperature\x1b[0m (${config.pseudoDeviceTemperature}) must be less than the maxTemperature (${config.maxTemperature})`)
      assert.isAbove(config.pseudoDeviceTemperature, config.minTemperature - 1, `\x1b[31m[CONFIG ERROR] \x1b[33mpseudoDeviceTemperature\x1b[0m (${config.pseudoDeviceTemperature}) must be more than the minTemperature (${config.minTemperature})`)
    }

    // minTemperature can't be more than 10 or HomeKit throws a fit
    assert.isBelow(config.minTemperature, 11, `\x1b[31m[CONFIG ERROR] \x1b[33mminTemperature\x1b[0m (${config.minTemperature}) must be <= 10`)

    // maxTemperature > minTemperature
    assert.isBelow(config.minTemperature, config.maxTemperature, `\x1b[31m[CONFIG ERROR] \x1b[33mmaxTemperature\x1b[0m (${config.minTemperature}) must be more than minTemperature (${config.minTemperature})`)
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
    
    if (previousValue === Characteristic.TargetHeatingCoolingState.OFF) this.previouslyOff = true;
      
    // If the air-conditioner is turned off then turn it on first and try this again
    if (this.checkTurnOnWhenOff()) {
      this.turnOnWhenOffDelayPromise = delayForDuration(.3);
      await this.turnOnWhenOffDelayPromise
    } 

    // Perform the auto -> cool/heat conversion if `replaceAutoMode` is specified
    if (replaceAutoMode && targetHeatingCoolingState === 'auto') {
      log(`${name} setTargetHeatingCoolingState (converting from auto to ${replaceAutoMode})`);
      this.updateServiceTargetHeatingCoolingState(HeatingCoolingStates[replaceAutoMode]);

      return;
    }

    let temperature = state.targetTemperature;
    let mode = HeatingCoolingConfigKeys[state.targetHeatingCoolingState];
    
    if (state.currentHeatingCoolingState !== state.targetHeatingCoolingState){
      // Selecting a heating/cooling state allows a default temperature to be used for the given state.
      if (state.targetHeatingCoolingState === Characteristic.TargetHeatingCoolingState.HEAT) {
        temperature = defaultHeatTemperature;
      } else if (state.targetHeatingCoolingState === Characteristic.TargetHeatingCoolingState.COOL) {
        temperature = defaultCoolTemperature;
      }
      
      //Set the mode, and send the mode hex
      this.updateServiceCurrentHeatingCoolingState(state.targetHeatingCoolingState);
      if (data.heat && mode === 'heat'){
        await this.performSend(data.heat);        
      } else if (data.cool && mode === 'cool'){
        await this.performSend(data.cool);        
      } else if (data.auto && mode === 'auto'){
        await this.performSend(data.auto);
      } else if (hexData) {
        //Just send the provided temperature hex if node mode codes are set
        await this.performSend(hexData);
      }
      
      this.log(`${name} sentMode (${mode})`);
      
      //Force sending Temperature if temperature hasn't changed in the mode change
      if (state.targetTemperature === temperature) this.sendTemperature(temperature);
    }
    
    serviceManager.setCharacteristic(Characteristic.TargetTemperature, temperature);
    serviceManager.refreshCharacteristicUI(Characteristic.CurrentHeatingCoolingState);
    serviceManager.refreshCharacteristicUI(Characteristic.TargetHeatingCoolingState);
  }

  // Thermostat
  async sendTemperature (temperature, previousTemperature) {
    const { HeatingCoolingConfigKeys, HeatingCoolingStates, config, data, host, log, name, state, debug } = this;
    const { preventResendHex, defaultCoolTemperature, heatTemperature, ignoreTemperatureWhenOff, sendTemperatureOnlyWhenOff } = config;

    if (debug) log(`\x1b[34m[DEBUG]\x1b[0m ${name} Potential sendTemperature (${temperature})`);

    // Ignore Temperature if off, staying off - and set to ignore
    if (!state.currentHeatingCoolingState && !state.targetHeatingCoolingState && ignoreTemperatureWhenOff) {
      log(`${name} Ignoring sendTemperature due to "ignoreTemperatureWhenOff": true`);
      return;
    }

    let mode = HeatingCoolingConfigKeys[state.targetHeatingCoolingState];
    const { hexData, finalTemperature } = this.getTemperatureHexData(mode, temperature);
    state.targetTemperature = finalTemperature;

    // Update the heating/cooling mode based on the pseudo-mode - if pressent.
    if (hexData['pseudo-mode']){
      let mode = hexData['pseudo-mode'];
      if (mode) assert.oneOf(mode, [ 'heat', 'cool', 'auto' ], `\x1b[31m[CONFIG ERROR] \x1b[33mpseudo-mode\x1b[0m should be one of "heat", "cool" or "auto"`)
      this.updateServiceCurrentHeatingCoolingState(HeatingCoolingStates[mode]);
    }

    if((previousTemperature !== finalTemperature) || (state.firstTemperatureUpdate && !preventResendHex)){
      //Set the temperature
      await this.performSend(hexData.data);
      this.log(`${name} sentTemperature (${state.targetTemperature})`);
      state.firstTemperatureUpdate = false;
    }
  }

  getTemperatureHexData (mode, temperature) {
    const { config, data, name, state, debug } = this;
    const { defaultHeatTemperature, defaultCoolTemperature, heatTemperature } = config;

    let finalTemperature = temperature;
    let hexData = data[`${mode}${temperature}`];

    if (!hexData) {
        // Mode based code not found, try mode-less
        this.log(`${name} No ${mode} HEX code found for ${temperature}`);
        let hexData = data[`temperature${temperature}`];
    } else {
        if (hexData['pseudo-mode']) {
            this.log(`\x1b[36m[INFO] \x1b[0m${name} Configuration found for ${mode}${temperature} with pseudo-mode. Pseudo-mode will replace the configured mode.`);
        }
    }

    // You may not want to set the hex data for every single mode...
    if (!hexData) {
      const defaultTemperature = (temperature >= heatTemperature) ? defaultHeatTemperature : defaultCoolTemperature;
      hexData = data[`temperature${defaultTemperature}`];

      assert(hexData, `\x1b[31m[CONFIG ERROR] \x1b[0m You need to provide a hex code for the following temperature:
        \x1b[33m{ "temperature${temperature}": { "data": "HEXCODE", "pseudo-mode" : "heat/cool" } }\x1b[0m
        or provide the default temperature:
        \x1b[33m { "temperature${defaultTemperature}": { "data": "HEXCODE", "pseudo-mode" : "heat/cool" } }\x1b[0m`);

      this.log(`${name} Update to default temperature (${defaultTemperature})`);
      finalTemperature = defaultTemperature;
    }

    return { finalTemperature, hexData }
  }

  async checkTurnOnWhenOff () {
    const { config, data, debug, host, log, name, state } = this;
    const { on } = data;

    if (state.currentHeatingCoolingState === Characteristic.TargetHeatingCoolingState.OFF && config.turnOnWhenOff) {
      log(`${name} sending "on" hex before sending temperature`);

      if (on) {
        await this.performSend(on);
      } else {
        log(`\x1b[31m[CONFIG ERROR] \x1b[0m ${name} No On Hex configured, but turnOnWhenOff enabled`);
      }

      return true;
    }

    return false;
  }

  // Device Temperature Methods

  async monitorTemperature () {
    const { config, host, log, name, state } = this;
    const { temperatureFilePath, pseudoDeviceTemperature, w1DeviceID } = config;

    if (pseudoDeviceTemperature !== undefined) return;

    //Force w1 and file devices to a 10 minute refresh
    if (w1DeviceID || temperatureFilePath) config.temperatureUpdateFrequency = 600;

    const device = getDevice({ host, log });

    // Try again in a second if we don't have a device yet
    if (!device) {
      await delayForDuration(1);

      this.monitorTemperature();

      return;
    }

    log(`${name} monitorTemperature`);

    // this call appears to be creating duplicate calls and delaying status refreshes
    // device.on('temperature', this.onTemperature.bind(this));
    // device.checkTemperature();

    this.updateTemperatureUI();
    if (!config.isUnitTest) setInterval(this.updateTemperatureUI.bind(this), config.temperatureUpdateFrequency * 1000)
  }

  onTemperature (temperature) {
    const { config, host, log, name, state } = this;
    const { minTemperature, maxTemperature, temperatureAdjustment } = config;

    // onTemperature is getting called twice. No known cause currently.
    // This helps prevent the same temperature from being processed twice
    if (Object.keys(this.temperatureCallbackQueue).length === 0) return;

    temperature += temperatureAdjustment

    state.currentTemperature = temperature;

    log(`${name} onTemperature (${temperature})`);

    if (temperature > config.maxTemperature) {
      log(`\x1b[36m[INFO]\x1b[0m Reported temperature (${temperature}) is too high, setting to \x1b[33mmaxTemperature\x1b[0m (${maxTemperature}).`)
      temperature = config.maxTemperature
    }

    if (temperature < config.minTemperature) {

      log(`\x1b[36m[INFO]\x1b[0m Reported temperature (${temperature}) is too low, setting to \x1b[33mminTemperature\x1b[0m (${minTemperature}).`)
      temperature = config.minTemperature

    }

    assert.isBelow(temperature, config.maxTemperature + 1, `\x1b[31m[CONFIG ERROR] \x1b[33mmaxTemperature\x1b[0m (${config.maxTemperature}) must be more than the reported temperature (${temperature})`)
    assert.isAbove(temperature, config.minTemperature - 1, `\x1b[31m[CONFIG ERROR] \x1b[33mminTemperature\x1b[0m (${config.maxTemperature}) must be less than the reported temperature (${temperature})`)

    this.processQueuedTemperatureCallbacks(temperature);
  }

  addTemperatureCallbackToQueue (callback) {
    const { config, host, log, name, state } = this;
    const { mqttURL, temperatureFilePath, w1DeviceID } = config;

    // Clear the previous callback
    if (Object.keys(this.temperatureCallbackQueue).length > 1) {
      if (state.currentTemperature) {
        log(`${name} addTemperatureCallbackToQueue (clearing previous callback, using existing temperature)`);

        this.processQueuedTemperatureCallbacks(state.currentTemperature);
      }
    }

    // Add a new callback
    const callbackIdentifier = uuid.v4();
    this.temperatureCallbackQueue[callbackIdentifier] = callback;

    // Read temperature from file
    if (temperatureFilePath) {
      this.updateTemperatureFromFile();

      return;
    }

    // Read temperature from W1 Device
    if (w1DeviceID) {
      this.updateTemperatureFromW1();

      return;
    }

    // Read temperature from mqtt
    if (mqttURL) {
      const temperature = this.mqttValueForIdentifier('temperature');
      this.onTemperature(temperature || 0);

      return;
    }

    // Read temperature from Broadlink RM device
    // If the device is no longer available, use previous tempeature
    const device = getDevice({ host, log });

    if (!device || device.state === 'inactive') {
      if (device && device.state === 'inactive') {
        log(`${name} addTemperatureCallbackToQueue (device no longer active, using existing temperature)`);
      }

      this.processQueuedTemperatureCallbacks(state.currentTemperature || 0);

      return;
    }

    device.checkTemperature();
    log(`${name} addTemperatureCallbackToQueue (requested temperature from device, waiting)`);
  }

  updateTemperatureFromFile () {
    const { config, debug, host, log, name, state } = this;
    const { temperatureFilePath } = config;

    if (debug) log(`\x1b[34m[DEBUG]\x1b[0m ${name} updateTemperatureFromFile reading file: ${temperatureFilePath}`);

    fs.readFile(temperatureFilePath, 'utf8', (err, temperature) => {
      if (err) {
         log(`\x1b[31m[ERROR] \x1b[0m${name} updateTemperatureFromFile\n\n${err.message}`);
      }

      if (temperature === undefined || temperature.trim().length === 0) {
        log(`\x1b[33m[WARNING]\x1b[0m ${name} updateTemperatureFromFile error reading file: ${temperatureFilePath}, using previous Temperature`);
        temperature = (state.currentTemperature || 0);
      }

      temperature = parseFloat(temperature);
      if (debug) log(`\x1b[34m[DEBUG]\x1b[0m ${name} updateTemperatureFromFile (parsed temperature: ${temperature})`);

      this.onTemperature(temperature);
    });
  }

  updateTemperatureFromW1 () {
    const { config, debug, host, log, name, state } = this;
    const { w1DeviceID } = config;

    var W1PATH = "/sys/bus/w1/devices";
    var fName = W1PATH + "/" + w1DeviceID + "/w1_slave";
    var temperature;

    if (debug) log(`\x1b[34m[DEBUG]\x1b[0m ${name} updateTemperatureFromW1 reading file: ${fName}`);

    fs.readFile(fName, 'utf8', (err, data) => {
      if (err) {
        log(`\x1b[31m[ERROR] \x1b[0m${name} updateTemperatureFromW1\n\n${err.message}`);
      }

      if(data.includes("t=")){
        var matches = data.match(/t=([0-9]+)/);
        temperature = parseInt(matches[1]) / 1000;
      }else{
        log(`\x1b[33m[WARNING]\x1b[0m ${name} updateTemperatureFromW1 error reading file: ${fName}, using previous Temperature`);
        temperature = (state.currentTemperature || 0);
      }

      if (debug) log(`\x1b[34m[DEBUG]\x1b[0m ${name} updateTemperatureFromW1 (parsed temperature: ${temperature})`);
      this.onTemperature(temperature);
    });
  }

  processQueuedTemperatureCallbacks (temperature) {
    if (Object.keys(this.temperatureCallbackQueue).length === 0) return;

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

  // MQTT
  onMQTTMessage (identifier, message) {
    const { debug, log, name } = this;

    if (identifier !== 'unknown' && identifier !== 'temperature') {
      log(`\x1b[31m[ERROR] \x1b[0m${name} onMQTTMessage (mqtt message received with unexpected identifier: ${identifier}, ${message.toString()})`);

      return;
    }

    super.onMQTTMessage(identifier, message);

    let temperature = this.mqttValuesTemp[identifier];

    if (debug) log(`\x1b[34m[DEBUG]\x1b[0m ${name} onMQTTMessage (raw value: ${temperature})`);

    try {
      const temperatureJSON = JSON.parse(temperature);

      if (typeof temperatureJSON === 'object') {
        let values = findKey(temperatureJSON, 'temp');
        if (values.length === 0) values = findKey(temperatureJSON, 'Temp');
        if (values.length === 0) values = findKey(temperatureJSON, 'temperature');
        if (values.length === 0) values = findKey(temperatureJSON, 'Temperature');

        if (values.length > 0) {
          temperature = values[0];
        } else {
          temperature = undefined;
        }
      }
    } catch (err) {}

    if (temperature === undefined || (typeof temperature === 'string' && temperature.trim().length === 0)) {
      log(`\x1b[31m[ERROR] \x1b[0m${name} onMQTTMessage (mqtt temperature temperature not found)`);

      return;
    }

    if (debug) log(`\x1b[34m[DEBUG]\x1b[0m ${name} onMQTTMessage (raw value 2: ${temperature.trim()})`);

    temperature = parseFloat(temperature);

    if (debug) log(`\x1b[34m[DEBUG]\x1b[0m ${name} onMQTTMessage (parsed temperature: ${temperature})`);

    this.mqttValues[identifier] = temperature;
    this.updateTemperatureUI();
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
        minStep: 0.1
      });
  }
}

module.exports = AirConAccessory
