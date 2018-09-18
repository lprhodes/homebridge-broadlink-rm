const ServiceManagerTypes = require('../helpers/serviceManagerTypes');
const delayForDuration = require('../helpers/delayForDuration');
const catchDelayCancelError = require('../helpers/catchDelayCancelError');
const ping = require('../helpers/ping')
const BroadlinkRMAccessory = require('./accessory');

class SwitchAccessory extends BroadlinkRMAccessory {

  constructor (log, config = {}, serviceManagerType) {    
    super(log, config, serviceManagerType);

    this.lastCheckState = false;

    this.forceOffAfterSec = config.forceOffAfter;
    this.remainKeepOffSec = 0;

    if (!config.isUnitTest) this.checkPing(ping)
  }

  setDefaults () {
    const { config } = this;
    config.pingFrequency = config.pingFrequency || 1;

    config.forceOffAfter = config.forceOffAfter || undefined;
    config.keepOffDuration = config.keepOffDuration || undefined;
    config.onlyKeepOffWhenForcedTurnOff = config.onlyKeepOffWhenForcedTurnOff || false;

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

  updateStateTransition(active_state, checkFrequency) {
    const { config, log, name, serviceManager } = this;
    let { forceOffAfter, keepOffDuration, onlyKeepOffWhenForceOff } = config;

    log(`${name} Turn OFF after ${this.forceOffAfterSec}. Can ON after ${this.remainKeepOffSec}`);

    if (active_state) {
      if (!this.lastCheckState) {
        this.lastCheckState = active_state;
        log(`${name} State OFF --> ON`);

        if (this.remainKeepOffSec > 0) {
          log(`${name} ON while keepOffDuration remains. Turned OFF!`);
          serviceManager.setCharacteristic(Characteristic.On, false);
          serviceManager.refreshCharacteristicUI(Characteristic.On);
          // Need to update lastCheckState regardless current lastCheckState
          this.lastCheckState = false;
          this.remainKeepOffSec -= checkFrequency;
        }
        this.forceOffAfterSec = forceOffAfter;
      } else {
        log(`${name} State keeps ON`);

        if (typeof this.forceOffAfterSec !== 'undefined') {
          if (this.forceOffAfterSec > 0) {
            this.forceOffAfterSec -= checkFrequency;
          } else {
            log(`${name} forceOffAfter expired. Turned OFF!`);
            serviceManager.setCharacteristic(Characteristic.On, false);
            serviceManager.refreshCharacteristicUI(Characteristic.On);
            if (onlyKeepOffWhenForceOff === true) {
              this.remainKeepOffSec = keepOffDuration;
            }
          }
        }
      }
    } else {
      if (this.lastCheckState) {
        this.lastCheckState = active_state;
        log(`${name} State ON --> OFF`);
        if (this.remainKeepOffSec > 0) {
          this.remainKeepOffSec -= checkFrequency;
        } else {
          if (onlyKeepOffWhenForceOff !== true) {
            this.remainKeepOffSec = keepOffDuration;
          }
        }
        if (typeof this.forceOffAfterSec !== "undefined") {
          this.forceOffAfterSec = 0;
        }
      } else {
        log(`${name} State keeps OFF`);
        if (this.remainKeepOffSec > 0) {
          this.remainKeepOffSec -= checkFrequency;
        }
        if (typeof this.forceOffAfterSec !== "undefined") {
          this.forceOffAfterSec = 0;
        }
      }
    }
  }

  pingCallback (active) {
    const { config, state, serviceManager } = this;

    if (config.pingIPAddressStateOnly) {
      state.switchState = !!active;
      serviceManager.refreshCharacteristicUI(Characteristic.On);
    } else {
      const value = !!active;
      serviceManager.setCharacteristic(Characteristic.On, value);
    }

    this.updateStateTransition(active, config.pingFrequency);
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