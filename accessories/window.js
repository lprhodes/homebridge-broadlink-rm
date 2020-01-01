const { assert } = require('chai');

const delayForDuration = require('../helpers/delayForDuration');
const ServiceManagerTypes = require('../helpers/serviceManagerTypes');
const catchDelayCancelError = require('../helpers/catchDelayCancelError');
const WindowCoveringAccessory = require('./windowCovering');

class WindowAccessory extends WindowCoveringAccessory {

  setupServiceManager () {
    const { data, log, name, serviceManagerType } = this;

    this.serviceManager = new ServiceManagerTypes[serviceManagerType](name, Service.Window, log);

    this.serviceManager.addToggleCharacteristic({
      name: 'currentPosition',
      type: Characteristic.CurrentPosition,
      bind: this,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      props: {

      }
    });

    this.serviceManager.addToggleCharacteristic({
      name: 'positionState',
      type: Characteristic.PositionState,
      bind: this,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      props: {

      }
    });

    this.serviceManager.addToggleCharacteristic({
      name: 'targetPosition',
      type: Characteristic.TargetPosition,
      bind: this,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      props: {
        setValuePromise: this.setTargetPosition.bind(this)
      }
    });
  }
}

module.exports = WindowCoveringAccessory;
