class UpDown extends Service {

  constructor (displayName, subtype) {
    super(displayName, '00000001-0000-1000-8000-125B69CC4302', subtype);

    // Required Characteristics
    this.addCharacteristic(UpDownState);

    // Optional Characteristics
    this.addOptionalCharacteristic(Characteristic.Name);
  }
}

class UpDownState extends Characteristic {

  constructor () {
    super('UpDown', '00001001-0000-1000-8000-12B419A49077');

    this.setProps({
      format: Characteristic.Formats.UINT8,
      //unit: Characteristic.Units.PERCENTAGE,
      maxValue: 1,
      minValue: -1,
      minStep: 1,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
    });

    this.value = this.getDefaultValue();
  }
}

Service.UpDown = UpDown
Characteristic.UpDownState = UpDownState
