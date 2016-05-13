var test = require('tape')
var smsq = require('../lib/sms-queue')

test("can",function(t){

  var replies = ['yes','no']

  var testNumber = '16265553232'
  t.plan(11)

  var o = smsq(function sendSms(data,cb){
    // happens twice if queuing works
    t.ok(data.to,'should send "to" to sendSms')
    t.ok(data.message,'should send "message" to sendSms')

    setImmediate(function(){
      cb(false,true)

      setImmediate(function(){
        o.receive({
          from:testNumber,
          message:replies.shift()
        },function(err,confirmed){
          t.ok(!err,'should not have erro in recv callback')
        }) 
      })

    })
  })

  o.send({
    to:testNumber,
    message:"please reply with yes",
    agreement:"yes"
  },function(err,confirmed){
  
    t.ok(!err,'should not have error')
    t.ok(confirmed,'should be confirmed')
    // done.
  })

  o.send({
    to:testNumber,
    message:"please reply with next",
    agreement:"yes"
  },function(err,confirmed){
  
    t.ok(!err,'should not have error')
    t.ok(!confirmed,'should not be confirmed if replied with no')
    // done.
    //
    t.equals(Object.keys(o.pending).length,0,'should have no keys left')
  })



})
