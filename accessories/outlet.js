const ping = require('ping');
const { ServiceManagerTypes } = require('../helpers/serviceManager');

const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration')
const SwitchAccessory = require('./switch');

class OutletAccessory extends SwitchAccessory {

  pingCallback (active) {
    const { config, state, serviceManager } = this;

    if (config.pingIPAddressStateOnly) {
      state.outletInUse = active ? 1 : 0;
      serviceManager.refreshCharacteristicUI(Characteristic.OutletInUse)

      return
    }
    
    const value = active ? 1 : 0
    serviceManager.setCharacteristic(Characteristic.OutletInUse, value);
  }

  setOutletInUse (value, callback) {
    this.state.outletInUse = value
  
    callback(null, value)
  }

  async setSwitchState (hexData) {
    const { data, host, log, name, state, debug } = this;

    if (hexData) sendData({ host, hexData, log, name, debug });

    this.checkAutoOnOff();
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
