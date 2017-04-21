const nodePersist = require('node-persist');
nodePersist.initSync();

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
