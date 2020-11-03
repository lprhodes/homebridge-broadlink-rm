const { assert } = require('chai');
const uuid = require('uuid');
const fs = require('fs');
const findKey = require('find-key');

const delayForDuration = require('../helpers/delayForDuration');
const ServiceManagerTypes = require('../helpers/serviceManagerTypes');
const catchDelayCancelError = require('../helpers/catchDelayCancelError');
const { getDevice, discoverDevices } = require('../helpers/getDevice');
const BroadlinkRMAccessory = require('./accessory');

// Initializing predefined constants based on homekit API
// All temperature values passed and received from homekit API are defined in degree Celsius
let COOLING_THRESHOLD_TEMPERATURE = {
  minValue: 10,
  maxValue: 35,
  minStep: 0.1
}

let HEATING_THRESHOLD_TEMPERATURE = {
  minValue: 0,
  maxValue: 25,
  minStep: 0.1
}

const CharacteristicName = {
  ACTIVE: "active",
  CURRENT_HEATER_COOLER_STATE: "currentHeaterCoolerState",
  TARGET_HEATER_COOLER_STATE: "targetHeaterCoolerState",
  CURRENT_TEMPERATURE: "currentTemperature",
  COOLING_THRESHOLD_TEMPERATURE: "coolingThresholdTemperature",
  HEATING_THRESHOLD_TEMPERATURE: "heatingThresholdTemperature",
  ROTATION_SPEED: "rotationSpeed",
  SWING_MODE: "swingMode",
  SLEEP: "sleep"
}

/**
 * This accessory implements the HAP Service and Characteristics as documented under
 * https://developers.homebridge.io/#/service/HeaterCooler.
 * 
 * Implemented Characteristics
 *  1. Active
 *  2. Current Heater Cooler State
 *  3. Target Heater Cooler State (Cool & Heat only)
 *  4. Current Temperature
 *  5. Cooling Threshold Temperature
 *  6. Heating Threshold Temperature
 *  7. Rotation Speed
 *  8. Swing Mode (Oscillation)
 */
class HeaterCoolerAccessory extends BroadlinkRMAccessory {
  /**
   * 
   * @param {func} log - function used for logging
   * @param {object} config - object with config data for accessory 
   * @param {classType} serviceManagerType - represents object type of service manager
   */
  constructor(log, config = {}, serviceManagerType) {
    super(log, config, serviceManagerType)
  }

  /**
   * Setting default state of accessory for each defined characteristic. This ensures that
   * getCharacteristic calls provide valid data on first run.
   * Prerequisties: this.config is validated and defaults are initialized.
   */
  setDefaults() {
    const { config, state } = this
    const { coolingThresholdTemperature, heatingThresholdTemperature, defaultMode, defaultRotationSpeed } = config

    // For backwards compatibility with resend hex
    if (config.preventResendHex === undefined && config.allowResend === undefined) {
      config.preventResendHex = false;
    } else if (config.allowResend !== undefined) {
      config.preventResendHex = !config.allowResend;
    }

    state.active = state.active || Characteristic.Active.INACTIVE
    state.currentHeaterCoolerState = state.currentHeaterCoolerState || Characteristic.CurrentHeaterCoolerState.INACTIVE

    if (state.coolingThresholdTemperature === undefined) { state.coolingThresholdTemperature = coolingThresholdTemperature }
    if (state.heatingThresholdTemperature === undefined) { state.heatingThresholdTemperature = heatingThresholdTemperature }
    if (state.targetHeaterCoolerState === undefined) {
      state.targetHeaterCoolerState = defaultMode === "cool" ? Characteristic.TargetHeaterCoolerState.COOL : Characteristic.TargetHeaterCoolerState.HEAT
    }
    if (state.currentTemperature === undefined) { state.currentTemperature = config.defaultNowTemperature }

    const { internalConfig } = config
    const { available } = internalConfig
    if (available.cool.rotationSpeed || available.heat.rotationSpeed) {
      if (state.rotationSpeed === undefined) { state.rotationSpeed = defaultRotationSpeed }
    }
    if (available.cool.swingMode || available.heat.swingMode) {
      if (state.swingMode === undefined) { state.swingMode = Characteristic.SwingMode.SWING_DISABLED }
    }
  }


