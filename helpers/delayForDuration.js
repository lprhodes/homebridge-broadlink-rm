const delayForDuration = (duration) => {
  return new Promise((resolve) => {
    setTimeout(resolve, duration * 1000)
  })
}

module.exports = delayForDuration;
