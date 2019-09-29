const delayForDuration = require('../helpers/delayForDuration');
const BroadlinkRMAccessory = require('./accessory');
const ServiceManagerTypes = require('../helpers/serviceManagerTypes');
const catchDelayCancelError = require('../helpers/catchDelayCancelError');

class GarageDoorOpenerAccessory extends BroadlinkRMAccessory {

  correctReloadedState (state) {
    state.doorTargetState = state.doorCurrentState;
    state.lockTargetState = state.lockCurrentState;
  }

  reset () {
    super.reset();

    // Clear existing timeouts
    if (this.closingTimeoutPromise) {
      this.closingTimeoutPromise.cancel();
      this.closingTimeoutPromise = null;
    }

    if (this.openingTimeoutPromise) {
      this.openingTimeoutPromise.cancel();
      this.openingTimeoutPromise = null;
    }

    if (this.autoCloseTimeoutPromise) {
      this.autoCloseTimeoutPromise.cancel();
      this.autoCloseTimeoutPromise = null
    }
  }

  async setDoorTargetState (hexData, previousValue) {
    const { host, log, name, debug, state, serviceManager } = this;

    this.reset();

    // If you open the garage door and then close it before it's fully open the accessory shall now
    // update to "Closing" instead of immediately showing as "Closed".
    
    // TODO: We could determine how much time has passed while opening and show closing for that amount of time. 
    if (previousValue !== state.doorTargetState && state.doorCurrentState === state.doorTargetState) {
      serviceManager.setCharacteristic(Characteristic.CurrentDoorState, !state.doorTargetState);
    }
    
    // Send pre-determined hex data
    await this.performSend(hexData);

    catchDelayCancelError(async () => {
      if (state.doorTargetState === Characteristic.TargetDoorState.OPEN) {
        await this.open();
      } else {
        await this.close();
      }
    })
  }

  async open (hexData) {
    const { config, data, host, log, name, state, debug, serviceManager } = this;
    let { autoCloseDelay, openDuration, openCloseDuration } = config;

    // Defaults
    if (!openDuration) openDuration = openCloseDuration || 8;

    log(`${name} setDoorCurrentState: opening`);
    this.openingTimeoutPromise = delayForDuration(openDuration);
    await this.openingTimeoutPromise;

    log(`${name} setDoorCurrentState: opened`);
    serviceManager.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);

    if (!autoCloseDelay) return;

    log(`${name} automatically closing in ${autoCloseDelay}s`);
    this.autoCloseTimeoutPromise = delayForDuration(autoCloseDelay);
    await this.autoCloseTimeoutPromise;

    serviceManager.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
    this.close()
  }

  async close () {
    const { config, data, host, log, name, state, debug, serviceManager } = this;
    let { closeDuration, openCloseDuration } = config;

    // Defaults
    if (!closeDuration) closeDuration = openCloseDuration || 8;

    log(`${name} setDoorCurrentState: closing`);

    this.closingTimeoutPromise = delayForDuration(closeDuration);
    await this.closingTimeoutPromise

    log(`${name} setDoorCurrentState: closed`);
    serviceManager.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
  }

  async setLockTargetState (hexData) {
    const { config, log, name, state, serviceManager } = this;

    await this.performSend(hexData);

    if (!state.lockTargetState) {
      log(`${name} setCurrentLockState: unlocked`)
      serviceManager.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED);
    } else {
      log(`${name} setCurrentLockState: locked`)
      serviceManager.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.SECURED);
    }
  }
  
  // Service Manager Setup

  setupServiceManager () {
    const { data, name, serviceManagerType } = this;
    const { close, open, lock, unlock } = data || {};

    this.serviceManager = new ServiceManagerTypes[serviceManagerType](name, Service.GarageDoorOpener, this.log);

    this.serviceManager.addToggleCharacteristic({
      name: 'doorCurrentState',
      type: Characteristic.CurrentDoorState,
      bind: this,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      props: {

      }
    });

    this.serviceManager.addToggleCharacteristic({
      name: 'doorTargetState',
      type: Characteristic.TargetDoorState,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        onData: close,
        offData: open,
        setValuePromise: this.setDoorTargetState.bind(this)
      }
    });

    this.serviceManager.addToggleCharacteristic({
      name: 'lockCurrentState',
      type: Characteristic.LockCurrentState,
      bind: this,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      props: {

      }
    });

    this.serviceManager.addToggleCharacteristic({
      name: 'lockTargetState',
      type: Characteristic.LockTargetState,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        onData: lock,
        offData: unlock,
        setValuePromise: this.setLockTargetState.bind(this)
      }
    });
  }
}

module.exports = GarageDoorOpenerAccessory;
