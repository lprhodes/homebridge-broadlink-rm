const versionCheck = require('github-version-checker');
const pkg = require('../package.json'); 
 
const options = {
  repo: 'kiwi-cam/homebridge-broadlinkrm-acfile', 
  currentVersion: pkg.version, 
  includePreReleases: false 
};


const checkForUpdates = () => {
  versionCheck (options, (update, error) => { 
    // if (error) throw error;
    if (update) { 
      console.log(`\x1b[32m[UPDATE AVAILABLE] \x1b[0mVersion ${update.tag_name} of homebridge-broadlink-rm is available. The release notes can be found here: \x1b[4mhttps://github.com/kiwi-cam/homebridge-broadlinkrm-acfile/releases/\x1b[0m`);
    }
  });
}

module.exports = checkForUpdates;
