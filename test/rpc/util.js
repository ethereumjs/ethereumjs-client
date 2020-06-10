module.exports = {
  checkError (t, expectedCode, expectedMessage) {
    return (res) => {
      if (!res.body.error) {
        throw new Error('should return an error object')
      }
      if (res.body.error.code !== expectedCode) {
        throw new Error(`should have an error code ${expectedCode}`)
      }
      if (expectedMessage && res.body.error.message !== expectedMessage) {
        throw new Error(`should have an error message "${expectedMessage}"`)
      }
      t.pass('should return error object with error code and message')
    }
  }
}
