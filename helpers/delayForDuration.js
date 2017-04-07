const delayForDuration = (duration) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, duration * 1000)
  })
}

module.exports = delayForDuration;
