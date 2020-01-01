const ServiceManagerTypes = require('../helpers/serviceManagerTypes');

const FanAccessory = require('./fan');

class AirPurifierAccessory extends FanAccessory {

  async setSwitchState (hexData, previousValue) {
    const { config, state, serviceManager } = this;

    // Set the CurrentAirPurifierState to match the switch state
    serviceManager.setCharacteristic(Characteristic.CurrentAirPurifierState, this.state.switchState ? 2 : 0);

    super.setSwitchState(hexData, previousValue);
  }

  setupServiceManager () {
    const { config, data, name, serviceManagerType } = this;
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
      targetStateManual,
      targetStateAuto,
      lockControls,
      unlockControls,
      swingToggle
    } = data || {};

    // Defaults
    if (showLockPhysicalControls !== false) showLockPhysicalControls = true
    if (showSwingMode !== false && hideSwingMode !== true) showSwingMode = true
    if (showRotationDirection !== false && hideRotationDirection !== true) showRotationDirection = true

    this.serviceManager = new ServiceManagerTypes[serviceManagerType](name, Service.AirPurifier, this.log);

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
      name: 'targetState',
      type: Characteristic.TargetAirPurifierState,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        onData: targetStateManual,
        offData: targetStateAuto,
        setValuePromise: this.setSwitchState.bind(this)
      }
    });

    if (showLockPhysicalControls) {
      this.serviceManager.addToggleCharacteristic({
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
      this.serviceManager.addToggleCharacteristic({
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

    this.serviceManager.addToggleCharacteristic({
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

module.exports = AirPurifierAccessory;
