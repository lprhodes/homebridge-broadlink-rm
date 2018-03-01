const { ServiceManagerTypes } = require('../helpers/serviceManager');
const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration')
const ping = require('../helpers/ping')
const BroadlinkRMAccessory = require('./accessory');

class SwitchAccessory extends BroadlinkRMAccessory {

  constructor (log, config = {}, serviceManagerType) {    
    super(log, config, serviceManagerType);

    if (!config.isUnitTest) this.checkPing(ping)
  }
  
  checkPing (ping) {
    const { config } = this
    let { pingIPAddress, pingFrequency } = config;

    if (!pingIPAddress) return
    
    // Defaults
    if (!pingFrequency) pingFrequency = 1;
    
    // Setup Ping-based State
    ping(pingIPAddress, pingFrequency, this.pingCallback.bind(this))
  }

  pingCallback (active) {
    const { config, state, serviceManager } = this;

    if (config.pingIPAddressStateOnly) {
      state.switchState = active ? 1 : 0;
      serviceManager.refreshCharacteristicUI(Characteristic.On);

      return;
    }
    
    const value = active ? 1 : 0
    serviceManager.setCharacteristic(Characteristic.On, value);
  }

  async setSwitchState (hexData) {
    const { data, host, log, name, debug } = this;

    if (hexData) sendData({ host, hexData, log, name, debug });

    this.checkAutoOff();
    this.checkAutoOn();
  }

  checkAutoOff () {
    const { config, log, name, state, serviceManager } = this;
    let { disableAutomaticOff, enableAutoOff, onDuration } = config;

    // Set defaults
    if (enableAutoOff === undefined && disableAutomaticOff === undefined) {
      enableAutoOff = false;
    } else if (disableAutomaticOff !== undefined) {
      enableAutoOff = !disableAutomaticOff
    }
    if (!onDuration) onDuration = 60;

    if (this.autoOffTimeout) clearTimeout(this.autoOffTimeout);

    if (state.switchState && enableAutoOff) {
      log(`${name} setSwitchState: (automatically turn off in ${onDuration} seconds)`);

      this.autoOffTimeout = setTimeout(() => {
        serviceManager.setCharacteristic(Characteristic.On, 0);
      }, onDuration * 1000);
    }
  }

  checkAutoOn () {
    const { config, log, name, state, serviceManager } = this;
    let { disableAutomaticOn, enableAutoOn, offDuration } = config;

    // Set defaults
    if (enableAutoOn === undefined && disableAutomaticOn === undefined) {
      enableAutoOn = false;
    } else if (disableAutomaticOn !== undefined) {
      enableAutoOn = !disableAutomaticOn;
    }

    if (!offDuration) offDuration = 60;

    if (this.autoOnTimeout) clearTimeout(this.autoOnTimeout);

    if (!state.switchState && enableAutoOn) {
      log(`${name} setSwitchState: (automatically turn on in ${offDuration} seconds)`);

      this.autoOnTimeout = setTimeout(() => {
        serviceManager.setCharacteristic(Characteristic.On, 1);
      }, offDuration * 1000);
    }
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
        onData: on,
        offData: off,
        setValuePromise: this.setSwitchState.bind(this)
      }
    })
  }
}

module.exports = SwitchAccessory;