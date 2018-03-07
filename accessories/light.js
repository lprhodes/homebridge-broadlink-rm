const { ServiceManagerTypes } = require('../helpers/serviceManager');
const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const catchDelayCancelError = require('../helpers/catchDelayCancelError')

const SwitchAccessory = require('./switch');

class LightAccessory extends SwitchAccessory {

  reset () {
    super.reset();

    if (this.onDelayTimeoutPromise) {
      this.onDelayTimeoutPromise.cancel();
      this.onDelayTimeoutPromise = undefined
    }
  }

  async setSwitchState (hexData, previousValue) {
    const { config, data, host, log, name, state, debug, serviceManager } = this;
    let { defaultBrightness, useLastKnownBrightness } = config;

    this.reset();

    // Defaults
    if (!defaultBrightness) defaultBrightness = 100;

    if (state.switchState === 1) {
      const brightness = (useLastKnownBrightness && state.brightness > 0) ? state.brightness : defaultBrightness;
      if (brightness !== state.brightness || previousValue !== state.switchState) {
        log(`${name} setSwitchState: (brightness: ${brightness})`);

        state.switchState = 0;
        serviceManager.setCharacteristic(Characteristic.Brightness, brightness);
      } else {
        if (hexData) sendData({ host, hexData, log, name, debug });

        this.checkAutoOnOff();
      }
    } else {
      if (hexData) sendData({ host, hexData, log, name, debug });

      this.checkAutoOnOff();
    }
  }

  async setSaturation () {
    
  }

  async setHue () {
    const { config, data, host, log, name, state, debug, serviceManager} = this;
    const { onDelay } = config;
    const { off, on } = data;

    this.reset();

    if (on) {
      if (state.switchState !== 1) {
        log(`${name} setHue: (turn on, wait ${onDelay}s)`);
        sendData({ host, hexData: on, log, name, debug });

        state.switchState = 1
        serviceManager.refreshCharacteristicUI(Characteristic.On);
      }

      log(`${name} setHue: (wait ${onDelay}s then send data)`);
      this.onDelayTimeoutPromise = delayForDuration(onDelay);
      await this.onDelayTimeoutPromise;
    }

    // Find hue closest to the one requested
    const foundValues = this.dataKeys('hue');
    const closest = foundValues.reduce((prev, curr) => Math.abs(curr - state.hue) < Math.abs(prev - state.hue) ? curr : prev);
    const hexData = data[`hue${closest}`];

    log(`${name} setHue: (closest: hue${closest})`);
    sendData({ host, hexData, log, name, debug });
  }

  async setBrightness () {
      const { config, data, host, log, name, state, debug, serviceManager } = this;
      const { off, on } = data;
      let { onDelay } = config;

      this.reset();

      // Defaults
      if (!onDelay) onDelay = 0.1;

      if (state.brightness > 0) {
        if (on) {
          
          if (state.switchState !== 1) {
            log(`${name} setBrightness: (turn on, wait ${onDelay}s)`);
            sendData({ host, hexData: on, log, name, debug });

            state.switchState = 1
            this.serviceManager.refreshCharacteristicUI(Characteristic.On);
          }

          log(`${name} setBrightness: (wait ${onDelay}s then send data)`);
          this.onDelayTimeoutPromise = delayForDuration(onDelay);
          await this.onDelayTimeoutPromise;
        }

        // Find brightness closest to the one requested
        const foundValues = this.dataKeys('brightness')
        const closest = foundValues.reduce((prev, curr) => Math.abs(curr - state.brightness) < Math.abs(prev - state.brightness) ? curr : prev);
        const hexData = data[`brightness${closest}`];
    
        log(`${name} setBrightness: (closest: ${closest})`);
        sendData({ host, hexData, log, name, debug });
      } else {
        log(`${name} setBrightness: (off)`);
        sendData({ host, hexData: off, log, name, debug });
      }

      await this.checkAutoOnOff();
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
