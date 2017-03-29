const BroadlinkRMAccessory = require('./accessory');
const discoveredDevices = require('../helpers/devices.js');
const sendData = require('../helpers/sendData');

class AirConAccessory extends BroadlinkRMAccessory {

  constructor (log, config) {
    super(log, config)

    const { defaultCoolTemperature, defaultHeatTemperature, heatTemperature, minTemperature, maxTemperature, replaceAutoMode, units } = config

    this.log = log;
    this.currentHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF
    this.targetTemperature = 0
    this.firstTemperatureUpdate = true

    config.minTemperature = minTemperature || 0
    config.maxTemperature = maxTemperature || 30

    config.temperatureDisplayUnits = (units && units.toLowerCase() === 'f') ? Characteristic.TemperatureDisplayUnits.FAHRENHEIT : Characteristic.TemperatureDisplayUnits.CELSIUS;

    // When a temperature hex doesn't exist we try to use the hex set for these
    // default temperatures
    config.defaultCoolTemperature = defaultCoolTemperature || 16
    config.defaultHeatTemperature = defaultHeatTemperature || 30

    // Used to determine when we should use the defaultHeatTemperature or the
    // defaultHeatTemperature
    config.heatTemperature = heatTemperature || 22

    // When we turn on the thermostat with Siri it comes thrugh as "auto" which
    // isn't particularly supported at this time so we convert the mode to cool
    // or heat
    // Note that this is only used when you use Siri or press Auto immediately
    // after launching Homebridge. The rest of the time we'll use your last known
    // temperature
    config.replaceAutoMode = replaceAutoMode || 'cool'

    this.callbackQueue = {}
  }

