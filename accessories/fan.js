const ServiceManagerTypes = require('../helpers/serviceManagerTypes');

const SwitchAccessory = require('./switch');

class FanAccessory extends SwitchAccessory {

  async setSwitchState (hexData, previousValue) {
    const { config, state, serviceManager } = this;

    if (!this.state.switchState) {
      this.lastFanSpeed = undefined;
    }

    // Reset the fan speed back to the default speed when turned off
    if (this.state.switchState === false && config && config.alwaysResetToDefaults) {
      this.setDefaults();
      serviceManager.setCharacteristic(Characteristic.RotationSpeed, state.fanSpeed);
    }

    super.setSwitchState(hexData, previousValue);
  }

  setDefaults () {
    super.setDefaults();
  
    let { config, state } = this;

    // Reset the fan speed back to the default speed when turned off
    // This will also be called whenever homebridge is restarted
    if (config && config.alwaysResetToDefaults) {
      state.fanSpeed = (config.defaultFanSpeed !== undefined) ? config.defaultFanSpeed : 100;
    }
  }

  async setFanSpeed (hexData) {
    const { data, host, log, state, name, debug} = this;

    this.reset();

    // Create an array of speeds specified in the data config
    const foundSpeeds = [];
    const allHexKeys = Object.keys(data || {});

    allHexKeys.forEach((key) => {
      const parts = key.split('fanSpeed');

      if (parts.length !== 2) return;

      foundSpeeds.push(parts[1])
    })

    if (foundSpeeds.length === 0) {
      return log(`${name} setFanSpeed: No fan speed hex codes provided.`)
    }

    // Find speed closest to the one requested
    const closest = foundSpeeds.reduce((prev, curr) => Math.abs(curr - state.fanSpeed) < Math.abs(prev - state.fanSpeed) ? curr : prev);
    log(`${name} setFanSpeed: (closest: ${closest})`);

    if (this.lastFanSpeed === closest) {
      return;
    }

    this.lastFanSpeed = closest;

    // Get the closest speed's hex data
    hexData = data[`fanSpeed${closest}`];

    // Check if the device is configured with combined fan and swing mode hex codes
    // e.g. fanSpeedX : { swingOn/swingOff:  }
    if (typeof hexData === 'object' &&  hexData !== null) {
      log('Determining hex code by decoding fanSpeed object');
      if ('swingMode' in state) {
        log(`Using swingMode of ${state['swingMode']}`);
        hexData = state['swingMode'] === Characteristic.SwingMode.SWING_ENABLED ? hexData['swingOn'] : hexData['swingOff'];
      } else {
        log(`Using swingMode of 0`);
        hexData = hexData['swingOff'];
      }
    }

    if (!hexData) {
      log('Could not find hex codes for fanSpeed, please check the config.json file')
      return;
    }

    await this.performSend(hexData);

    this.checkAutoOnOff();
  }

  // Determine the hex codes for the requested swing mode and send the
  // IR signals to execute it.
  // hexData: hex codes for swing modes from the config file
  //
  // NOTE: This handler is designed to keep the plugin backwards compatible
  // while also allowing for combined fan speed and swing mode hex codes.
  // This handler function is called by setCharacteristicValue which
  // is the main handler registered with homebridge. setCharacteristicValue()
  // calls this handler with hex code from config. We need to know if homebridge
  // requested to turn on/off swing so we can decipher the hex code acccordingly. 
  // If values in config for swingOn, swingOff are set as "on" and "off"
  // respectively the handler will decipher the hex codes for swing mode from
  // the fanSpeed object.
  async setSwingMode (hexData) {
    const { data, log, state } = this;

    const currSpeed = state['fanSpeed'];
    const fanSpeedObj = currSpeed ? data["fanSpeed" + currSpeed] : undefined;

    // config.swingOn: "on" and config.swingOff: "off" to support combined
	  // speed + swing values
    if (hexData === "off") { // requested value off
      if (fanSpeedObj['swingOff']) {
        hexData = fanSpeedObj['swingOff'];
      } else {
        log(`Could not locate value for fanSpeed${currSpeed}.swingOff in config.json`);
		    return;
      }
    }
    if (hexData === "on") {
      if (fanSpeedObj['swingOn']) {
        hexData = fanSpeedObj['swingOn'];
      } else {
        log(`Could not locate value for fanSpeed${currSpeed}.swingOn in config.json`);
		    return;
      }
    }

    await this.performSend(hexData);

    this.checkAutoOnOff();
  }

  // Read "stepSize" from the config file if present else
  // set it to a default value.
  getFanSpeedStepSize() {
    const step = this.data['stepSize']

    // since fan speed is % based in the plugin the default
    // step size is set to 1.
    return isNaN(step) || step > 100 || step < 1 ? 1 : step
  }

  setupServiceManager () {
    const { config, data, name, serviceManagerType } = this;
    let { showSwingMode, showRotationDirection, hideSwingMode, hideRotationDirection } = config;
    const { on, off, clockwise, counterClockwise, swingToggle, swingOn, swingOff } = data || {};

    // Defaults
    if (showSwingMode !== false && hideSwingMode !== true) showSwingMode = true
    if (showRotationDirection !== false && hideRotationDirection !== true) showRotationDirection = true

    this.serviceManager = new ServiceManagerTypes[serviceManagerType](name, Service.Fanv2, this.log);

    this.serviceManager.addToggleCharacteristic({
      name: 'switchState',
      type: Characteristic.Active,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        onData: on,
        offData: off,
        setValuePromise: this.setSwitchState.bind(this)
      }
    });

    if (showSwingMode) {
      this.serviceManager.addToggleCharacteristic({
        name: 'swingMode',
        type: Characteristic.SwingMode,
        getMethod: this.getCharacteristicValue,
        setMethod: this.setCharacteristicValue,
        bind: this,
        props: {
          onData: swingOn || swingToggle,
          offData: swingOff || swingToggle,
          setValuePromise: this.setSwingMode.bind(this)
        }
      });
    }

    this.serviceManager.addToggleCharacteristic({
      name: 'fanSpeed',
      type: Characteristic.RotationSpeed,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        setValuePromise: this.setFanSpeed.bind(this)
      },
      characteristicProps: {
		    minStep: this.getFanSpeedStepSize(),
		    minValue: 0,
		    maxVlue: 100
      }
    });

    if (showRotationDirection) {
      this.serviceManager.addToggleCharacteristic({
        name: 'rotationDirection',
        type: Characteristic.RotationDirection,
        getMethod: this.getCharacteristicValue,
        setMethod: this.setCharacteristicValue,
        bind: this,
        props: {
          onData: counterClockwise,
          offData: clockwise
        }
      });
    }
  }
}

module.exports = FanAccessory;