  /**
   ********************************************************
   *                       SETTERS                        *
   ********************************************************
   */
  /**
   * Updates the characteristic value for current heater cooler in homebridge service along with
   * updating cached state based on whether the device is set to cool or heat.
   */
  updateServiceCurrentHeaterCoolerState() {
    const { serviceManager, state } = this
    const { targetHeaterCoolerState } = state

    if (!state.active) {
      state.currentHeaterCoolerState = Characteristic.CurrentHeaterCoolerState.INACTIVE
      delayForDuration(0.25).then(() => {
        serviceManager.setCharacteristic(Characteristic.CurrentHeaterCoolerState, Characteristic.CurrentHeaterCoolerState.INACTIVE)
      })
      return
    }
    switch (targetHeaterCoolerState) {
      // TODO: support Auto mode
      case Characteristic.TargetHeaterCoolerState.HEAT:
        state.currentHeaterCoolerState = Characteristic.CurrentHeaterCoolerState.HEATING
        delayForDuration(0.25).then(() => {
          serviceManager.setCharacteristic(Characteristic.CurrentHeaterCoolerState, Characteristic.CurrentHeaterCoolerState.HEATING)
        })
        break
      case Characteristic.TargetHeaterCoolerState.COOL:
        state.currentHeaterCoolerState = Characteristic.CurrentHeaterCoolerState.COOLING
        delayForDuration(0.25).then(() => {
          serviceManager.setCharacteristic(Characteristic.CurrentHeaterCoolerState, Characteristic.CurrentHeaterCoolerState.COOLING)
        })
        break
      default:
    }
    this.log(`Updated currentHeaterCoolerState to ${state.currentHeaterCoolerState}`)
  }

  /**
   * Homekit automatically requests Characteristic.Active and Characteristics.TargetHeaterCoolerState
   * when the device is turned on. However it doesn't specify a temperature. We use a default temperature
   * from the config file to determine which hex codes to send if temperature control is supported.
   * 
   * setTargetHeaterCoolerState() is called by the main handler after updating the state.targetHeaterCoolerState
   * to the latest requested value. Method is only invoked by Homekit when going from 'off' -> 'any mode' or
   * 'heat/cool/auto' -> 'heat/cool/auto'. Method is not called when turning off device.
   * Characteristic.Active is either already 'Active' or set to 'Active' prior to method call.
   * This sub-handler is only called if the previous targetHeaterCoolerState value is different from the new
   * requested value
   *
   * Prerequisites: this.state is updated with the latest requested value for Target Heater Cooler State
   * @param {any} hexData The decoded data that is passed in by handler
   * @param {int} previousValue Previous value for targetHeaterCoolerState  
   */
  async setTargetHeaterCoolerState(hexData, previousValue) {
    const { config, data, state } = this
    const { internalConfig } = config
    const { available } = internalConfig
    const { targetHeaterCoolerState, heatingThresholdTemperature, coolingThresholdTemperature } = state

    this.log(`Changing target state from ${previousValue} to ${targetHeaterCoolerState}`)
    switch (targetHeaterCoolerState) {
      case Characteristic.TargetHeaterCoolerState.COOL:
        if (available.cool.temperatureCodes) {
          // update internal state to be consistent with what Home app & homebridge see
          coolingThresholdTemperature = this.serviceManager.getCharacteristic(Characteristic.CoolingThresholdTemperature).value
        }

        hexData = this.decodeHexFromConfig(CharacteristicName.TARGET_HEATER_COOLER_STATE)
        break
      case Characteristic.TargetHeaterCoolerState.HEAT:
        if (available.heat.temperatureCodes) {
          // update internal state to be consistent with what Home app & homebridge see
          heatingThresholdTemperature = this.serviceManager.getCharacteristic(Characteristic.HeatingThresholdTemperature).value
        }

        hexData = this.decodeHexFromConfig(CharacteristicName.TARGET_HEATER_COOLER_STATE)
        break
      default:
        this.log(`BUG: ${this.name} setTargetHeaterCoolerState invoked with unsupported target mode ${targetHeaterCoolerState}`)
    }

    await this.performSend(hexData)
    // Update current heater cooler state to match the new state
    this.updateServiceCurrentHeaterCoolerState()

    return;
  }

