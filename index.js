var restify = require('restify');
var twilio = require('twilio')
var request = require('request')

var smsQueue = require('./lib/sms-queue')
var log = require('./lib/log')
var sign = require('./lib/sign')
var stableStringify = require('json-stable-stringify')
var cleanPhone = require('./lib/clean-phone')

/*
{
  number:
  secret:
  sid:
  token:
  protocol: [https]
}
*/

module.exports = function(config){

  var ourNumber = config.number
  var errors = []
  if(!config.number) errors.push('config.number required. must be the number you send from')
  if(!config.secret) errors.push('config.secret required. must be the secret you use to sign request from the client')
  if(!config.sid) errors.push('config.sid required. must be your twilio sid')
  if(!config.token) errors.push('config.token required. must be your twilio authToken')


  if(errors.length) {
    console.error("\n"+errors.join("\n")+"\n")
    throw new Error('invalid config')
  }


  // in order to POST the /v1/2fa route you must sign a header with a secret.
  // this can be any value. does not have to be your twilio secret.
  // it is not safe to use this value if you do not secure this server with https because folks can just replay it.
  //
  // x-2fa-signature: signature
  //

  var secret = config.secret;
  var client = twilio(config.sid, config.token)
  var queue = smsQueue(function(args,cb){
    client.sendMessage({
      to: args.to, // Any number Twilio can deliver to
      from: ourNumber, // A number you bought from Twilio and can use for outbound communication
      body: args.message // body of the SMS message
    },cb)
  })

  var server = restify.createServer();
  server.use(restify.bodyParser())
  server.post('/v1/twilio-recvhook', recvHook);
  server.post('/v1/2fa', twoFactorRequest);

  server.listen(config.port||8080, function() {
    console.log('%s listening at %s', server.name, server.url);
  });

  return server

  function twoFactorRequest(req,res,next){

    var sig = req.headers['x-2fa-signature']
    if(sign(stableStringify(req.body),secret) !== sig) { 
      log('request rejected. did not have correct signature. '+req.url,req.method,req.headers)
      res.writeHead(403, { 'Content-Type':'application/json' });
      res.end('{"message":"invalid signature"}');
      return next()
    }
    
    var args = req.body||{}

    if(!args.to || !args.message) {
      res.writeHead(400, { 'Content-Type':'application/json' });
      res.end(JSON.stringify({message:"'to' and 'message' required. 'agreement' optional"}))
      return next()
    }

    if(args.to.indexOf('+') !== 0) {
      res.writeHead(400, { 'Content-Type':'application/json' });
      res.end('{"message":"please prefix the phone number with +[country code] see https://www.twilio.com/help/faq/phone-numbers/how-do-i-format-phone-numbers-to-work-internationally"}')
      return next()
    }


    // send sms!
    //require the Twilio module and create a REST client
    //Send an SMS text message
    queue.send(args,function(err,confirmed){
      if(err) {
        res.end(JSON.stringfy({message:"error sending sms to "+args.to+'. '+err}))
      } else { 
        res.end(JSON.stringfy({confirmed:confirmed}))
      }
      next()
    })
  }

  function recvHook(req,res,next){
 
    log('post from twilio',req.body)

    //validate incoming request is from twilio using your auth token and the header from Twilio
    var header = req.headers['x-twilio-signature']

    //validateRequest returns true if the request originated from Twilio
    if (twilio.validateRequest(token, header, cleanProto(req.headers['x-forwarded-proto']||config.protocol||'https')+'://'+req.headers.host+req.url, req.body)) {

      phone = cleanPhone(req.body.From)

      return queue.receive({
        from:req.body.From,
        message:req.body.Body
      },function(err){
      
        var resp = new twilio.TwimlResponse();
        if(err) {
          resp.message(err.code === 'ENOPENDING'?"no requests are active for this number.":"got an error confirming this request.")
        }
        var out = resp.toString()
        res.writeHead(200, { 'Content-Type':'text/xml' });
        res.end(out);     
      })

    } else {

      log('request rejected. did not have correct signature. '+req.url,req.method,req.headers)
      res.writeHead(403, { 'Content-Type':'application/json' });
      res.end('{"message":"you are not twilio"}');
    }

    next()
  }
}

module.exports.request = function(host,secret,args,cb){
  sig = sign(stableStringify(args),secret)
  request.post(host+'/v1/2fa',{form:args,headers:{'x-2fa-signature':sig},json:true},function(err,res,body){
    cb(err,body)
  })
}

function cleanProto(proto){
  return proto.replace(/[^a-z]/gi,'')
}
