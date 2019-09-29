const ServiceManagerTypes = require('../helpers/serviceManagerTypes');

const SwitchAccessory = require('./switch');

class FanAccessory extends SwitchAccessory {

  async setSwitchState (hexData, previousValue) {
    if (!this.state.switchState) {
      this.lastFanSpeed = undefined;
    }

    super.setSwitchState(hexData, previousValue);
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

    await this.performSend(hexData);

    this.checkAutoOnOff();
  }

  setupServiceManager () {
    const { config, data, name, serviceManagerType } = this;
    let { showSwingMode, showRotationDirection, hideSwingMode, hideRotationDirection } = config;
    const { on, off, clockwise, counterClockwise, swingToggle } = data || {};

    // Defaults
    if (showSwingMode !== false && hideSwingMode !== true) showSwingMode = true
    if (showRotationDirection !== false && hideRotationDirection !== true) showRotationDirection = true

    this.serviceManager = new ServiceManagerTypes[serviceManagerType](name, Service.Fanv2, this.log);

    this.serviceManager.addToggleCharacteristic({
      name: 'switchState',
      type: Characteristic.On,
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
          onData: swingToggle,
          offData: swingToggle,
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