  /**
   * Returns hexcodes from config file to operate the device. Hexcodes are decoded based on the requested targetHeaterCoolerState
   * currently stored in the cached state
   * @param {CharacteristicName} toUpdateCharacteristic - string name of the characteristic that is being updated by the caller
   * @returns {any} hexData - object, array or string values to be sent to IR device
   */
  decodeHexFromConfig(toUpdateCharacteristic) {
    const { state, config, data, log, name } = this
    const { heatingThresholdTemperature, coolingThresholdTemperature, targetHeaterCoolerState } = state
    const { heat, cool } = data
    const { available } = config.internalConfig

    var temperature
    switch (targetHeaterCoolerState) {
      case Characteristic.TargetHeaterCoolerState.COOL:
        temperature = coolingThresholdTemperature
        if (!available.coolMode) {
          log(`BUG: ${name} decodeHexFromConfig invoked with unsupported target mode: cool.`)
          return "0'" // sending dummy hex data to prevent homebridge from tripping
        }
        if (toUpdateCharacteristic === CharacteristicName.ACTIVE
          && state.active === Characteristic.Active.INACTIVE) {
          return cool.off
        }
        if (!available.cool.temperatureCodes) {
          return cool.on
        }
        return this.decodeTemperatureHex(temperature, cool, toUpdateCharacteristic)
        break

      case Characteristic.TargetHeaterCoolerState.HEAT:
        temperature = heatingThresholdTemperature
        if (!available.heatMode) {
          log(`BUG: ${name} decodeHexFromConfig invoked with unsupported target mode: heat.`)
          return "0'" // sending dummy hex data to prevent homebridge from tripping
        }
        if (toUpdateCharacteristic === CharacteristicName.ACTIVE
          && state.active === Characteristic.Active.INACTIVE) {
          return heat.off
        }
        if (!available.heat.temperatureCodes) {
          return heat.on // temperature codes are not supported for the heater device
        }
        return this.decodeTemperatureHex(temperature, heat, toUpdateCharacteristic)
        break
      default:
        log(`BUG: decodeHexFromConfig has invalid value for targetHeaterCoolerState: ${targetHeaterCoolerState}.`)
        break
    }

  }

  /**
   * Recursively parses supplied hexData object to find the hex codes.
   * @param {object} hexDataObject - object to parse in order to retrieve hex codes
   * @param {array} checkCharacteristics - list of all hierarchical characteristics in the object to parse
   * @param {CharacteristicName} toUpdateCharacteristic - characteristic that is being updated
   * @returns {any} hexData - object, array or string values to be sent to IR device
   */
  decodeHierarchichalHex(hexDataObject, checkCharacteristics, toUpdateCharacteristic) {
    const { state, log, name } = this
    if (hexDataObject === undefined || hexDataObject == null) { return "hexDataObject" } // should never happen, unless bug
    if (typeof hexDataObject !== 'object') { return hexDataObject }
    if (Array.isArray(hexDataObject)) { return hexDataObject }

    // All hierarchical characteristics have been checked so we can return
    if (checkCharacteristics.length === 0) {
      return hexDataObject  // finished checking all characteristics
    }

    const keys = Object.keys(hexDataObject)
    let keyFromState
    const characteristic = checkCharacteristics.pop()
    switch (characteristic) {
      case CharacteristicName.ROTATION_SPEED:
        keyFromState = 'rotationSpeed' + state.rotationSpeed
        if (toUpdateCharacteristic === CharacteristicName.ROTATION_SPEED) {
          if (keys.includes('fanSpeedToggle')) {
            return this.decodeHierarchichalHex(hexDataObject['fanSpeedToggle'], checkCharacteristics, null)
          }
          if (keys.includes(keyFromState)) {
            return this.decodeHierarchichalHex(hexDataObject[keyFromState], checkCharacteristics, null)
          }
          log(`Could not find rotationSpeed${state.rotationSpeed} hex codes`)
          return "0"
        }
        // do not change state of fanspeed mode
        if (keys.includes('fanSpeedDnd')) {
          return decodeHierarchichalHex(hexDataObject['fanSpeedDnd'], checkCharacteristics, toUpdateCharacteristic)
        }
        if (keys.includes(keyFromState)) {
          return this.decodeHierarchichalHex(hexDataObject[keyFromState], checkCharacteristics, toUpdateCharacteristic)
        }
        break
      case CharacteristicName.SWING_MODE:
        if (toUpdateCharacteristic === CharacteristicName.SWING_MODE) {
          if (keys.includes('swingToggle')) {
            return this.decodeHierarchichalHex(hexDataObject['swingToggle'], checkCharacteristics, null)
          }
          keyFromState = state.swingMode === Characteristic.SwingMode.SWING_ENABLED ? 'swingOn' : 'swingOff'
          if (keys.includes(keyFromState)) {
            return this.decodeHierarchichalHex(hexDataObject[keyFromState], checkCharacteristics, null)
          }
          log(`Could not find swingMode hex codes for swingMode ${keyFromState}`)
          return "0"
        }
        // do not change state of swing mode
        if (keys.includes('swingDnd')) {
          return this.decodeHierarchichalHex(hexDataObject['swingDnd'], checkCharacteristics, toUpdateCharacteristic)
        }
        keyFromState = state.swingMode === Characteristic.SwingMode.SWING_ENABLED ? 'swingOn' : 'swingOff'
        if (keys.includes(keyFromState)) {
          return this.decodeHierarchichalHex(hexDataObject[keyFromState], checkCharacteristics, toUpdateCharacteristic)
        }
        break
      case undefined:
        // should not happen, this is a fail safe to prevent infinite recursion.
        log(`BUG: ${name} decodeHierarchichalHex encountered a bug, please raise an issue`)
        return hexDataObject
    }
    log(`Hex codes not found for ${characteristic}`)
    // if we reach here, this characteristic is not defined for the accessory so continue searching for the next one
    return this.decodeHierarchichalHex(hexDataObject, checkCharacteristics, toUpdateCharacteristic)
  }

