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
  var fs = require('fs');
  var stream = require('stream');
  
  var WebSockets = require(__dirname + '/websockets');
  var database = require(__dirname + '/database');
  var wave = require(__dirname + '/wave');
  var speechToText = require(__dirname + '/speech-to-text');
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
  
  app.get('/clips/:sessionId', function (req, res) {
    database.listSessionClips(req.params.sessionId, function (err, clips) {
      wave.mergeClips(clips, function (err, buffer) {
        if (err) {
          res.status(500).send(err); 
        } else {
          res.setHeader('content-type', 'audio/wav');
          res.send(buffer);
        }
      });
    });
  });
  
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

  webSockets.on("system:hello", function (event) {
    console.log("Received helo");
  });
  
  webSockets.on("transmit:start", function (event) {
    var client = event.client;
    var sessionId = event.sessionId;
    client.setSessionId(sessionId);
    console.log(util.format("Started receiving data for session %s", sessionId));
  });
  
  webSockets.on("transmit:end", function (event) {
    var client = event.client;
    var sessionId = event.sessionId;
    client.setSessionId(null);
    console.log(util.format("Stopped receiving data for session %s", sessionId));
    
    console.log(util.format("Start processing session %s", sessionId));
    
    database.listSessionClips(sessionId, function (err, clips) {
      if (err) {
        console.error(err);
      } else {
        wave.mergeClips(clips, function (err, buffer) {
          if (err) {
            res.status(500).send(err); 
          } else {
            speechToText.createRecognizeStream(buffer)
              .on('error', (err) => {
                console.error(err);
              })
              .on('data', (data) => {
                console.log('Data received: %j', data);
              });
          }
        });
      }
    });
  });
  
  webSockets.on("clip", function (event) {
    var data = event.data;
    var client = event.client;
    var time = new Date().getTime();
    var sessionId = client.getSessionId();
    database.insertClip(sessionId, time, data, function (err) {
      if (err) {
        console.err(err);
      } else {
        client.sendMessage("transmit:clip-transmitted", { 
          sessionId: sessionId
        });
      }
    });
  });
  
  console.log(util.format("Worker started at %s:%d", host, port));
  
}).call(this);