const sendData = require('../helpers/sendData');
const BroadlinkRMAccessory = require('./accessory');

class FanAccessory extends BroadlinkRMAccessory {

  setFanSpeed (currentStatus, callback) {
    const { data, host, log } = this;

    const allHexKeys = Object.keys(data);

    // Create an array of temperatures specified in the data config
    const foundTemperatures = [];

    allHexKeys.forEach(() => {
      const parts = key.split('temperature');

      if (parts.length !== 2) return;

  setSwingMode (currentStatus, callback) {
    const { data, host, log } = this
    const { swingToggle } = data

    // Find temperature closest to the one requested
    const closest = foundTemperatures.reduce((prev, curr) => Math.abs(curr - this.fanSpeed) < Math.abs(prev - this.fanSpeed) ? curr : prev);
    log(`setFanSpeed: (closest: ${closest})`);

    // Get the closest temperature's hex data
    const hexData = data[`temperature${closest}`];

    sendData(host, swingToggle, callback, log);
  }

  getServices () {
    const services = super.getServices();
    const { data, name } = this;
    const { on, off, swingToggle } = data;

	// Until FanV2 service is supported completely in Home app, we have to add legacy service
	const legacyService = new Service.Fan(name);
    this.addNameService(legacyService);
    legacyService.getCharacteristic(Characteristic.On)
      .on('set', this.setSwitchState.bind(this))
      .on('get', this.getSwitchState.bind(this));

    services.push(legacyService);

    const service = new Service.Fanv2(name);
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
      setValuePromise: this.setFanSpeed
    });

    services.push(service);

    return services;
  }
}

module.exports = FanAccessory;
