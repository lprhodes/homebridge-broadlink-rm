const sendData = require('../helpers/sendData');
const BroadlinkRMAccessory = require('./accessory');

class ProjectorAccessory extends BroadlinkRMAccessory {

  async setSwitchState (hexData) {
    const { config, data, host, log, name, state } = this;
    let { disableAutomaticOff, onDuration } = config;
    if (hexData) sendData({ host, hexData, log, name });
    if (!state['switchState'] && hexData){
        setTimeout(function() {
            sendData({ host, hexData, log, name }); 
        }, 1500);
        console.log('Closed');
    }else{
        console.log('Opened');
    }
  }

  getServices () {
    const services = super.getServices();

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

module.exports = ProjectorAccessory;