  getServices () {
    const services = super.getServices();
    const { data, config, name } = this;
    const { minTemperature, maxTemperature } = config

    const service = new Service.Thermostat(name);

    // Required Characteristics
    service
      .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .on('get', this.getCurrentHeatingCoolingState.bind(this));

    service
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .on('get', this.getTargetHeatingCoolingState.bind(this))
      .on('set', this.setTargetHeatingCoolingState.bind(this));

    service
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', this.getCurrentTemperature.bind(this));

    service
      .getCharacteristic(Characteristic.TargetTemperature)
      .on('get', this.getTargetTemperature.bind(this))
      .on('set', this.setTargetTemperature.bind(this));

    service
      .getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .on('get', this.getTemperatureDisplayUnits.bind(this))
      .on('set', this.setTemperatureDisplayUnits.bind(this));

    service
      .getCharacteristic(Characteristic.Name)
      .on('get', this.getName.bind(this, name));

    service
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: minTemperature,
        maxValue: maxTemperature,
        minStep: 1
      });

    service
      .getCharacteristic(Characteristic.TargetTemperature)
      .setProps({
        minValue: minTemperature,
        maxValue: maxTemperature,
        minStep: 1
      });

    this.thermostatService = service
    services.push(service)

    return services
  }

  updateServiceHeatingCoolingState (value) {
    if (this.currentHeatingCoolingState === value) return

    this.currentHeatingCoolingState = value

    // this.log(`setCharacteristic for CurrentHeatingCoolingState and TargetHeatingCoolingState (${value})`)
    this.thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState, value);
    this.thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, value);
  }

  // Thermostat
  sendTemperature (temperature, callback) {
    const { config, data, host, log } = this
    const { defaultHeatTemperature, defaultCoolTemperature, heatTemperature } = config

    log(`Potentially sendTemperature (${temperature})`);

    let hasTemperatureChanged = (this.targetTemperature !== temperature)
    let hexData = data[`temperature${temperature}`]

    // You may not want to set the hex data for every single mode...
    if (!hexData) {
      const defaultTemperature = (temperature >= heatTemperature) ? defaultHeatTemperature : defaultCoolTemperature
      hexData = data[`temperature${defaultTemperature}`]

      if (!hexData) {
        const error = Error(`You need to provide a hex code for the given mode/temperature
          ({ "temperature${this.targetTemperature}": { "data": "HEXCODE", "pseudo-mode" : "auto/heat/cool" } })
          or at the very least, the default mode/temperature
          ({ "temperature${defaultTemperature}": { "data": "HEXCODE", "pseudo-mode" : "auto/heat/cool" } })`)

        log(error.message)

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

    const mode = hexData['pseudo-mode']
    this.log(`sendTemperature (${this.targetTemperature}, ${mode})`);
    this.updateServiceHeatingCoolingState(this.heatingCoolingStateForConfigKey(hexData['pseudo-mode']))

    this.thermostatService.setCharacteristic(Characteristic.TargetTemperature, this.targetTemperature);

    this.lastUsedTemperature = this.targetTemperature
    this.lastUsedHeatingCoolingState= this.currentHeatingCoolingState

    sendData(host, hexData.data, callback, log)
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

	setTargetHeatingCoolingState (value, callback) {
    const { config, data, host, log } = this
    const { defaultCoolTemperature, defaultHeatTemperature, replaceAutoMode } = config

    // Perform the auto -> cool/heat conversion descrived in constructor()
    if (replaceAutoMode && this.configKeyForHeatingCoolingState(value) === 'auto') {
      if (this.firstTemperatureUpdate || this.lastUsedHeatingCoolingState === this.heatingCoolingStateForConfigKey('auto')) {
     		log(`setTargetHeatingCoolingState (converting from auto to ${replaceAutoMode})`);

        setTimeout(() => {
          this.thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, this.heatingCoolingStateForConfigKey(replaceAutoMode));
        }, 300)
      } else {
        this.targetTemperature = this.lastUsedTemperature

        log(`setTargetHeatingCoolingState (converting from auto to last used - ${this.configKeyForHeatingCoolingState(this.lastUsedHeatingCoolingState)})`);
        setTimeout(() => {
          this.thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, this.lastUsedHeatingCoolingState);
        }, 300)
      }

      return callback()
    }

    if (value === undefined) return callback(); // Some calls are made to this without a value
    if (value === this.currentHeatingCoolingState) return callback()

    let temperature = this.targetTemperature

    if (value === Characteristic.TargetHeatingCoolingState.HEAT) {
      temperature = defaultHeatTemperature
    } else if (value === Characteristic.TargetHeatingCoolingState.COOL) {
      temperature = defaultCoolTemperature
    }

    const currentModeConfigKey = this.configKeyForHeatingCoolingState(value)
    log(`setTargetHeatingCoolingState (${currentModeConfigKey})`);

    if (currentModeConfigKey === 'off') {
      this.updateServiceHeatingCoolingState(value)
      sendData(host, data.off, callback, log)
    } else {
      this.sendTemperature(temperature, callback)
    }
	}

	getCurrentTemperature (callback) {
    const { host, log } = this;
 		log(`getCurrentTemperature`);

    let device;

    if (host) {
      device = discoveredDevices[host];
    } else {
      const hosts = Object.keys(discoveredDevices)
      if (hosts.length === 0) {
        log(`Get temperature (no devices found)`);

        return callback(0)
      }

      device = discoveredDevices[hosts[0]];
    }

    if (!device) {
      log(`Get temperature (no device found at ${host})`);

      return callback(0)
    }

    const callbackIdentifier = Date.now()
    this.callbackQueue[callbackIdentifier] = callback

    // Make sure we're only calling one at a time
    if (Object.keys(this.callbackQueue).length > 1) return

    let onTemperature

    onTemperature = (temperature) => {
      this.currentTemperature = temperature;

      if (this.removeTemperatureListenerTimer) clearTimeout(this.removeTemperatureListenerTimer)
      device.removeListener('temperature', onTemperature);
      this.processQueuedCallbacks()

      log(`getCurrentTemperature (${temperature})`);
 		}

    // Add a 3 second timeout
    this.removeTemperatureListenerTimer = setTimeout(() => {
      device.removeListener('temperature');
      this.processQueuedCallbacks()

   		log(`getCurrentTemperature (3s timeout)`);
    }, 3000)

   	device.on('temperature', onTemperature);

 		device.checkTemperature();
	}

  processQueuedCallbacks () {
    Object.keys(this.callbackQueue).forEach((callbackIdentifier) => {
      const callback = this.callbackQueue[callbackIdentifier]
      callback(null, this.currentTemperature);

      delete this.callbackQueue[callbackIdentifier]
    })
  }

	getTargetTemperature (callback) {
		this.log(`getTargetTemperature (${this.targetTemperature})`);
		callback(null, this.targetTemperature)
	}

	setTargetTemperature (value, callback) {
		this.log(`setTargetTemperature (${value})`);

    this.sendTemperature(value, callback)
	}

	getTemperatureDisplayUnits (callback) {
    const { config, log } = this
    const { temperatureDisplayUnits } = config

		log(`getTemperatureDisplayUnits (${temperatureDisplayUnits})`);

		callback(null, temperatureDisplayUnits);
	}

	setTemperatureDisplayUnits (value, callback) {
    const { config, log } = this
    const { temperatureDisplayUnits } = config

		log(`setTemperatureDisplayUnits from ${temperatureDisplayUnits} to ${value}`);

		config.temperatureDisplayUnits = value;

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

module.exports = AirConAccessory
