const { assert } = require('chai');
const ServiceManagerTypes = require('../helpers/serviceManagerTypes');;
const delayForDuration = require('../helpers/delayForDuration');
const catchDelayCancelError = require('../helpers/catchDelayCancelError')

const SwitchAccessory = require('./switch');

class LightAccessory extends SwitchAccessory {

  setDefaults () {
    super.setDefaults();
  
    const { config } = this;

    config.onDelay = config.onDelay || 0.1;
    config.defaultBrightness = config.defaultBrightness || 100;
  }

  reset () {
    super.reset();

    // Clear existing timeouts
    if (this.onDelayTimeoutPromise) {
      this.onDelayTimeoutPromise.cancel();
      this.onDelayTimeoutPromise = undefined
    }
  }

  async setSwitchState (hexData, previousValue) {
    const { config, data, host, log, name, state, debug, serviceManager } = this;
    let { defaultBrightness, useLastKnownBrightness } = config;

    this.reset();

    if (state.switchState) {
      const brightness = (useLastKnownBrightness && state.brightness > 0) ? state.brightness : defaultBrightness;
      if (brightness !== state.brightness || previousValue !== state.switchState) {
        log(`${name} setSwitchState: (brightness: ${brightness})`);

        state.switchState = false;
        serviceManager.setCharacteristic(Characteristic.Brightness, brightness);
      } else {
        if (hexData) await this.performSend(hexData);

        this.checkAutoOnOff();
      }
    } else {
      this.lastBrightness = undefined;

      if (hexData) await this.performSend(hexData);

      this.checkAutoOnOff();
    }
  }

  async setSaturation () {
    
  }

  async setHue () {
    await catchDelayCancelError(async () => {
      const { config, data, host, log, name, state, debug, serviceManager} = this;
      const { onDelay } = config;
      const { off, on } = data;

      this.reset();

      if (!state.switchState) {

        state.switchState = true;
        serviceManager.refreshCharacteristicUI(Characteristic.On);

        if (on) {
          log(`${name} setHue: (turn on, wait ${onDelay}s)`);
          await this.performSend(on);

          log(`${name} setHue: (wait ${onDelay}s then send data)`);
          this.onDelayTimeoutPromise = delayForDuration(onDelay);
          await this.onDelayTimeoutPromise;
        }
      }

      // Find hue closest to the one requested
      const foundValues = this.dataKeys('hue');
      const closest = foundValues.reduce((prev, curr) => Math.abs(curr - state.hue) < Math.abs(prev - state.hue) ? curr : prev);
      const hexData = data[`hue${closest}`];

      log(`${name} setHue: (closest: hue${closest})`);
      await this.performSend(hexData);
    });
  }

  async setBrightness () {
    await catchDelayCancelError(async () => {
      const { config, data, host, log, name, state, debug, serviceManager } = this;
      const { off, on } = data;
      let { onDelay } = config;

      if (this.lastBrightness === state.brightness) {

        if (state.brightness > 0) {
          state.switchState = true;
        }

        await this.checkAutoOnOff();

        return;
      }

      this.lastBrightness = state.brightness;

      this.reset();

      if (state.brightness > 0) {
        if (!state.switchState) {
          state.switchState = true;
          serviceManager.refreshCharacteristicUI(Characteristic.On);
    
          if (on) {
            log(`${name} setBrightness: (turn on, wait ${onDelay}s)`);
            await this.performSend(on);
    
            log(`${name} setHue: (wait ${onDelay}s then send data)`);
            this.onDelayTimeoutPromise = delayForDuration(onDelay);
            await this.onDelayTimeoutPromise;
          }
        }

        // Find brightness closest to the one requested
        const foundValues = this.dataKeys('brightness')

        assert(foundValues.length > 0, `\x1b[31m[CONFIG ERROR] \x1b[33mbrightness\x1b[0m keys need to ne set. See the config-sample.json file for an example.`);

        const closest = foundValues.reduce((prev, curr) => Math.abs(curr - state.brightness) < Math.abs(prev - state.brightness) ? curr : prev);
        const hexData = data[`brightness${closest}`];
    
        log(`${name} setBrightness: (closest: ${closest})`);
        await this.performSend(hexData);
      } else {
        log(`${name} setBrightness: (off)`);
        await this.performSend(off);
      }

      await this.checkAutoOnOff();
    });
  }

  dataKeys (filter) {
    const { data } = this;
    const allHexKeys = Object.keys(data || {});

    if (!filter) return allHexKeys;

    // Create an array of value specified in the data config
    const foundValues = [];

    allHexKeys.forEach((key) => {
      const parts = key.split(filter);

      if (parts.length !== 2) return;

      foundValues.push(parts[1]);
    })

    return foundValues
  }

  setupServiceManager () {
    const { data, name, config, serviceManagerType } = this;
    const { on, off } = data || { };
    
    this.serviceManager = new ServiceManagerTypes[serviceManagerType](name, Service.Lightbulb, this.log);

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

    this.serviceManager.addToggleCharacteristic({
      name: 'brightness',
      type: Characteristic.Brightness,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        setValuePromise: this.setBrightness.bind(this),
        ignorePreviousValue: true // TODO: Check what this does and test it
      }
    });

    if (this.dataKeys('hue').length > 0) {
      this.serviceManager.addToggleCharacteristic({
        name: 'hue',
        type: Characteristic.Hue,
        getMethod: this.getCharacteristicValue,
        setMethod: this.setCharacteristicValue,
        bind: this,
        props: {
          setValuePromise: this.setHue.bind(this),
          ignorePreviousValue: true // TODO: Check what this does and test it
        }
      });

      this.serviceManager.addToggleCharacteristic({
        name: 'saturation',
        type: Characteristic.Saturation,
        getMethod: this.getCharacteristicValue,
        setMethod: this.setCharacteristicValue,
        bind: this,
        props: {
          setValuePromise: this.setSaturation.bind(this),
          ignorePreviousValue: true // TODO: Check what this does and test it
        }
      });
    }
  }
}

module.exports = LightAccessory;
