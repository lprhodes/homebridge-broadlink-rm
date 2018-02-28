const ping = require('ping');

const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration')
const SwitchAccessory = require('./switch');

class OutletAccessory extends SwitchAccessory {

  checkStateWithPing () {
    const { config, debug, log, state } = this;
    let { pingIPAddress, pingIPAddressStateOnly, name, pingFrequency } = config;

    if (!pingFrequency) pingFrequency = 1;
    
    setInterval(() => {
      ping.sys.probe(pingIPAddress, (active) => {
        if (debug) log(`${name} ping "${pingIPAddress}": ${active ? 'active' : 'inactive'}`);

        if (pingIPAddressStateOnly) {
          state.outletInUse = active ? 1 : 0;
          this.switchService.getCharacteristic(Characteristic.OutletInUse).getValue();

          return
        }

        if (active) {
          this.switchService.setCharacteristic(Characteristic.OutletInUse, 1);
        } else {
          this.switchService.setCharacteristic(Characteristic.OutletInUse, 0);
        }
      })
    }, pingFrequency * 1000);
  }

  setOutletInUse (value, callback) {
    callback(null, callback)
  }

  async setSwitchState (hexData) {
    const { data, host, log, name, state, debug } = this;

    if (hexData) sendData({ host, hexData, log, name, debug });

    this.checkAutoOff();
    this.checkAutoOn();
  }

  getServices () {
    const services = super.getInformationServices();

    const { data, name } = this;
    const { on, off } = data || { };

    const service = new Service.Outlet(name);
    this.addNameService(service);

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.On,
      propertyName: 'switchState',
      onData: on,
      offData: off,
      setValuePromise: this.setSwitchState.bind(this)
    });

    service.getCharacteristic(Characteristic.OutletInUse)
      .on('set', this.setOutletInUse)
      .on('get', this.getCharacteristicValue.bind(this, { propertyName: 'outletInUse' }));

    this.switchService = service;

    services.push(service);

    return services;
  }
}

module.exports = SwitchAccessory;
