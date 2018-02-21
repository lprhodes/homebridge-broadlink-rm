const sendData = require('../helpers/sendData');
const BroadlinkRMAccessory = require('./accessory');

class FanAccessory extends BroadlinkRMAccessory {

  async setFanSpeed (hexData) {
    const { data, host, log, state, name, debug} = this;

    const allHexKeys = Object.keys(data);

    // Create an array of speeds specified in the data config
    const foundSpeeds = [];

    allHexKeys.forEach((key) => {
      const parts = key.split('fanSpeed');

      if (parts.length !== 2) return;

      foundSpeeds.push(parts[1])
    })

    if (foundSpeeds.length === 0) return log(`${name} setFanSpeed: No fan speed hex codes provided.`)

    // Find speed closest to the one requested
    const closest = foundSpeeds.reduce((prev, curr) => Math.abs(curr - state.fanSpeed) < Math.abs(prev - state.fanSpeed) ? curr : prev);
    log(`${name} setFanSpeed: (closest: ${closest})`);

    // Get the closest speed's hex data
    hexData = data[`fanSpeed${closest}`];

    sendData({ host, hexData, log, name, debug });
  }

  async setRotationDirection (hexData) {
    const { config, data, host, log, name, state, debug } = this;

    if (hexData) sendData({ host, hexData, log, name, debug });
  }

  getServices () {
    const services = super.getServices();
    const { config, data, name } = this;
    let { showSwingMode, showRotationDirection, showV1Fan, showV2Fan } = config;
    const { on, off, clockwise, counterClockwise, swingToggle } = data;

    if (showV2Fan !== false) showV2Fan = true
    if (showSwingMode !== false) showSwingMode = true
    if (showRotationDirection !== false) showRotationDirection = true

    let service

    if (showV1Fan) {
  	  // Until FanV2 service is supported completely in Home app, we have to add legacy
      service = new Service.Fan(name);

      this.addNameService(service);
      this.createToggleCharacteristic({
        service,
        characteristicType: Characteristic.On,
        propertyName: 'switchState',
        onData: on,
        offData: off
      });

      this.createToggleCharacteristic({
        service,
        characteristicType: Characteristic.RotationSpeed,
        propertyName: 'fanSpeed',
        setValuePromise: this.setFanSpeed.bind(this)
      });

      if (showRotationDirection) {
        this.createToggleCharacteristic({
          service,
          characteristicType: Characteristic.RotationDirection,
          propertyName: 'rotationDirection',
          setValuePromise: this.setRotationDirection.bind(this),
          onData: clockwise,
          offData: counterClockwise
        });
      }

      services.push(service);
    }

    if (showV2Fan) {
      // Fanv2 service
      service = new Service.Fanv2(name);
      this.addNameService(service);

      this.createToggleCharacteristic({
        service,
        characteristicType: Characteristic.Active,
        propertyName: 'switchState',
        onData: on,
        offData: off
      });

      if (showSwingMode) {
        this.createToggleCharacteristic({
          service,
          characteristicType: Characteristic.SwingMode,
          propertyName: 'swingMode',
          onData: swingToggle,
          offData: swingToggle
        });
      }

      this.createToggleCharacteristic({
        service,
        characteristicType: Characteristic.RotationSpeed,
        propertyName: 'fanSpeed',
        setValuePromise: this.setFanSpeed.bind(this)
      });

      if (showRotationDirection) {
        this.createToggleCharacteristic({
          service,
          characteristicType: Characteristic.RotationDirection,
          propertyName: 'rotationDirection',
          setValuePromise: this.setRotationDirection.bind(this),
          onData: clockwise,
          offData: counterClockwise
        });
      }

      services.push(service);
    }

    return services;
  }
}

module.exports = FanAccessory;
