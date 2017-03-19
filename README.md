# Homebridge Broadlink RM

Broadlink RM Mini and Pro plugin for [Homebridge](https://github.com/nfarina/homebridge)

This allows you to control your RM Mini 3 and Pro 3 with HomeKit and Siri.

## Installation

1. Install homebridge using: `sudo npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-broadlink-rm`
3. Update your configuration file. (See config-sample.json)

## Learning Hex IR codes

Adding the "Broadlink RM Learner" accessory in your homebridge config will display a new switch accessory in the Home app dedicated to learning IR codes. Simply toggle the switch on, perform the IR command in front of your Broadlink RM device and copy the HEX output from the hombridge console log to wherever you want the code in the config.

The switch will toggle off automatically once the IR code has been received or 10 seconds has passed.

You can optionally stop attempting to learn IR by toggling the switch off yourself.

## Notes
You can add a hex code for every temperature but simply adding hex codes for 16C and 30C (or the equivalent in F) will give you a great experience with something like an air conditioner where you just use it for a while to cool you down.

There looks to be a glitch in the Apple Home app when setting the mode to Off (nothing happens) when you've turned the thermostat on by setting a specific temperature. Siri and other HomeKit apps don't have the same glitch. You can just select a different mode and then press Off. This only happens the first time after launching homebridge.

## Thanks
Thanks to @tattn (https://github.com/tattn/homebridge-rm-mini3), @PJCzx (https://github.com/PJCzx/homebridge-thermostat) @momodalo (https://github.com/momodalo/broadlinkjs) whose time and effort got me started.