  /**
   * Decode hexData from temperature codes.
   * Prerequisites: Temperature control is available
   * @param {number} temperature - temperature in degree Celsius for hex code lookup
   * @param {object} hexDataObject - Object to parse in order to find the hex codes
   * @param {CharacteristicName} toUpdateCharacteristic - characteristic that is being updated
   * @returns {any} hexData - object, array or string values to be sent to IR device
   */
  decodeTemperatureHex(temperature, hexDataObject, toUpdateCharacteristic) {
    const { config, state } = this
    const { temperatureCodes } = hexDataObject
    const { temperatureUnits, internalConfig } = config
    const { available } = internalConfig

    if (temperatureUnits === "f") {
      temperature = this.temperatureCtoF(temperature)
    }

    this.log(`Looking up temperature hex codes for ${temperature}`)

    let CONFIG_CHARACTERISTICS = [
      //CharacteristicName.SLEEP,
      CharacteristicName.SWING_MODE,
      CharacteristicName.ROTATION_SPEED
    ]

    let hexCode = "0"
    let temperatureHexDataObject = temperatureCodes[`${temperature}`]
    if (temperatureHexDataObject) {
      hexCode = this.decodeHierarchichalHex(temperatureHexDataObject, CONFIG_CHARACTERISTICS, toUpdateCharacteristic)
      this.log(`\tSending hex codes for temperature ${temperature}`)
    } else {
      this.log(`\tDid not find temperature code for ${temperature}. Please update data.${this.state.targetHeaterCoolerState === 1 ?
        "heat" : "cool"}.temperatureCodes in config.json`)
    }

    return hexCode
  }

  /**
   * Send IR codes to set the temperature of the accessory in its current mode of operation.
   * @param {string} hexData
   * @param {number} previousValue - previous temperature value
   */
  async setTemperature(hexData, previousValue) {
    const { name, log, state } = this
    const { targetHeaterCoolerState, coolingThresholdTemperature, heatingThresholdTemperature } = state
    log(`${name} setTemperature: Changing temperature from ${previousValue} to ${targetHeaterCoolerState === Characteristic.TargetHeaterCoolerState.COOL ?
      coolingThresholdTemperature : heatingThresholdTemperature}`)
    hexData = this.decodeHexFromConfig(CharacteristicName.CoolingThresholdTemperature)

    await this.performSend(hexData)
  }

  /**
   * Send IR codes to toggle the device on/off. By the time this function is invoked cached state is already updated
   * to reflect the requested value. 
   * If requested value is to turn on the device then we will send hex codes based on the last saved cached state
   * @param {string} hexData 
   * @param {int} previousValue 
   */
  async setActive(hexData, previousValue) {
    const { state, config } = this
    const { resetPropertiesOnRestart } = config
    const { available } = config.internalConfig
    const requestedValue = state.active // state is already set by main handler before this subhandler is called

    hexData = this.decodeHexFromConfig(CharacteristicName.ACTIVE)
    await this.performSend(hexData)

    // Update homebridge and home app state to reflect the cached state of all the available
    // characteristics. This ensures that UI for osciallte, fan speed, etc in the app are in
    // sync with device settings
    if (requestedValue === Characteristic.Active.INACTIVE) {
      this.updateServiceCurrentHeaterCoolerState(Characteristic.CurrentHeaterCoolerState.INACTIVE)
    } else {
      if (available.swingMode) {
        this.serviceManager.getCharacteristic(Characteristic.SwingMode)
          .updateValue(state.swingMode)
      }
      if (available.rotationSpeed) {
        this.serviceManager.getCharacteristic(Characteristic.RotationSpeed)
          .updateValue(state.rotationSpeed)
      }
    }
  }

