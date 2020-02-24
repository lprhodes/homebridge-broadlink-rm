
const SwitchAccessory = require('./switch');

class OutletAccessory extends SwitchAccessory {

  serviceType () { return Service.Outlet }

  pingCallback (active) {
    const { config, state, serviceManager } = this;
    const newState = active ? true : false;

    // Only update Homkit if the switch state haven changed.
    if (previousState === newState) return

    if (config.pingIPAddressStateOnly) {
      state.outletInUse = newState;
      serviceManager.refreshCharacteristicUI(Characteristic.OutletInUse)

      return
    }
    
    serviceManager.setCharacteristic(Characteristic.OutletInUse, newState);
  }

  setOutletInUse (value, callback) {
    this.state.outletInUse = value
  
    callback(null, value)
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
        onData: on,
        offData: off,
        setValuePromise: this.setSwitchState.bind(this)
      }
    });

    serviceManager.addSetCharacteristic({
      name: 'outletInUse',
      type: Characteristic.OutletInUse,
      method: this.setOutletInUse.bind(this)
    });

    serviceManager.addGetCharacteristic({
      name: 'outletInUse',
      type: Characteristic.OutletInUse,
      method: this.getCharacteristicValue.bind(this, { propertyName: 'outletInUse' })
    });
  }
}

module.exports = OutletAccessory;
