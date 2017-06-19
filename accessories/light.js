const sendData = require('../helpers/sendData');
const BroadlinkRMAccessory = require('./accessory');

class LightAccessory extends BroadlinkRMAccessory {

  async setLightState (hexData, previousValue) {
    const { config, data, host, log, name, state } = this;
    let { defaultBrightness, useLastKnownBrightness } = config;

    if (!defaultBrightness) defaultBrightness = 100;

    if (state.lightState) {
      this.resetAutoOffTimeout();

      if (!previousValue) {
        if (useLastKnownBrightness && state.brightness > 0) {
          log(`${name} setLightState: (use last known brightness)`);

          setTimeout(() => {
            this.lightService.setCharacteristic(Characteristic.Brightness, state.brightness);
          }, 200); // Add delay to prevent race conditions within Homekit
        } else {
          log(`${name} setLightState: (use default brightness)`);

          setTimeout(() => {
            this.lightService.setCharacteristic(Characteristic.Brightness, defaultBrightness);
          }, 200); // Add delay to prevent race conditions within Homekit
        }
      }
    } else {
      this.stopAutoOffTimeout();

      sendData({ host, hexData, log, name });
    }
  }

  async setBrightness () {
    const { config } = this;
    let { initialDelay } = config;

    // Defaults
    if (!initialDelay) initialDelay = 0.6;

    this.stopAutoOffTimeout();
    if (this.initialDelayTimeout) clearTimeout(this.initialDelayTimeout);

    this.initialDelayTimeout = setTimeout(() => {
      this.setBrightnessAfterTimeout();
    }, initialDelay * 1000);
  }

  async setBrightnessAfterTimeout () {
    const { config, data, host, log, name, state } = this;
    const { off, on } = data;
    let { onDelay } = config;

    if (!onDelay) onDelay = 0.1;

    if (state.brightness > 0) {
      const allHexKeys = Object.keys(data);

      // Create an array of value specified in the data config
      const foundValues = [];

      allHexKeys.forEach((key) => {
        const parts = key.split('brightness');

        if (parts.length !== 2) return;

        foundValues.push(parts[1])
      })

      // Find brightness closest to the one requested
      const closest = foundValues.reduce((prev, curr) => Math.abs(curr - state.brightness) < Math.abs(prev - state.brightness) ? curr : prev);

      // Get the closest brightness's hex data
      const hexData = data[`brightness${closest}`];

      if (on) {
        log(`${name} setBrightness: (turn on, wait ${onDelay}s)`);
        sendData({ host, hexData: on, log, name });

        setTimeout(() => {
          if (!state.lightState) return;

          log(`${name} setBrightness: (closest: ${closest})`);
          sendData({ host, hexData, log, name });

          this.resetAutoOffTimeout();
        }, onDelay * 1000);
      } else {
        log(`setBrightness: (closest: ${closest})`);
        sendData({ host, hexData, log, name });

        this.resetAutoOffTimeout();
      }
    } else {
      log(`${name} setBrightness: (off)`);

      this.stopAutoOffTimeout();
      sendData({ host, hexData: off, log, name });
    }
  }

  stopAutoOffTimeout () {
    if (this.autoOffTimeout) clearTimeout(this.autoOffTimeout);
  }

  resetAutoOffTimeout () {
    const { config, data, host, log } = this;
    let { disableAutomaticOff, onDuration } = config;

    // Set defaults
    if (disableAutomaticOff === undefined) disableAutomaticOff = true;
    if (!onDuration) onDuration = 60;

    this.stopAutoOffTimeout();

    if (disableAutomaticOff) return;

    this.autoOffTimeout = setTimeout(() => {
      this.lightService.setCharacteristic(Characteristic.On, 0);
    }, onDuration * 1000)
  }

  getServices () {
    const services = super.getServices();
    const { data, name } = this;
    const { on, off, swingToggle } = data;

    const service = new Service.Lightbulb(name);
    this.addNameService(service);

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.Brightness,
      propertyName: 'brightness',
      setValuePromise: this.setBrightness.bind(this),
      ignorePreviousValue: true
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.On,
      propertyName: 'lightState',
      onData: on,
      offData: off,
      setValuePromise: this.setLightState.bind(this)
    });

    this.lightService = service;

    services.push(service);

    return services;
  }
}

module.exports = LightAccessory;
