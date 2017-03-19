const sender = require('./sender');

let Service, Characteristic;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  return ThermostatService
}

class ThermostatService {

  constructor (log, config, thermostatData) {
    this.log = log;

    const { host, name, data } = config

    this.host = host
    this.name = name
    this.data = data
    this.thermostatData = thermostatData
    this.thermostatService = null

    this.currentHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF
    this.minTemperature = data.minTemperature || 0
    this.maxTemperature = data.maxTemperature || 30
    this.targetTemperature = 0
    this.temperatureDisplayUnits = (data.units && data.units.toLowerCase() === 'f') ? Characteristic.TemperatureDisplayUnits.FAHRENHEIT : Characteristic.TemperatureDisplayUnits.CELSIUS;

    // When a temperature hex doesn't exist we try to use the hex set for these
    // default temperatures
    this.defaultCoolTemperature = data.defaultCoolTemperature || 16
    this.defaultHeatTemperature = data.defaultHeatTemperature || 30

    // Used to determine when we should use the defaultHeatTemperature or the
    // defaultHeatTemperature
    this.heatTemperature = data.heatTemperature || 22

    // When we turn on the thermostat with Siri it comes thrugh as "auto" which
    // isn't particularly supported at this time so we convert the mode to cool
    // or heat
    // Note that this is only used when you use Siri or press Auto immediately
    // after launching Homebridge. The rest of the time we'll use your last known
    // temperature
    this.replaceAutoMode = data.replaceAutoMode || 'cool'

    this.firstTemperatureUpdate = true
  }

