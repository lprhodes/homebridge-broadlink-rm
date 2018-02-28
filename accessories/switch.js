const ping = require('ping');

const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration')
const BroadlinkRMAccessory = require('./accessory');

class SwitchAccessory extends BroadlinkRMAccessory {

  constructor (log, config) {
    super(log, config);

     console.log("HELLO!")

    if (config.pingIPAddress) this.checkStateWithPing()
  }

  checkStateWithPing () {
    const { config, debug, log, state } = this;
    let { name, pingIPAddress, pingIPAddressStateOnly, pingFrequency } = config;

    if (!pingFrequency) pingFrequency = 1;
    
    setInterval(() => {
      ping.sys.probe(pingIPAddress, (active) => {
        if (debug) log(`${name} ping "${pingIPAddress}": ${active ? 'active' : 'inactive'}`);

        if (pingIPAddressStateOnly) {
          state.switchState = active ? 1 : 0;
          this.switchService.getCharacteristic(Characteristic.On).getValue();

          return
        }

        if (active) {
          this.switchService.setCharacteristic(Characteristic.On, 1);
        } else {
          this.switchService.setCharacteristic(Characteristic.On, 0);
        }
      })
    }, pingFrequency * 1000);
  }

  async setSwitchState (hexData) {
    const { data, host, log, name, debug } = this;

    if (hexData) sendData({ host, hexData, log, name, debug });

    this.checkAutoOff();
    this.checkAutoOn();
  }

  checkAutoOff () {
    const { config, log, name, state } = this;
    let { disableAutomaticOff, onDuration } = config;

    // Set defaults
    if (disableAutomaticOff === undefined) disableAutomaticOff = true;
    if (!onDuration) onDuration = 60;

    if (this.autoOffTimeout) clearTimeout(this.autoOffTimeout);

    if (state.switchState && !disableAutomaticOff) {
      log(`${name} setSwitchState: (automatically turn off in ${onDuration} seconds)`);

      this.autoOffTimeout = setTimeout(() => {
        this.switchService.setCharacteristic(Characteristic.On, 0);
      }, onDuration * 1000);
    }
  }

  checkAutoOn () {
    const { config, log, name, state } = this;
    let { disableAutomaticOn, offDuration } = config;

    // Set defaults
    if (disableAutomaticOn === undefined) disableAutomaticOn = true;
    if (!offDuration) offDuration = 60;

    if (this.autoOnTimeout) clearTimeout(this.autoOnTimeout);

    if (!state.switchState && !disableAutomaticOn) {
      log(`${name} setSwitchState: (automatically turn on in ${offDuration} seconds)`);

      this.autoOnTimeout = setTimeout(() => {
        this.switchService.setCharacteristic(Characteristic.On, 1);
      }, offDuration * 1000);
    }
  }

  getServices () {
    const services = super.getInformationServices();

    const { data, name } = this;
    const { on, off } = data || { };

    const service = new Service.Switch(name);
    this.addNameService(service);

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.On,
      propertyName: 'switchState',
      onData: on,
      offData: off,
      setValuePromise: this.setSwitchState.bind(this)
    });

    this.switchService = service;

    services.push(service);

    return services;
  }
}

module.exports = SwitchAccessory;