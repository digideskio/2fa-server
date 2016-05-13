#!/usr/bin/env node
var tfaServer = require('../')

var argv = require('yargs')
  .usage('$0 [options]')
  .option('secret',{
    describe:"the secret the server uses so you can trigger 2fa messages",
    required:true
  })
  .option('to',{
    describe:"the phone number you are going to ask for confirmation",
    required:true
  })
  .option('message', {
    describe: 'the question you want to ask',
    required:true
  })
  .option('agreement',{
    describe:"the text required in response to confirm the action. case insensitive. head match.",
    default: 'ok'
  })
  .option('server', {
    describe: 'the url to the server ',
    required:true
  })
  .help('h')
  .alias('h', 'help').argv


var secret = argv.secret
var server = argv.server
delete argv.secret
delete argv.server

tfaServer.request(server,secret,argv,console.log)