  createService () {
    const data = this.thermostatData
    const { name } = data

    const thermostatService = new Service.Thermostat(name || this.name);

    // Required Characteristics
    thermostatService
      .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .on('get', this.getCurrentHeatingCoolingState.bind(this));

    thermostatService
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .on('get', this.getTargetHeatingCoolingState.bind(this))
      .on('set', this.setTargetHeatingCoolingState.bind(this, data));

    thermostatService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', this.getCurrentTemperature.bind(this));

    thermostatService
      .getCharacteristic(Characteristic.TargetTemperature)
      .on('get', this.getTargetTemperature.bind(this))
      .on('set', this.setTargetTemperature.bind(this, data));

    thermostatService
      .getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .on('get', this.getTemperatureDisplayUnits.bind(this))
      .on('set', this.setTemperatureDisplayUnits.bind(this));

    thermostatService
      .getCharacteristic(Characteristic.Name)
      .on('get', this.getName.bind(this, name || this.name));

    thermostatService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: this.minTemperature,
        maxValue: this.maxTemperature,
        minStep: 1
      });

    thermostatService
      .getCharacteristic(Characteristic.TargetTemperature)
      .setProps({
        minValue: this.minTemperature,
        maxValue: this.maxTemperature,
        minStep: 1
      });

    this.thermostatService = thermostatService

    return thermostatService
  }

  updateServiceHeatingCoolingState (value) {
    if (this.currentHeatingCoolingState === value) return

    this.currentHeatingCoolingState = value

    // this.log(`setCharacteristic for CurrentHeatingCoolingState and TargetHeatingCoolingState (${value})`)
    this.thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState, value);
    this.thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, value);
  }

  // Thermostat
  sendTemperature (temperature, data, callback) {
    data = data.data

    this.log(`Potentially sendTemperature (${temperature})`);

    let hasTemperatureChanged = (this.targetTemperature !== temperature)
    let hexData = data[`temperature${temperature}`]

    // You may not want to set the hex data for every single mode...
    if (!hexData) {
      const defaultTemperature = (temperature >= this.heatTemperature) ? this.defaultHeatTemperature : this.defaultCoolTemperature
      hexData = data[`temperature${defaultTemperature}`]

      if (!hexData) {
        const error = Error(`You need to provide a hex code for the given mode/temperature
          ({ "temperature${this.targetTemperature}": { "data": "HEXCODE", "mode" : "auto/heat/cool" } })
          or at the very least, the default mode/temperature
          ({ "temperature${defaultTemperature}": { "data": "HEXCODE", "mode" : "auto/heat/cool" } })`)

        this.log(error.message)

        return callback(error)
      }

      hasTemperatureChanged = (this.targetTemperature !== defaultTemperature)
      this.log(`Update to default temperature (${defaultTemperature})`);

      this.targetTemperature = defaultTemperature
    } else {
      this.targetTemperature = temperature
    }

    if (!hasTemperatureChanged && !this.firstTemperatureUpdate && this.currentHeatingCoolingState !== Characteristic.TargetHeatingCoolingState.OFF) return callback()

    this.firstTemperatureUpdate = false

    this.log(`sendTemperature (${this.targetTemperature}, ${hexData.mode})`);
    this.updateServiceHeatingCoolingState(this.heatingCoolingStateForConfigKey(hexData.mode))

    this.thermostatService.setCharacteristic(Characteristic.TargetTemperature, this.targetTemperature);

    this.lastUsedTemperature = this.targetTemperature
    this.lastUsedHeatingCoolingState= this.currentHeatingCoolingState

    sender(this.host, hexData.data, callback, this.log)
  }

	getCurrentHeatingCoolingState (callback) {
		this.log('getCurrentHeatingCoolingState');

    this.updateServiceHeatingCoolingState(this.currentHeatingCoolingState)

    callback(null, this.currentHeatingCoolingState); // success
	}

	getTargetHeatingCoolingState (callback) {
    const currentModeConfigKey = this.configKeyForCurrentHeatingCoolingState()
		this.log(`getTargetHeatingCoolingState (${currentModeConfigKey})`);

		callback(null, this.currentHeatingCoolingState); // success
	}

	setTargetHeatingCoolingState (data, value, callback) {
    // Perform the auto -> cool/heat conversion descrived in constructor()
    if (this.replaceAutoMode && this.configKeyForHeatingCoolingState(value) === 'auto') {
      if (this.firstTemperatureUpdate) {
        this.thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, this.heatingCoolingStateForConfigKey(this.replaceAutoMode));
      } else {
        this.targetTemperature = this.lastUsedTemperature
        this.thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, this.lastUsedHeatingCoolingState);
      }

      return callback()
    }

    if (value === undefined) return callback(); // Some calls are made to this without a value
    if (value === this.currentHeatingCoolingState) return callback()

    let temperature = this.targetTemperature

    if (value === Characteristic.TargetHeatingCoolingState.HEAT) {
      temperature = this.defaultHeatTemperature
    } else if (value === Characteristic.TargetHeatingCoolingState.COOL) {
      temperature = this.defaultCoolTemperature
    }

    const currentModeConfigKey = this.configKeyForHeatingCoolingState(value)
    this.log(`setTargetHeatingCoolingState (${currentModeConfigKey})`);

    if (currentModeConfigKey === 'off') {
      this.updateServiceHeatingCoolingState(value)
      sender(this.host, data.data.off, callback, this.log)
    } else {
      this.sendTemperature(temperature, data, callback)
    }
	}

	getCurrentTemperature (callback) {
		this.log(`getCurrentTemperature (${this.targetTemperature})`);

		callback(null, this.currentTemperature); // success
	}

	getTargetTemperature (callback) {
		this.log(`getTargetTemperature (${this.targetTemperature})`);
		callback(null, this.targetTemperature)
	}

	setTargetTemperature (data, value, callback) {
		this.log(`setTargetTemperature (${value})`);

    this.sendTemperature(value, data, callback)
	}

	getTemperatureDisplayUnits (callback) {
		this.log(`getTemperatureDisplayUnits (${this.temperatureDisplayUnits})`);

		callback(null, this.temperatureDisplayUnits);
	}

	setTemperatureDisplayUnits (value, callback) {
		this.log(`setTemperatureDisplayUnits from ${this.temperatureDisplayUnits} to ${value}`);

		this.temperatureDisplayUnits = value;

		callback(null);
	}

  getName (name, callback) {
		this.log(`getName: ${name}`);

		callback(null, name);
	}

  configKeyForCurrentHeatingCoolingState () {
    return this.configKeyForHeatingCoolingState(this.currentHeatingCoolingState)
  }

  configKeyForHeatingCoolingState (state) {
    switch (state) {
      case Characteristic.TargetHeatingCoolingState.AUTO:
        return 'auto'
      case Characteristic.TargetHeatingCoolingState.COOL:
        return 'cool'
      case Characteristic.TargetHeatingCoolingState.HEAT:
        return 'heat'
      default:
        return 'off'
    }
  }

  heatingCoolingStateForConfigKey (configKey) {
    switch (configKey) {
      case 'off':
        return Characteristic.TargetHeatingCoolingState.OFF
      case 'cool':
        return Characteristic.TargetHeatingCoolingState.COOL
      case 'heat':
        return Characteristic.TargetHeatingCoolingState.HEAT
      default:
        return Characteristic.TargetHeatingCoolingState.AUTO
    }
  }
}
