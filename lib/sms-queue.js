var once = require('once')
var cleanPhone = require('./clean-phone')
var log = console.log // require('./log')

module.exports = function (sendSms) {
  return {
    timeout: 1000 * 60 * 2,
    pending: {},
    send: function (data, cb) {
      var self = this
      var to = cleanPhone(data.to)

      if (!self.pending[to]) self.pending[to] = []
      self.pending[to].push([data, cb])

      // only process one message to a phone at a time.
      if (self.pending[to].length > 1) return;
      self._send(self.pending[to][0])
    },
    receive: function (data, cb) {
      // data is {from: phone number,message: "ok"}

      var self = this
      var from = cleanPhone(data.from)

      if (!self.pending[from] || !self.pending[from].length) {
        log('got reply from ', data, ' but have no pending for ' + from)
        return setImmediate(function () {
          var e = new Error('not pending.')
          e.code = "ENOPENDING"
          // we can send a nice reply back.
          cb(e)
        })
      }

      var sent = self.pending[from][0]
      var confirmed = (sent[0].agreement || 'ok').toLowerCase().indexOf(data.message.toLowerCase().trim()) === 0

      sent[2](false, confirmed)
      setImmediate(function () {
        if (cb) cb(false, confirmed)
      })
    },
    _send: function send (arr) {
      var self = this
      var data = arr[0]
      var timer

      var to = cleanPhone(data.to)
      var message = data.message

      var cb = once(function (err, data) {
        clearTimeout(timer)
        // remove attempt
        self.pending[to].shift()
        // if there is another request waiting start that one.
        if (self.pending[to].length) {
          setImmediate(function () {
            self._send(self.pending[to][0])
          })
        } else delete self.pending[to]

        arr[1](err, data)
      })

      if (arr[2]) {
        console.log('this should not happen. _sending a request we have run already!')
        return
      }
      // set the cb in data so recv can find it.
      arr[2] = cb

      sendSms({
        to: to,
        message: message
      }, function (err, data) {
        if (err) return cb(err)
        // now we wait. this either times out after 2 minutes or we resolve the callback with a reply text.
        timer = setTimeout(function () {
          cb(new Error('reply timeout.'))
        }, self.timeout)
      })
    }
  }
}
