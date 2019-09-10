# Homebridge Broadlink RM [TV+AC File Fork]

# About this fork

This fork is built upon [AlexanderBabel's version](https://github.com/AlexanderBabel/homebridge-broadlink-rm) which adds TV support to [lprhodes Broadlink RM Plugin](https://github.com/lprhodes/homebridge-broadlink-rm). This fork also addresses an issue updating the temperature from file. Devices appear as "Not Repsonding" on read errors. This fork will use a temperature of 0 instead of hanging. Now updated to replciate the airconditioner-pro accessory:

  1. Added configuration to read hex codes for {mode}{temp} e.g.
```  
	"data":{
  	"off":"2600500000012...",
    "heat30":{
    	"data":"2600500000012..."
    },
    "cool16":{
    	"data":"2600500000012..."
    }
  }
```

If you want to use this fork, use this command: 

`npm i -g git+https://github.com/kiwi-cam/homebridge-broadlinkrm-acfile.git`


# Homebridge Broadlink RM [[Original](https://github.com/lprhodes/homebridge-broadlink-rm)]

## Introduction
Welcome to the Broadlink RM Mini and Broadlink RM Pro plugin for [Homebridge](https://github.com/nfarina/homebridge).

This plugin allows you to control your RM Mini and RM Pro with HomeKit using the Home app and Siri.

## Documentation

Full documentation can be found [here](https://lprhodes.github.io/slate/).

## Thanks
Thanks to @tattn (https://github.com/tattn/homebridge-rm-mini3), @PJCzx (https://github.com/PJCzx/homebridge-thermostat) @momodalo (https://github.com/momodalo/broadlinkjs) whose time and effort got me started.