  /**
   * Send IR codes to enable/disable swing mode (oscillation)
   * @param {string} hexData 
   * @param {int} previousValue 
   */
  async setSwingMode(hexData, previousValue) {
    const { state, data } = this
    const { swingMode } = state

    if (data.swingOn && data.swingOff) {
      hexData = swingMode === Characteristic.SwingMode.SWING_ENABLED ? data.swingOn : data.swingOff
    }
    else if (data.swingMode && data.swingToggle) {
      hexData = data.swingToggle
    }
    else {
      hexData = this.decodeHexFromConfig(CharacteristicName.SWING_MODE)
    }
    if (hexData === "0") {
      this.log(`Swing hex codes not found, resetting state to previous value`)
      state.swingMode = previousValue
      this.serviceManager.service
        .getCharacteristic(Characteristic.SwingMode)
        .updateValue(previousValue)
    } else {
      await this.performSend(hexData)
    }
  }

  /**
   * Send IR codes to change fan speed of device.
   * @param {string} hexData 
   * @param {int} previousValue - previous rotation speed of device
   */
  async setRotationSpeed(hexData, previousValue) {
    const { state } = this
    const { rotationSpeed } = state
    // TODO: Check other locations for fanSpeed
    if (rotationSpeed === 0) {
      // reset rotationSpeed back to default
      state.rotationSpeed = previousValue
      // set active handler (called by homebridge/home app) will take
      // care of turning off the fan
      return
    }
    hexData = this.decodeHexFromConfig(CharacteristicName.ROTATION_SPEED)
    if (hexData === "0") {
      this.log(`Fan speed hex codes not found, resetting back to previous value`)
      state.rotationSpeed = previousValue
      this.serviceManager.service
        .getCharacteristic(Characteristic.RotationSpeed)
        .updateValue(previousValue)
    } else {
      await this.performSend(hexData)
    }
  }

  /**
   ********************************************************
   *                       GETTERS                        *
   ********************************************************
   */
  /**
   * Read current temperature from device. We don't have any way of knowing the device temperature so we will
   * instead send a default value.
   * @param {func} callback - callback function passed in by homebridge API to be called at the end of the method
   */
  getCurrentTemperature(callback) {
    const currentTemp = this.config.defaultNowTemperature
    this.log(`${this.name} getCurrentTemperature: ${currentTemp}`)
    callback(null, currentTemp)
  }

  /**
   ********************************************************
   *                      UTILITIES                       *
   ********************************************************
   */

  /**
   * Converts supplied temperature to value from degree Celcius to degree Fahrenheit, truncating to the
   * default step size of 1. Returns temperature in degree Fahrenheit.
   * @param {number} temperature - Temperature value in degress Celcius
   */
  temperatureCtoF(temperature) {
    const temp = (temperature * 9 / 5) + 32
    const whole = Math.round(temp)
    return Math.trunc(whole)
  }

  /**
   * Converts supplied temperature to value from degree Fahrenheit to degree Celsius, truncating to the
   * default step size of 0.1. Returns temperature in degree Celsius.
   * @param {number} temperature - Temperature value in degress Fahrenheit
   */
  temperatureFtoC(temperature) {
    const temp = (temperature - 32) * 5 / 9
    const abs = Math.abs(temp)
    const whole = Math.trunc(abs)
    var fraction = (abs - whole) * 10
    fraction = Math.trunc(fraction) / 10
    return temp < 0 ? -(fraction + whole) : (fraction + whole)
  }

  /**
   ********************************************************
   *                   CONFIGURATION                      *
   ********************************************************
   */

