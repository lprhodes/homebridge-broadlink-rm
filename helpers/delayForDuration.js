const { TIMEOUT_CANCELLATION } = require('./errors')

function delayForDuration(duration) {
  let timerID, endTimer, timer;

  const promiseFunc = function (resolve, reject) {
    endTimer = reject;

    timerID = setTimeout(() => {
      resolve('Timeout Complete');
      this.isCancelled  = true;
    }, duration * 1000);
  }

  class Timer extends Promise {

    cancel () {
      if (this.isCancelled) return;

      clearTimeout(timerID);
      this.isCancelled = true;

      endTimer(new Error(TIMEOUT_CANCELLATION));
    }
  }

  timer = new Timer(promiseFunc);
  timer.isCancelled = false;

  return timer;
}

module.exports = delayForDuration;
