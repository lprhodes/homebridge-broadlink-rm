const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration')
const BroadlinkRMAccessory = require('./accessory');

class FanMultiAccessory extends BroadlinkRMAccessory {

  constructor (log, config = {}) {
    super(log, config)

    const { data } = this

	// NB:  data is actually a dictionary/object ¯\_(ツ)_/¯
	// keeping message for consistency
    if (!Array.isArray(data)) return log('The "fan-multi" type requires the config value for "data" to be an array of hex codes.')
  }

  async setSwitchState (hexData) {
    if (hexData) this.performSend(hexData);
  }
  
  // lifted from fan.js
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

    // Find speed closest to the one requested
    const closest = foundSpeeds.reduce((prev, curr) => Math.abs(curr - state.fanSpeed) < Math.abs(prev - state.fanSpeed) ? curr : prev);
    log(`${name} setFanSpeed: (closest: ${closest})`);

    // Get the closest speed's hex data
    hexData = data[`fanSpeed${closest}`];

	for (let index = 0; index < data.length; index++) {
      const hexData = data[index]

      sendData({ host, hexData, log, name });

      if (index < data.length - 1) await delayForDuration(interval);
    }
    
  }

  async performSend (data) {
    const { config, host, log, name, state } = this;
    let { disableAutomaticOff, interval } = config;

    // Itterate through each hex config in the array
    for (let index = 0; index < data.length; index++) {
      const hexData = data[index]

      sendData({ host, hexData, log, name });

      if (index < data.length - 1) await delayForDuration(interval);
    }

    if (state.switchState && !disableAutomaticOff) {
      await delayForDuration(0.1);

      this.switchService.setCharacteristic(Characteristic.On, 0);
    }
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
      onData: Array.isArray(data) ? data : data.on,
      offData: Array.isArray(data) ? undefined : data.off,
      setValuePromise: this.setSwitchState.bind(this)
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.RotationSpeed,
      propertyName: 'fanSpeed',
      setValuePromise: this.setFanSpeed.bind(this)
    });

    services.push(service);


	// Fanv2 service
    service = new Service.Fanv2(name);
    this.addNameService(service);

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.Active,
      propertyName: 'switchState',
      onData: Array.isArray(data) ? data : data.on,
      offData: Array.isArray(data) ? undefined : data.off,
      setValuePromise: this.setSwitchState.bind(this)
    });
    
    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.SwingMode,
      propertyName: 'swingMode',
      onData: swingToggle,
      offData: swingToggle
    });
	
    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.RotationSpeed,
      propertyName: 'fanSpeed',
      setValuePromise: this.setFanSpeed.bind(this)
    });

    services.push(service);

    this.switchService = service;

    return services;
  }
}

module.exports = FanMultiAccessory;