  /**
   * Validates if the keys for optional characteristics are defined in config.json and
   * accordingly updates supplied config object
   * @param {object} dataObject - hex code object to validate keys
   * @param {object} configObject - object pointing to available.<mode>
   */
  validateOptionalCharacteristics(dataObject, configObject) {
    const isValidRotationSpeedKey = (stringValue) => stringValue.startsWith('rotationSpeed') // loose validation, can further validate number endings
    const isValidSwingModeKey = (stringValue) => stringValue.startsWith('swing')
    const isValidSleepKey = (stringValue) => stringValue.startsWith('sleep')
    const isValidTemperature = (stringValue) => isFinite(Number(stringValue)) // Arrow function to check if supplied string is a int or float parseable number

    const dataObjectKeys = Object.keys(dataObject)
    this.log(`Checking keys ${dataObjectKeys}`)
    if (!configObject.temperatureCodes && dataObjectKeys.every(isValidTemperature)) {
      configObject.temperatureCodes = true
    }
    else if (!configObject.rotationSpeed && dataObjectKeys.every(isValidRotationSpeedKey)) {
      configObject.rotationSpeed = true
    }
    else if (!configObject.swingMode && dataObjectKeys.every(isValidSwingModeKey)) {
      configObject.swingMode = true
    }
    else if (!configObject.sleep && dataObjectKeys.every(isValidSleepKey)) {
      configObject.sleep = true
    }


    for (const [key, value] of Object.entries(dataObject)) {
      this.log(`Going into key -> ${key}`)
      if (typeof value === 'object' && !Array.isArray(value)) {
        this.validateOptionalCharacteristics(value, configObject)
      }
    }
  }

  /**
   * Configure optional characteristics like rotation speed, swing mode, temperature control
   * and sleep mode
   */
  configureOptionalCharacteristics() {
    const { name, config, data } = this
    const { internalConfig } = config
    const { available } = internalConfig || {}
    const { heat, cool } = data
    assert(available.coolMode || available.heatMode, `ERROR: ${name} configureOptionalCharacteristics invoked without configuring heat and cool modes`)
    available.cool = new Object()
    available.heat = new Object()
    available.cool.temperatureCodes = false
    available.cool.rotationSpeed = false
    available.cool.swingMode = false
    available.cool.sleep = false
    available.heat.temperatureCodes = false
    available.heat.rotationSpeed = false
    available.heat.swingMode = false
    available.heat.sleep = false

    if (available.coolMode && cool.temperatureCodes && typeof cool.temperatureCodes === 'object'
      && !Array.isArray(cool.temperatureCodes)) {
      this.validateOptionalCharacteristics(cool.temperatureCodes, available.cool)
    }

    if (available.heatMode && heat.temperatureCodes && typeof heat.temperatureCodes === 'object'
      && !Array.isArray(heat.temperatureCodes)) {
      this.validateOptionalCharacteristics(heat.temperatureCodes, available.heat)
    }

    this.log(`INFO ${name} configured with optional characteristics:
    Temperature control: ${available.cool.temperatureCodes} ${available.heat.temperatureCodes}
    Rotation speed: ${available.cool.rotationSpeed} ${available.heat.rotationSpeed}
    Swing mode: ${available.cool.swingMode} ${available.heat.swingMode}
    Sleep: ${available.cool.sleep} ${available.heat.sleep}`)
  }

  /**
   * Validates and initializes following values in this.config:
   * coolingThresholdTemperature, heatingThresholdTemperature, defaultNowTemperature,
   * minTemperature, maxTemperature,temperatureUnits.
   * All temperatures are converted to degree Celsius for internal usage in the plugin.
   */
  configureTemperatures() {
    const { config } = this
    const { internalConfig } = config
    const { available } = internalConfig

    if (!["C", "c", "F", "f"].includes(config.temperatureUnits)) { config.temperatureUnits = "c" }
    config.temperatureUnits = config.temperatureUnits.toLowerCase()

    const { coolingThresholdTemperature, heatingThresholdTemperature, temperatureUnits, defaultNowTemperature } = config

    if (coolingThresholdTemperature === undefined) {
      config.coolingThresholdTemperature = 35
    } else if (temperatureUnits === "f") {
      config.coolingThresholdTemperature = this.temperatureFtoC(coolingThresholdTemperature)
    }
    if (heatingThresholdTemperature === undefined) {
      config.heatingThresholdTemperature = 10
    } else if (temperatureUnits === "f") {
      config.heatingThresholdTemperature = this.temperatureFtoC(heatingThresholdTemperature)
    }
    if (defaultNowTemperature === undefined) {
      config.defaultNowTemperature = 24
    } else if (temperatureUnits === "f") {
      config.defaultNowTemperature = this.temperatureFtoC(defaultNowTemperature)
    }
    // convert min and max temperatures to degree Celsius if defined as fahrenheit
    if (temperatureUnits === "f") {
      if (config.minTemperature) { config.minTemperature = this.temperatureFtoC(config.minTemperature) }
      if (config.maxTemperature) { config.maxTemperature = this.temperatureFtoC(config.maxTemperature) }
    }

    const { cool, heat } = config.data
    // Apple doesn't complain if we set the values above or below documented max,min values respectively
    // so if your device supports a higher max or a lower min we set it here.
    if (available.heatMode) {
      heat.minTemperature = Math.min(heat.minTemperature, HEATING_THRESHOLD_TEMPERATURE.minValue)
      heat.maxTemperature = Math.max(heat.maxTemperature, HEATING_THRESHOLD_TEMPERATURE.maxValue)
    }

    if (available.coolMode) {
      cool.minTemperature = Math.min(cool.minTemperature, COOLING_THRESHOLD_TEMPERATURE.minValue)
      cool.maxTemperature = Math.max(cool.maxTemperature, COOLING_THRESHOLD_TEMPERATURE.maxValue)
    }
  }

