const prontoToLIRC = (prontoCode, log) => {
  const prontoArr = prontoCode.split(' ');

  const intArr = prontoArr.map((item) => {
    return parseInt(`0x${item}`);
  });


  if (intArr[0]) {
    log(`Pronto code should start with 0000`);

    return;
  }

  if (intArr.length != (4 + 2 * (intArr[2] + intArr[3]))) {
    return log(`Pronto code is invalid`);

    return;
  }

  const frequency = 1 / (intArr[1] * 0.241246);

  const lircArr = intArr.map((item) => {
    return parseInt(Math.round(item / frequency))
  }).slice(4);

  return lircArr;
}

const lircToBroadlink = (pulses, log) => {
  const pulseArr = [ ];

  pulses.forEach((pulse) => {
    pulse = parseInt(pulse * 269 / 8192);

    if (pulse < 256) {
      pulseArr.push(pulse.toString(16).padStart(2, '0'));
    } else {
      pulseArr.push('00');

      const twoBytes = pulse.toString(16).padStart(4, '0');

      pulseArr.push(twoBytes[0] + twoBytes[1]);
      pulseArr.push(twoBytes[2] + twoBytes[3]);
    }
  });

  let finalArr = [ '26', '00' ];

  const count = pulseArr.length;
  const twoBytes = count.toString(16).padEnd(4, '0');
  finalArr.push(twoBytes[0] + twoBytes[1]);
  finalArr.push(twoBytes[2] + twoBytes[3]);

  finalArr = finalArr.concat(pulseArr);
  finalArr.push('0d');
  finalArr.push('05');

  const remainder = (finalArr.length + 4) % 16;

  let finalHex = finalArr.join('');
  finalHex = finalHex.padEnd(finalHex.length + ((16 - remainder) * 2), '0');

  return finalHex;
}

const convertProntoToBroadlink = (prontoCode, log) => {
  const lircPulses = prontoToLIRC(prontoCode, log);

  if (!lircPulses) return
  
  const broadlinkCode = lircToBroadlink(lircPulses, log);

  return broadlinkCode;
}

module.exports = convertProntoToBroadlink