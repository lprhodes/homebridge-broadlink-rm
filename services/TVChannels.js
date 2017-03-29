class Channel extends Service {

  constructor (displayName, subtype) {
    super(displayName, '00000001-0000-1000-8000-125B69CC4301', subtype);

    // Required Characteristics
    this.addCharacteristic(ChannelState);

    // Optional Characteristics
    this.addOptionalCharacteristic(Characteristic.Name);
  }
}

class ChannelState extends Characteristic {

  constructor (maxValue) {
    super('Channel', '00001001-0000-1000-8000-12B419A49076');

    this.setProps({
      format: Characteristic.Formats.UINT8,
      //unit: Characteristic.Units.PERCENTAGE,
      maxValue: maxValue || 9,
      minValue: 1,
      minStep: 1,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
    });

    this.value = this.getDefaultValue();
  }
}

Service.Channel = Channel
Characteristic.ChannelState = ChannelState
