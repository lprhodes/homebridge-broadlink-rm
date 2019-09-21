const ServiceManagerTypes = require('../helpers/serviceManagerTypes');
const delayForDuration = require('../helpers/delayForDuration');
const catchDelayCancelError = require('../helpers/catchDelayCancelError');
const ping = require('../helpers/ping')
const BroadlinkRMAccessory = require('./accessory');

class SwitchAccessory extends BroadlinkRMAccessory {

  constructor (log, config = {}, serviceManagerType) {    
    super(log, config, serviceManagerType);

    if (!config.isUnitTest) this.checkPing(ping)
    
  }

  setDefaults () {
    const { config } = this;
    config.pingFrequency = config.pingFrequency || 1;
    config.pingGrace = config.pingGrace || 10;

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

    this.stateChangeInProgress = true;
    
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
    
    if (this.pingGraceTimeout) {
      this.pingGraceTimeout.cancel();
      this.pingGraceTimeout = null;
    }
  }

  checkAutoOnOff () {
    this.reset();
    this.checkPingGrace();
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
    const { config, state, serviceManager } = this;

    if (this.stateChangeInProgress){ 
      return; 
    }
    
    if (config.pingIPAddressStateOnly) {
      state.switchState = active ? true : false;
      serviceManager.refreshCharacteristicUI(Characteristic.On);

      return;
    }
    
    const value = active ? true : false;
    serviceManager.setCharacteristic(Characteristic.On, value);
  }

  async setSwitchState (hexData) {
    const { data, host, log, name, debug } = this;
    this.stateChangeInProgress = true;
    this.reset();

    if (hexData) await this.performSend(hexData);
    
    this.checkAutoOnOff();
  }

  async checkPingGrace () {
    await catchDelayCancelError(async () => {
      const { config, log, name, state, serviceManager } = this;
      
      let { pingGrace } = config;

      if (pingGrace) {

        this.pingGraceTimeoutPromise = delayForDuration(pingGrace);
        await this.pingGraceTimeoutPromise;

        this.stateChangeInProgress = false;
      }
    });
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

  setupServiceManager () {
    const { data, name, config, serviceManagerType } = this;
    const { on, off } = data || { };
    
    this.serviceManager = new ServiceManagerTypes[serviceManagerType](name, Service.Switch, this.log);

    this.serviceManager.addToggleCharacteristic({
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
