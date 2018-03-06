class FakeDevice {

  constructor () {
    this.host = {
      address: 'TestDevice',
      macAddress: 'te:st:de:vi:ce'
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