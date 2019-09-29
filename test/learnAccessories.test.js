const { expect } = require('chai');

const { getAccessories } = require('./helpers/setup')


describe('learnAccessories', () => {

  // // Empty Config
  it('empty config results in 2 accessories', async () => {
    const config = { disableLogs: true, isUnitTest: true };
    const accessories = await getAccessories(config);
    
    expect(accessories.length).to.equal(2);
  });
  
  // hideScanFrequencyButton
  it('hideScanFrequencyButton set to true in config results in 1 accessory', async () => {
    const config = { disableLogs: true, hideScanFrequencyButton: true, isUnitTest: true };
    const accessories = await getAccessories(config);
    
    expect(accessories.length).to.equal(1);
  });

  // hideLearnButton
  it('hideLearnButton set to true in config results in 1 accessory', async () => {
    const config = { disableLogs: true, hideLearnButton: true, isUnitTest: true };
    const accessories = await getAccessories(config);
    
    expect(accessories.length).to.equal(1);
  });
})
