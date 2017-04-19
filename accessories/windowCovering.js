const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const BroadlinkRMAccessory = require('./accessory');

class WindowCoveringAccessory extends BroadlinkRMAccessory {

  async setTargetPosition (hexData, previousValue) {
    const { config, data, log, name } = this;
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

      log(`${name} setTargetPosition: (rounding to multiple of percentageChangePerSend; ${roundedTargetPosition})`);

      setTimeout(() => {
        this.windowCoveringService.setCharacteristic(Characteristic.TargetPosition, roundedTargetPosition);
      }, 200);

      return;
    }

    const sendCount = Math.ceil(difference / percentageChangePerSend);

    hexData = opening ? open : close

try {
    this.openOrClose({ hexData, opening, sendCount, previousValue }) // Perform this asynchronously i.e. without await
  } catch (err) {
    console.log(err)
  }
  }

  async openOrClose ({ hexData, opening, sendCount, previousValue }) {
    let { config, data, host, name, log } = this;
    let { percentageChangePerSend, interval, disableAutomaticOff, onDuration, onDurationOpen, onDurationClose } = config;
    const { off } = data;

    if (!interval) percentageChangePerSend = 0.5;
    if (!percentageChangePerSend) percentageChangePerSend = 10;
    if (disableAutomaticOff === undefined) disableAutomaticOff = true;

    let currentValue = previousValue;

    // Itterate through each hex config in the array
    for (let index = 0; index < sendCount; index++) {

      if (opening) currentValue += percentageChangePerSend
      if (!opening) currentValue -= percentageChangePerSend

      sendData({ host, hexData, log });
      this.windowCoveringService.setCharacteristic(Characteristic.CurrentPosition, currentValue);

      if (!disableAutomaticOff) {
        if (!onDuration) onDuration = opening ? onDurationOpen : onDurationClose;
        if (!onDuration) onDuration = 2;

        log(`${name} setTargetPosition: waiting ${onDuration}s for auto-off`);
        await delayForDuration(onDuration);

        if (!off) throw new Error('An "off" hex code must be set if "disableAutomaticOff" is set to false.')

        log(`${name} setTargetPosition: auto-off`);
        sendData({ host, hexData: off, log });
      }

      log(`${name} setTargetPosition: waiting ${interval}s for next send`);

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
