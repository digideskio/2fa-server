#!/usr/bin/env node
var tfaServer = require('../')
var bole = require('bole')


bole.output({
  level: 'info',
  stream: process.stdout
})

var argv = require('yargs')
  .usage('$0 [options]')
  .option('port', {
    describe: 'port for server to listen.',
    default: 8080
  })
  .option('secret',{
    describe:"the secret clients use so sign requests to trigger two-factor-auth messages",
    required:true
  })
  .option('number',{
    describe:"the phone number you are going touse for outgoing messages",
    required:true
  })
  .option('sid', {
    describe: 'your twilio sid',
    required:true
  })
  .option('token', {
    describe: 'your twilio authToken',
    required:true
  })
  .help('h')
  .alias('h', 'help').argv



var server = tfaServer(argv)