  /**
   * Configures available heat and cool operations in the this.config.internalConfig
   * based on parsing of config.json
   * Prerequisites: this.config and this.data are defined, this.config.internalConfig.available
   * is allocated.
   */
  configureHeatCoolModes() {
    const { config } = this
    const { heat, cool } = config.data || {}

    const { internalConfig } = config
    assert(internalConfig !== undefined && typeof internalConfig === 'object', `ERROR: ${this.name} internalConfig is not initialized. Please raise an issue`)
    const { available } = internalConfig
    assert(available !== undefined && typeof available === 'object', `ERROR: ${this.name} internalConfig.available is not initialized. Please raise an issue`)

    if (typeof heat === 'object' && heat.on !== undefined && heat.off !== undefined) {
      internalConfig.available.heatMode = true
    } else {
      internalConfig.available.heatMode = false
    }
    if (typeof cool === 'object' && cool.on !== undefined && cool.off !== undefined) {
      internalConfig.available.coolMode = true
    } else {
      internalConfig.available.coolMode = false
    }

    if (!available.coolMode && !available.heatMode)
      throw new Error(`At least one of data.cool or data.heat object is required in config.json. Please update your config.json file`)
    // Default power on mode for first run when both heat & cool modes are available.
    if (config.defaultMode === undefined) {
      config.defaultMode = available.coolMode ? "cool" : "heat"
    }
  }

  /**
   * Setup default config values which are used to initializing the service manager
   */
  configDefaultsHelper() {
    const { config, name, log } = this

    // this is a safeguard and should never happen unless the base constructor invokes
    // setupServiceManager before validating config file
    if (config === undefined || typeof config !== 'object')
      throw new Error('config.json is not setup properly, please check documentation')

    const { data } = config
    if (data === undefined || typeof data !== 'object')
      throw new Error(`data object is required in config.json for initializing accessory`)

    config.defaultRotationSpeed = config.defaultRotationSpeed || 100
    config.internalConfig = new Object()
    config.internalConfig.available = new Object()
    const { available } = config.internalConfig

    this.configureHeatCoolModes()
    this.configureTemperatures()
    this.configureOptionalCharacteristics()

    log(`${name} initialized with modes Cool: ${available.coolMode ? '\u2705' : '\u274c'}, Heat: ${available.heatMode ? '\u2705' : '\u274c'},\
    config temperatures as: ${this.config.temperatureUnits === "f" ? '\u00b0F' : '\u00b0C'}\
    Using following default configuration:
    Power on mode: ${config.defaultMode}
    Now Temperature: ${config.defaultNowTemperature} \u00b0C
    Cooling Temperature: ${config.coolingThresholdTemperature} \u00b0C
    Heating Temperature: ${config.heatingThresholdTemperature} \u00b0C`)
  }

  // Service Manager Setup
  setupServiceManager() {
    this.configDefaultsHelper()
    const { config, name, data, serviceManagerType } = this;
    const { minTemperature, maxTemperature } = config
    const { internalConfig } = config
    const { available } = internalConfig

    this.serviceManager = new ServiceManagerTypes[serviceManagerType](name, Service.HeaterCooler, this.log);

    // Setting up all Required Characteristic handlers
    this.serviceManager.addToggleCharacteristic({
      name: 'active',
      type: Characteristic.Active,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        setValuePromise: this.setActive.bind(this)
      }
    });

