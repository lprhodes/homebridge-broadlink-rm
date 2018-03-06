const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const BroadlinkRMAccessory = require('./accessory');
const { ServiceManagerTypes } = require('../helpers/serviceManager');
const catchDelayCancelError = require('../helpers/catchDelayCancelError')

class GarageDoorOpenerAccessory extends BroadlinkRMAccessory {

  correctReloadedState (state) {
    state.doorTargetState = state.doorCurrentState;
    state.lockTargetState = state.lockCurrentState;
  }

  reset () {
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

  async setDoorTargetState (hexData) {
    const { host, log, name, debug, state } = this;

    this.reset()
    
    // Send pre-determined hex data
    sendData({ host, hexData, log, name, debug });

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
    const { config, data, host, log, name, state, debug, serviceManager } = this;

    sendData({ host, hexData, log, name, debug });

    if (!state.lockTargetState) {
      log(`${name} setCurrentLockState: unlocked`)
      serviceManager.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED);
    } else {
      log(`${name} setCurrentLockState: locked`)
      serviceManager.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.SECURED);
    }
  }

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
