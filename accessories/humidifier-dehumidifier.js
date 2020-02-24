const FanAccessory = require('./fan');

class HumidifierDehumidifierAccessory extends FanAccessory {
  
  serviceType () { return Service.HumidifierDehumidifier }

  setDefaults () {
    super.setDefaults();

    this.updateRelativeHumidity()
  }

  // User requested a the target state be set
  async setTargetState (hexData, previousValue) {
      const { log, name, state, serviceManager } = this;

      // Ignore if no change to the targetPosition
      if (state.targetState === previousValue) return;

      // Set the CurrentHumidifierDehumidifierState to match the switch state
      let currentState = Characteristic.CurrentHumidifierDehumidifierState.INACTIVE;

      if (state.targetState === Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER_OR_DEHUMIDIFIER) {
        currentState = Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING
      } else if (state.targetState === Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER) {
        currentState = Characteristic.CurrentHumidifierDehumidifierState.HUMIDIFYING
      } else if (state.targetState === Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER) {
        currentState = Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING
      }

      log(`${name} setTargetState: currently ${previousValue}, changing to ${state.targetState}`);

      state.currentState = currentState
      serviceManager.refreshCharacteristicUI(Characteristic.CurrentHumidifierDehumidifierState);

      this.updateRelativeHumidity()

      await this.performSend(hexData);
  }

  updateRelativeHumidity() {
    let { serviceManager, state } = this;

    state.currentRelativeHumidity = 35
    state.targetRelativeHumidity = 5

    if (state.targetState === Characteristic.TargetHumidifierDehumidifierState.HUMIDIFIER) {
      state.currentRelativeHumidity = 5
      state.targetRelativeHumidity = 15
    } 

    serviceManager.refreshCharacteristicUI(Characteristic.CurrentRelativeHumidity);
    serviceManager.refreshCharacteristicUI(Characteristic.TargetRelativeHumidity);
  }

  configureServiceManager (serviceManager) {
    const { config, data } = this;
    let {
      showLockPhysicalControls,
      showSwingMode,
      showRotationDirection,
      hideSwingMode,
      hideRotationDirection
    } = config;

    const {
      on,
      off,
      targetStateHumidifier,
      targetStateDehumidifier,
      lockControls,
      unlockControls,
      swingToggle
    } = data || {};

    // Defaults
    if (showLockPhysicalControls !== false) showLockPhysicalControls = true
    if (showSwingMode !== false && hideSwingMode !== true) showSwingMode = true
    if (showRotationDirection !== false && hideRotationDirection !== true) showRotationDirection = true

    serviceManager.addToggleCharacteristic({
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

    serviceManager.addToggleCharacteristic({
      name: 'currentRelativeHumidity',
      type: Characteristic.CurrentRelativeHumidity,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: { }
    });

    serviceManager.addToggleCharacteristic({
      name: 'targetRelativeHumidity',
      type: Characteristic.TargetRelativeHumidity,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: { }
    });

    
    serviceManager.addToggleCharacteristic({
      name: 'currentState',
      type: Characteristic.CurrentHumidifierDehumidifierState,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: { }
    });
    
    serviceManager.addToggleCharacteristic({
      name: 'targetState',
      type: Characteristic.TargetHumidifierDehumidifierState,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        onData: targetStateHumidifier,
        offData: targetStateDehumidifier,
        setValuePromise: this.setTargetState.bind(this)
      }
    });

    if (showLockPhysicalControls) {
      serviceManager.addToggleCharacteristic({
        name: 'lockPhysicalControls',
        type: Characteristic.LockPhysicalControls,
        getMethod: this.getCharacteristicValue,
        setMethod: this.setCharacteristicValue,
        bind: this,
        props: {
          onData: lockControls,
          offData: unlockControls
        }
      });
    }

    if (showSwingMode) {
      serviceManager.addToggleCharacteristic({
        name: 'swingMode',
        type: Characteristic.SwingMode,
        getMethod: this.getCharacteristicValue,
        setMethod: this.setCharacteristicValue,
        bind: this,
        props: {
          onData: swingToggle,
          offData: swingToggle,
        }
      });
    }

    serviceManager.addToggleCharacteristic({
      name: 'fanSpeed',
      type: Characteristic.RotationSpeed,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        setValuePromise: this.setFanSpeed.bind(this)
      }
    });
  }
}

module.exports = HumidifierDehumidifierAccessory;
