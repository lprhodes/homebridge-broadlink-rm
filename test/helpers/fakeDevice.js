const uuid = require('uuid')

class FakeDevice {

  constructor () {
    const identifier = uuid.v4()

    this.host = {
      address: identifier,
      macAddress: identifier
    }

    this.isUnitTestDevice = true

    this.resetSentHexCodes()
  }

  resetSentHexCodes () {
    this.sentHexCodes = []
  }

  getSentHexCodeCount () {
    return this.sentHexCodes.length
  }

  hasSentCode (hexCode) {
    return (this.sentHexCodes.indexOf(hexCode) > -1);
  }

  hasSentCodes (hexCodes) {
    let hasSentCodes = true
    
    hexCodes.forEach((hexCode) => {
      if (this.sentHexCodes.indexOf(hexCode) === -1) hasSentCodes = false
    })
  
    return hasSentCodes
  }

  sendData (hexBufferData, debug, originalHexString) {
    if (!hexBufferData) throw new Error('Missing HEX Data')

    this.sentHexCodes.push(originalHexString)
  }
}

module.exports = FakeDevice