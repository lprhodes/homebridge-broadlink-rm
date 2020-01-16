const delayForDuration = require('../helpers/delayForDuration');
const catchDelayCancelError = require('../helpers/catchDelayCancelError');
const ping = require('../helpers/ping')
const BroadlinkRMAccessory = require('./accessory');

class SwitchAccessory extends BroadlinkRMAccessory {

  serviceType () { return Service.Switch }

  constructor (log, config = {}) {   
    super(log, config);

    if (!config.isUnitTest) this.checkPing(ping)
  }

  setDefaults () {
    const { config } = this;
    config.pingFrequency = config.pingFrequency || 2;
    config.pingFrequency = Math.max(config.pingFrequency, 2);

    config.offDuration = config.offDuration || 60;
    config.onDuration = config.onDuration || 60;

    if (config.enableAutoOn === undefined && config.disableAutomaticOn === undefined) {
      config.enableAutoOn = false;
    } else if (config.disableAutomaticOn !== undefined) {
      config.enableAutoOn = !config.disableAutomaticOn;
    }

    if (config.enableAutoOff === undefined && config.disableAutomaticOff === undefined) {
      config.enableAutoOff = false;
    } else if (config.disableAutomaticOff !== undefined) {
      config.enableAutoOff = !config.disableAutomaticOff;
    }
  }

  reset () {
    super.reset();

    // Clear Timeouts
    if (this.delayTimeoutPromise) {
      this.delayTimeoutPromise.cancel();
      this.delayTimeoutPromise = null;
    }

    if (this.autoOffTimeoutPromise) {
      this.autoOffTimeoutPromise.cancel();
      this.autoOffTimeoutPromise = null;
    }

    if (this.autoOnTimeoutPromise) {
      this.autoOnTimeoutPromise.cancel();
      this.autoOnTimeoutPromise = null
    }
  }

  checkAutoOnOff () {
    this.reset();
    this.checkAutoOn();
    this.checkAutoOff();
  }
  
  checkPing (ping) {
    const { config } = this
    let { pingIPAddress, pingFrequency } = config;

    if (!pingIPAddress) return
    
    // Setup Ping-based State
    ping(pingIPAddress, pingFrequency, this.pingCallback.bind(this))
  }

  pingCallback (active) {
    let { debug, config, log, name, state, serviceManager } = this;
    debug = true

    const previousState = state.switchState
    const newState = active ? true : false;

    // Only update Homkit if the switch state haven changed.
    const hasStateChanged = (previousState === newState)
    if (debug) log(`${name} pingCallback: state ${hasStateChanged ? 'not changed, ignoring' : 'changed'} (device ${newState ? 'active' : 'inactive'})`);

    if (hasStateChanged) return

    if (config.pingIPAddressStateOnly) {
      if (debug) log(`${name} pingCallback: UI updated only`);

      state.switchState = newState

      serviceManager.refreshCharacteristicUI(Characteristic.On);

      return;
    }
    
    if (debug) log(`${name} pingCallback: UI updated and command sent`);

    serviceManager.setCharacteristic(Characteristic.On, newState);
  }

  async setSwitchState (hexData) {
    const { data, host, log, name, debug } = this;

    this.reset();

    if (hexData) await this.performSend(hexData);

    this.checkAutoOnOff();
  }

  async checkAutoOff () {
    await catchDelayCancelError(async () => {
      const { config, log, name, state, serviceManager } = this;
      let { disableAutomaticOff, enableAutoOff, onDuration } = config;

      if (state.switchState && enableAutoOff) {
        log(`${name} setSwitchState: (automatically turn off in ${onDuration} seconds)`);

        this.autoOffTimeoutPromise = delayForDuration(onDuration);
        await this.autoOffTimeoutPromise;

        serviceManager.setCharacteristic(Characteristic.On, false);
      }
    });
  }

  async checkAutoOn () {
    await catchDelayCancelError(async () => {
      const { config, log, name, state, serviceManager } = this;
      let { disableAutomaticOn, enableAutoOn, offDuration } = config;

      if (!state.switchState && enableAutoOn) {
        log(`${name} setSwitchState: (automatically turn on in ${offDuration} seconds)`);

        this.autoOnTimeoutPromise = delayForDuration(offDuration);
        await this.autoOnTimeoutPromise;

        serviceManager.setCharacteristic(Characteristic.On, true);
      }
    });
  }

  configureServiceManager (serviceManager) {
    const { data } = this;
    const { on, off } = data || { };
    
    serviceManager.addToggleCharacteristic({
      name: 'switchState',
      type: Characteristic.On,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        onData: on || data,
        offData: off || undefined,
        setValuePromise: this.setSwitchState.bind(this)
      }
    });
  }
}

module.exports = SwitchAccessory;