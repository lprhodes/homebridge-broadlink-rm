const path = require('path');
const nodePersist = require('node-persist');

var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
home = path.join(home, ".homebridge");

nodePersist.initSync({ dir: `${home}/plugin-persist/homebridge-broadlink-rm` });

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
  clear,
  load,
  save
};
