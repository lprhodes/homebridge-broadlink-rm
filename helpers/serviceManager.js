const assert = require('assert')

class ServiceManager {

  constructor (name, serviceType, log) {
    assert(name, 'ServiceManager requireds a "name" to be provided.')
    assert(serviceType, 'ServiceManager requires the "type" to be provided.')
    assert(log, 'ServiceManager requires "log" to be provided.')
    
    this.log = log
    
    this.service = new serviceType(name);
    this.characteristics = {}

    this.addNameCharacteristic()
  }

  setCharacteristic (characteristic, value) {    
    this.service.setCharacteristic(characteristic, value);
  }

  getCharacteristic (characteristic) {
    return this.service.getCharacteristic(characteristic)
  }

  refreshCharacteristicUI (characteristic) {
    this.getCharacteristic(characteristic).getValue();
  }

  // Convenience

  addCharacteristic ({ name, type, getSet, method, bind, props }) {
    this.characteristics[name] = type


    if (props) {
      props.propertyName = name

      assert('A value for `bind` is required if you are setting `props`')
      this.getCharacteristic(type).on(getSet, method.bind(bind, props));
    } else {
      const boundMethod = bind ? method.bind(bind) : method
      this.getCharacteristic(type).on(getSet, boundMethod);
    }
  }

  addGetCharacteristic ({ name, type, method, bind, props }) {
    this.addCharacteristic({ name, type, getSet: 'get', method, bind, props })
  }

  addSetCharacteristic ({ name, type, method, bind, props }) {
    this.addCharacteristic({ name, type, getSet: 'set', method, bind, props })
  }

  addToggleCharacteristic ({ name, type, getMethod, setMethod, bind, props }) {
    this.addGetCharacteristic({ name, type, method: getMethod, bind, props }) 
    this.addSetCharacteristic({ name, type, method: setMethod, bind, props }) 
  }

  getCharacteristicTypeForName (name) {
    return this.characteristics[name]
  }

  // Name Characteristic

  addNameCharacteristic () {
    this.addCharacteristic({ name: 'name', type: Characteristic.Name, method: this.getName });
  }

  getName (callback) {
    const { name } = this

    this.log(`${name} getName: ${name}`);

    callback(null, name);
  }
}

module.exports = ServiceManager