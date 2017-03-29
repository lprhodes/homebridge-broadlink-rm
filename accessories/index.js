const AirConAccessory = require('./aircon');
const ChannelAccessory = require('./channel');
const LearnIRAccessory = require('./learnIR');
const SwitchAccessory = require('./switch');
const SwitchRepeatAccessory = require('./switchRepeat');
const UpDownAccessory = require('./upDown');

module.exports = {
  AirCon: AirConAccessory,
  Channel: ChannelAccessory,
  LearnIR: LearnIRAccessory,
  Switch: SwitchAccessory,
  SwitchRepeat: SwitchRepeatAccessory,
  UpDown: UpDownAccessory
}