    this.serviceManager.addToggleCharacteristic({
      name: 'currentHeaterCoolerState',
      type: Characteristic.CurrentHeaterCoolerState,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
      }
    });

    this.serviceManager.addToggleCharacteristic({
      name: 'targetHeaterCoolerState',
      type: Characteristic.TargetHeaterCoolerState,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        setValuePromise: this.setTargetHeaterCoolerState.bind(this),
      }
    });

    this.serviceManager.addGetCharacteristic({
      name: 'currentTemperature',
      type: Characteristic.CurrentTemperature,
      method: this.getCurrentTemperature,
      bind: this
    });


    // Setting up Required Characteristic Properties
    /**
     * There seems to be bug in Apple's Homekit documentation and/or implementation for the properties of
     * TargetHeaterCoolerState
     * 
     * If we want to support only heat or only cool then the configuration of
     * (minValue: 1, maxValue:2, validValues: [<1 or 2>]) accomplishes this
     *
     * When we want to support heat or cool without the auto mode, we have to provide
     * (minValue: 1, maxValue:2, validValues as [0, 1, 2])
     * 
     * In addition, in order to support auto mode along with this, heat and cool, we need to update the
     * configuration as (minValue: 0, maxValue:2, validValues: [0, 1, 2]).
     * 
     * As per Apple guidelines, if an accessory supports heat or cool mode then it also needs to support
     * auto functionality.
     */
    var validTargetHeaterCoolerValues = []

    if (available.heatMode && available.coolMode) {
      validTargetHeaterCoolerValues.push(
        Characteristic.TargetHeaterCoolerState.AUTO,
      )
    }

    if (available.heatMode) {
      validTargetHeaterCoolerValues.push(Characteristic.TargetHeaterCoolerState.HEAT)
    }

    if (available.coolMode) {
      validTargetHeaterCoolerValues.push(Characteristic.TargetHeaterCoolerState.COOL)
    }

    this.serviceManager
      .getCharacteristic(Characteristic.TargetHeaterCoolerState)
      .setProps({
        minValue: 1,
        maxValue: 2,
        validValues: validTargetHeaterCoolerValues
      })

    this.serviceManager
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: 10,
        maxValue: 40,
        minStep: 0.1
      })

    // Setting up optional Characteristics handlers
    if (available.cool.temperatureCodes) {
      this.serviceManager.addToggleCharacteristic({
        name: 'coolingThresholdTemperature',
        type: Characteristic.CoolingThresholdTemperature,
        getMethod: this.getCharacteristicValue,
        setMethod: this.setCharacteristicValue,
        bind: this,
        props: {
          setValuePromise: this.setTemperature.bind(this),
        }
      })
      // Characteristic properties
      this.serviceManager
        .getCharacteristic(Characteristic.CoolingThresholdTemperature)
        .setProps({
          minValue: minTemperature,
          maxValue: maxTemperature,
          minStep: 0.1
        })
    }

    if (available.heat.temperatureCodes) {
      this.serviceManager.addToggleCharacteristic({
        name: 'heatingThresholdTemperature',
        type: Characteristic.HeatingThresholdTemperature,
        getMethod: this.getCharacteristicValue,
        setMethod: this.setCharacteristicValue,
        bind: this,
        props: {
          setValuePromise: this.setTemperature.bind(this),
        }
      })
      // Characteristic properties
      this.serviceManager
        .getCharacteristic(Characteristic.HeatingThresholdTemperature)
        .setProps({
          minValue: minTemperature,
          maxValue: maxTemperature,
          minStep: 0.1
        })
    }

    // TODO: Update checks to also validate stateless global settings
    if (available.cool.swingMode || available.heat.swingMode) {
      this.serviceManager.addToggleCharacteristic({
        name: 'swingMode',
        type: Characteristic.SwingMode,
        getMethod: this.getCharacteristicValue,
        setMethod: this.setCharacteristicValue,
        bind: this,
        props: {
          setValuePromise: this.setSwingMode.bind(this)
        }
      })
    }

    if (available.cool.rotationSpeed || available.heat.rotationSpeed) {
      this.serviceManager.addToggleCharacteristic({
        name: 'rotationSpeed',
        type: Characteristic.RotationSpeed,
        getMethod: this.getCharacteristicValue,
        setMethod: this.setCharacteristicValue,
        bind: this,
        props: {
          setValuePromise: this.setRotationSpeed.bind(this)
        }
      })
      this.serviceManager
        .getCharacteristic(Characteristic.RotationSpeed)
        .setProps({
          minStep: config.fanStepSize || 1,
          minValue: 0,
          maxValue: 100
        })
    }
    // ---- End of setupServiceManager() -----
  }

  // ---- End of HeaterCoolerAccessory ----
}

module.exports = HeaterCoolerAccessory
