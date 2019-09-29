const { expect } = require('chai');

const hexCheck = ({ device, codes, count }) => {
    codes = codes || [];

    // Check hex codes were sent
    const hasSentCodes = device.hasSentCodes(codes);
    expect(hasSentCodes).to.equal(true);

    if (count !== undefined) {
        // Check the number of sent codes
        const sentHexCodeCount = device.getSentHexCodeCount();
        expect(sentHexCodeCount).to.equal(count);
    }
}

module.exports = hexCheck;
