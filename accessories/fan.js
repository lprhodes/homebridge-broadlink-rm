const sendData = require('../helpers/sendData');
const BroadlinkRMAccessory = require('./accessory');

class FanAccessory extends BroadlinkRMAccessory {

  async setFanSpeed (hexData) {
    const { data, host, log, state } = this;

    const allHexKeys = Object.keys(data);

    // Create an array of speeds specified in the data config
    const foundSpeeds = [];

    allHexKeys.forEach((key) => {
      const parts = key.split('fanSpeed');

      if (parts.length !== 2) return;

      foundSpeeds.push(parts[1])
    })

    // Find speed closest to the one requested
    const closest = foundSpeeds.reduce((prev, curr) => Math.abs(curr - state.fanSpeed) < Math.abs(prev - state.fanSpeed) ? curr : prev);
    log(`setFanSpeed: (closest: ${closest})`);

    // Get the closest speed's hex data
    hexData = data[`fanSpeed${closest}`];

    sendData({ host, hexData, log });
  }

  getServices () {
    const services = super.getServices();
    const { data, name } = this;
    const { on, off, swingToggle } = data;

	  // Until FanV2 service is supported completely in Home app, we have to add legacy
    let service = new Service.Fan(name);

    this.addNameService(service);
    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.On,
      propertyName: 'switchState',
      onHex: on,
      offHex: off
    });

    services.push(service);

    // Fanv2 service
    service = new Service.Fanv2(name);
    this.addNameService(service);

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.Active,
      propertyName: 'switchState',
      onHex: on,
      offHex: off
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.SwingMode,
      propertyName: 'swingMode',
      onHex: swingToggle,
      offHex: swingToggle
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.RotationSpeed,
      propertyName: 'fanSpeed',
      setValuePromise: this.setFanSpeed.bind(this)
    });

    services.push(service);

    return services;
  }
}

module.exports = FanAccessory;
