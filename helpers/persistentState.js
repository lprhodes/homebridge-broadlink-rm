const path = require('path');
const nodePersist = require('node-persist');

const init = ({ homebridgeDirectory }) => {
  if (!homebridgeDirectory) {
    homebridgeDirectory = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
    homebridgeDirectory = path.join(homebridgeDirectory, ".homebridge");
  }

  nodePersist.initSync({ dir: `${homebridgeDirectory}/plugin-persist/homebridge-broadlink-rm` });
}

const clear = ({ host, name }) => {
  if (!host) host = 'default';

  return nodePersist.removeItemSync(`${host}-${name}`);
}

const load = ({ host, name }) => {
  if (!host) host = 'default';

  return nodePersist.getItemSync(`${host}-${name}`);
}

const save = ({ host, name, state }) => {
  if (!host) host = 'default';

  return nodePersist.setItemSync(`${host}-${name}`, state);
}

module.exports = {
  init,
  clear,
  load,
  save
};
