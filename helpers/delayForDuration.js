function delayForDuration(duration) {
  let timerID, endTimer

  const promiseFunc = function (resolve, reject) {
    endTimer = reject

    timerID = setTimeout(() => {
      resolve()
    }, duration * 1000)
  }

  class Timer extends Promise {

    cancel () {
      endTimer()
      clearTimeout(timerID)
      this.isCanceled = true
    }
  }

    return new Timer(promiseFunc)
}

module.exports = delayForDuration;
