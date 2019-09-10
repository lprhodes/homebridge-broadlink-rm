# Homebridge Broadlink RM [TV+AC File Fork]

# About this fork
This fork addresses an issue updating the temperature from file. Devices appear as "Not Repsonding" on read errors. This fork will use a temperature of 0 instead of hanging. If you want to use this fork, use this command: 

`npm i -g git+https://github.com/kiwi-cam/homebridge-broadlinkrm-acfile.git`

This fork comes from another fork which adds support for the TV type indroduced in iOS 12.2.

Now updated to replciate the airconditioner-pro accessory:
  1. Added configuration item allowAutoMode which, if true, will allow AC to run in Auto mode.
  2. Added configuration to read hex codes for {mode}{temp} e.g.
  
	"data":{
  	"off":"2600500000012...",
    "heat30":{
    	"data":"2600500000012..."
    },
    "cool16":{
    	"data":"2600500000012..."
    }
  }

# Homebridge Broadlink RM [[Original](https://github.com/lprhodes/homebridge-broadlink-rm)]

## Introduction
Welcome to the Broadlink RM Mini and Broadlink RM Pro plugin for [Homebridge](https://github.com/nfarina/homebridge).

This plugin allows you to control your RM Mini and RM Pro with HomeKit using the Home app and Siri.


## Like this plugin?

If you like this plugin and want to show your support then please star the Github repo, or better yet; buy me a drink using [Paypal](https://paypal.me/lprhodes) or [crypto currency](https://goo.gl/bEn1RW).

Working on open source projects like this is full-time for me so every bit helps.

Thank you, sincerely!

## Newsletter

You can keep informed about HomeKit, homebridge and homebridge plugins by subscribing to my [Works with](http://workswith.io) newsletter.

## Documentation

Full documentation can be found [here](https://lprhodes.github.io/slate/).

## Thanks
Thanks to @tattn (https://github.com/tattn/homebridge-rm-mini3), @PJCzx (https://github.com/PJCzx/homebridge-thermostat) @momodalo (https://github.com/momodalo/broadlinkjs) whose time and effort got me started.
