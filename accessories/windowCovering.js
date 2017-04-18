const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const BroadlinkRMAccessory = require('./accessory');

class WindowCoveringAccessory extends BroadlinkRMAccessory {

  async setTargetPosition (hexData, previousValue) {
    const { config, data, log } = this;
    const { open, close } = data;
    let { percentageChangePerSend } = config;

    if (!previousValue) previousValue = 0
    if (!percentageChangePerSend) percentageChangePerSend = 10;

    let difference = this.targetPosition - previousValue;

    const opening = (difference > 0);
    if (!opening) difference = -1 * difference;

    // If the target position is not a multiple of the percentageChangePerSend
    // value then make it so
    if (this.targetPosition % percentageChangePerSend !== 0) {
      let roundedTargetPosition;

      if (opening) roundedTargetPosition = Math.ceil(this.targetPosition / percentageChangePerSend) * percentageChangePerSend;
      if (!opening) roundedTargetPosition = Math.floor(this.targetPosition / percentageChangePerSend) * percentageChangePerSend;

      this.targetPosition = previousValue;

      log(`setTargetPosition: (rounding to multiple of percentageChangePerSend; ${roundedTargetPosition})`);

      setTimeout(() => {
        this.windowCoveringService.setCharacteristic(Characteristic.TargetPosition, roundedTargetPosition);
      }, 200);

      return;
    }

    const sendCount = Math.ceil(difference / percentageChangePerSend);

    hexData = opening ? open : close

    this.openOrClose({ hexData, opening, sendCount, previousValue }) // Perform this asynchronously i.e. without await
  }

  async openOrClose ({ hexData, opening, sendCount, previousValue }) {
    const { config, host, log } = this
    let { percentageChangePerSend, interval } = config;

    if (!interval) percentageChangePerSend = 0.5;
    if (!percentageChangePerSend) percentageChangePerSend = 10;

    let currentValue = previousValue;

    // Itterate through each hex config in the array
    for (let index = 0; index < sendCount; index++) {

      if (opening) currentValue += percentageChangePerSend
      if (!opening) currentValue -= percentageChangePerSend

      sendData({ host, hexData, log });
      this.windowCoveringService.setCharacteristic(Characteristic.CurrentPosition, currentValue);

      if (index < sendCount) await delayForDuration(interval);
    }
  }

  getServices () {
    const services = super.getServices();

    const { data, name } = this;

    const service = new Service.WindowCovering(name);
    this.addNameService(service);

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.TargetPosition,
      propertyName: 'targetPosition',
      setValuePromise: this.setTargetPosition.bind(this)
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.CurrentPosition,
      propertyName: 'currentPosition',
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.PositionState,
      propertyName: 'positionState',
      defaultValue: Characteristic.PositionState.STOPPED
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.CurrentHorizontalTiltAngle,
      propertyName: 'currentHorizontalTiltAngle',
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.CurrentVerticalTiltAngle,
      propertyName: 'currentVerticalTiltAngle',
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.TargetHorizontalTiltAngle,
      propertyName: 'targetHorizontalTiltAngle',
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.TargetVerticalTiltAngle,
      propertyName: 'targetVerticalTiltAngle',
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.HoldPosition,
      propertyName: 'holdPosition',
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.ObstructionDetected,
      propertyName: 'obstructionDetected',
      defaultValue: false
    });

    this.windowCoveringService = service;

    services.push(service);

    return services;
  }
}

module.exports = WindowCoveringAccessory;
