const { BroadlinkRMPlatform } = require('../index');

const log = (message, more) => {
  if (more) {
    console.log(message, more)
  } else {
    console.log(message)
  }
};

const setup = (config) => {
  const platform = new BroadlinkRMPlatform(log, config);
}

const getAccessories = (config) => {
  const platform = new BroadlinkRMPlatform(log, config);

    const accessoriesPromise = new Promise((resolve, reject) => {
      platform.accessories(resolve);
    })

    return accessoriesPromise
}

module.exports = { setup, getAccessories }