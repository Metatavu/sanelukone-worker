(function() {
  'use strict';
  
  var _ = require("underscore");
  var http = require('http');
  var util = require('util');
  var express = require('express');
  var morgan = require('morgan');
  var bodyParser = require('body-parser');
  var uuid = require('uuid4');
  var pidusage = require('pidusage');
  
  var WebSockets = require(__dirname + '/websockets');
  var messages = require('sanelukone-messages').getInstance();

  var workerId = uuid();
  var argv = require('yargs')
    .usage('Start sanelukone worker \nUsage: $0')
    .demand('p')
    .alias('p', 'port')
    .describe('p', 'Port')
    .demand('h')
    .alias('h', 'host')
    .describe('h', 'Host')
    .argv;
  
  var port = argv.port;
  var host = argv.host;
  
  var app = express();
  var httpServer = http.createServer(app);
  httpServer.listen(port, function() {
    console.log('Server is listening on port ' + port);
  });
  
  app.use(morgan('combined'));
  
  setInterval(function () {
    pidusage.stat(process.pid, function(err, stat) {
      messages.trigger("cluster:ping", {
        workerId: workerId,
        host: host,
        port: port,
        cpu: stat.cpu,
        memory: stat.memory
      });
    });
  }, 1000);
  
  var webSockets = new WebSockets(httpServer);

  webSockets.on("system:hello", function (data) {
    console.log("Received helo");
  });
  
  webSockets.on("clip", function (data) {
    var buffer = data.data;
    var client = data.client;
    client.sendMessage("clip:processed", { });
  });
  
  console.log(util.format("Worker started at %s:%d", host, port));
  
}).call(this);