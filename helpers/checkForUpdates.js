const versionCheck = require('github-version-checker');
const pkg = require('../package.json'); 
 
const options = {
  repo: 'lprhodes/homebridge-broadlink-rm', 
  currentVersion: pkg.version, 
  includePreReleases: false 
};


const checkForUpdates = (log) => {
  versionCheck (options, (update, error) => { 
    if (error) throw error;

    if (update) { 
      log(`\x1b[32m[UPDATE AVAILABLE] \x1b[30mVersion ${update.tag_name} of homebridge-broadlink-rm is available: ${update.html_url}`);
    }
  });
}

module.exports = checkForUpdates;