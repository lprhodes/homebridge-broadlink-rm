const ping = require('ping');
const ServiceManagerTypes = require('../helpers/serviceManagerTypes');

const delayForDuration = require('../helpers/delayForDuration')
const SwitchAccessory = require('./switch');

class OutletAccessory extends SwitchAccessory {

  pingCallback (active) {
    const { config, state, serviceManager } = this;

    if (config.pingIPAddressStateOnly) {
      state.outletInUse = active ? true : false;
      serviceManager.refreshCharacteristicUI(Characteristic.OutletInUse)

      return
    }
    
    const value = active ? true : false;
    serviceManager.setCharacteristic(Characteristic.OutletInUse, value);
  }

  setOutletInUse (value, callback) {
    this.state.outletInUse = value
  
    callback(null, value)
  }

  setupServiceManager () {
    const { data, name, config, serviceManagerType } = this;
    const { on, off } = data || { };
    
    this.serviceManager = new ServiceManagerTypes[serviceManagerType](name, Service.Outlet, this.log);

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

    this.serviceManager.addSetCharacteristic({
      name: 'outletInUse',
      type: Characteristic.OutletInUse,
      method: this.setOutletInUse.bind(this)
    });

    this.serviceManager.addGetCharacteristic({
      name: 'outletInUse',
      type: Characteristic.OutletInUse,
      method: this.getCharacteristicValue.bind(this, { propertyName: 'outletInUse' })
    });
  }
}

module.exports = OutletAccessory;
