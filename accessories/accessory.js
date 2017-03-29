class BroadlinkRMAccessory {

  constructor (log, config = {}) {
    const { host, name, data } = config;

    this.log = log;
    this.config = config;

    this.host = host;
    this.name = name;
    this.data = data;
  }

  identify (callback) {
    this.log(`Identify requested for ${this.name}`);

    callback();
  }

  getName (name, callback) {
		this.log(`getName: ${name}`);

		callback(null, name);
	}

  addNameService (service) {
    const { name } = this

    service.getCharacteristic(Characteristic.Name).on('get', this.getName.bind(this, name));
  }

  getServices () {
    const informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Broadlink')
      .setCharacteristic(Characteristic.Model, 'RM Mini or Pro')
      .setCharacteristic(Characteristic.SerialNumber, this.host);

    return [ informationService ];
  }
}

module.exports = BroadlinkRMAccessory
