# Homebridge Broadlink RM

Broadlink RM Mini 3 and Pro 3 plugin for [Homebridge](https://github.com/nfarina/homebridge)

This allows you to control your RM Mini 3 and Pro 3 with HomeKit and Siri.

## Installation

1. Install homebridge using: `sudo npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-broadlink-rm`
3. Update your configuration file. (See config-sample.json)

## Hex IR codes

HEX IR codes are need to be learned by the Broadlink RM device and then captured in order to make this plugin work. You can use a third-party app such as Wireshark to do this.

- Tip 1: Create an ad-hoc Wi-Fi network from your computer to your mobile phone so that all packets are going through the Wifi.
- Tip 2: If you create an account in the e-control app you'll be able to see the packets going to a remote server pretty easily.

## Notes
You can add a hex code for every temperature but simply adding hex codes for 16C and 30C (or the equivalent in F) will give you a great experience with something like an air conditioner where you just use it for a while to cool you down.

There looks to be a glitch in the Apple Home app when setting the mode to Off (nothing happens) when you've turned the thermostat on by setting a specific temperature. Siri and other HomeKit apps don't have the same glitch. You can just select a different mode and then press Off. This only happens the first time after launching homebridge.

## Thanks
Thanks to @tattn (https://github.com/tattn/homebridge-rm-mini3) and @PJCzx https://github.com/PJCzx/homebridge-thermostat who's time and effort got me started.
