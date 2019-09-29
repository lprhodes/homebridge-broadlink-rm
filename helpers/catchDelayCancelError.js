const { TIMEOUT_CANCELLATION } = require('./errors')

const catchDelayCancelError = async (originalMethod) => {

  let result

  try {
    result = await originalMethod()
  } catch (err) {
    if (err.message !== TIMEOUT_CANCELLATION) throw err
  }

  return result
}

module.exports = catchDelayCancelError
