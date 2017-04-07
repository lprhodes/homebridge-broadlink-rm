const AirConAccessory = require('./aircon');
const ChannelAccessory = require('./channel');
const LearnIRAccessory = require('./learnIR');
const SwitchAccessory = require('./switch');
const SwitchMultiAccessory = require('./switchMulti');
const SwitchMultiRepeatAccessory = require('./switchMultiRepeat');
const SwitchRepeatAccessory = require('./switchRepeat');
const UpDownAccessory = require('./upDown');
const FanAccessory = require('./fan');

module.exports = {
  AirCon: AirConAccessory,
  Channel: ChannelAccessory,
  LearnIR: LearnIRAccessory,
  Switch: SwitchAccessory,
  SwitchMulti: SwitchMultiAccessory,
  SwitchMultiRepeat: SwitchMultiRepeatAccessory,
  SwitchRepeat: SwitchRepeatAccessory,
  UpDown: UpDownAccessory,
  Fan: FanAccessory
}
