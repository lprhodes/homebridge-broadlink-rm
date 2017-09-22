const sendData = require('../helpers/sendData');
const BroadlinkRMAccessory = require('./accessory');

class FanAccessory extends BroadlinkRMAccessory {

  performSetValueAction ({ host, data, log, name }) {
    if (Array.isArray(data)) {
      performSend(data);
    } else {
      sendData({ host, hexData: data, log, name });
    }
  }

  async performSend (data) {
    const { config, host, log, name, state } = this;
    let { interval } = config;

    // Itterate through each hex config in the array
    for (let index = 0; index < data.length; index++) {
      const hexData = data[index]

      sendData({ host, hexData, log, name });

      if (index < data.length - 1) await delayForDuration(interval);
    }
  }

  async setFanSpeed (hexData) {
    const { data, host, log, state , name} = this;

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

    sendData({ host, hexData, log, name });
  }

  getServices () {
    const services = super.getServices();
    const { config, data, name } = this;
    const { hideSwingMode, hideV1Fan, hideV2Fan } = config;
    const { on, off, swingToggle } = data;

    let service

    if (!hideV1Fan) {
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

      services.push(service);
    }

    if (!hideV2Fan) {
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

      if (!hideSwingMode) {
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

      services.push(service);
    }

    return services;
  }
}

module.exports = FanAccessory;
