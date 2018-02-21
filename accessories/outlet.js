const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration')
const BroadlinkRMAccessory = require('./accessory');
const ping = require('ping');

class SwitchAccessory extends BroadlinkRMAccessory {

  constructor (log, config) {
    super(log, config);

    this.manufacturer = 'Broadlink';
    this.model = 'RM Mini or Pro';
    this.serialNumber = this.host;

    config.resendDataAfterReload = config.resendHexAfterReload;

    if (config.pingIPAddress) this.checkStateWithPing()
  }

  checkStateWithPing () {
    const { config, debug, log } = this;
    let { pingIPAddress } = config;

    const pingFrequency = 1000;
    
    setInterval(() => {
      ping.sys.probe(pingIPAddress, (active) => {
        if (debug) log(`${name} ping "${host}": ${active ? 'active' : 'inactive'}`);

        if (active) {
          this.switchService.setCharacteristic(Characteristic.OutletInUse, 1);
        } else {
          this.switchService.setCharacteristic(Characteristic.OutletInUse, 0);
        }
      })
    }, pingFrequency);
  }

  setOutletInUse (value, callback) {
    callback(null, callback)
  }

  async setSwitchState (hexData) {
    const { config, data, host, log, name, state, debug } = this;
    let { disableAutomaticOff, onDuration } = config;

    // Set defaults
    if (disableAutomaticOff === undefined) disableAutomaticOff = true;
    if (!onDuration) onDuration = 60;

    if (hexData) sendData({ host, hexData, log, name, debug });

    if (this.autoOffTimeout) clearTimeout(this.autoOffTimeout);

    if (state.switchState && !disableAutomaticOff) {
      this.autoOffTimeout = setTimeout(() => {
        this.switchService.setCharacteristic(Characteristic.On, 0);
      }, onDuration * 1000);
    }
  }

  getServices () {
    const services = super.getServices();

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
