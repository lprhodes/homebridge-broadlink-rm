# Homebridge Broadlink RM [AC enhance Fork]

# About this fork

This fork enhance the setting for Air Conditioner accessory. You may check the `air-conditioner2` part in config-simple.json for more ideas.

### Aircon Accessory

#### "data" key-value object

key | description
--- | -----------
off | A hex code string to be sent when the air conditioner is asked to be turned off.
ModeTemperature | A hex code string where Temperature is any temperture, and Mode is one of "heat","cool", or "auto". Hex code used to set unit to the specified mode and temperature e.g. "heat30", "cool18".


# Homebridge Broadlink RM [[Original](https://github.com/lprhodes/homebridge-broadlink-rm)]

## Introduction
Welcome to the Broadlink RM Mini and Broadlink RM Pro plugin for [Homebridge](https://github.com/nfarina/homebridge).

This plugin allows you to control your RM Mini and RM Pro with HomeKit using the Home app and Siri.

## Documentation

Full documentation can be found [here](https://lprhodes.github.io/slate/). With the following additional configuration options available:
