const inherits = require('util').inherits;
let Service, Characteristic;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  const HomeKitTVTypes = {};

  // Characteristics
  HomeKitTVTypes.ChannelState = function() {
    Characteristic.call(this, 'Channel', HomeKitTVTypes.ChannelState.UUID);
    this.setProps({
      format: Characteristic.Formats.UINT8,
      //unit: Characteristic.Units.PERCENTAGE,
      maxValue: 9,
      minValue: 1,
      minStep: 1,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  HomeKitTVTypes.ChannelState.UUID = '00001001-0000-1000-8000-12B419A49076';
  inherits(HomeKitTVTypes.ChannelState, Characteristic);


  // Services
  HomeKitTVTypes.ChannelService = function(displayName, subtype) {
    Service.call(this, displayName, HomeKitTVTypes.ChannelService.UUID, subtype);

    // Required Characteristics
    this.addCharacteristic(HomeKitTVTypes.ChannelState);

    // Optional Characteristics
    this.addOptionalCharacteristic(Characteristic.Name);
  };
  HomeKitTVTypes.ChannelService.UUID = '00000001-0000-1000-8000-125B69CC4301';
  inherits(HomeKitTVTypes.ChannelService, Service);

  return HomeKitTVTypes;
};
