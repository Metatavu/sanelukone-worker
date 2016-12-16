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
  var toBuffer = require('typedarray-to-buffer');
  
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
  app.use(express.static(__dirname + '/public'));
  app.set('views', __dirname + '/views');
  app.set('view engine', 'pug');

  app.get('/sessions/:sessionId/clipdatas', function (req, res) {
    database.listSessionClips(req.params.sessionId, function (err, clips) {
      wave.mergeClipsWave(clips, function (err, buffer) {
        if (err) {
          res.status(500).send(err); 
        } else {
          res.setHeader('content-type', 'audio/wav');
          res.send(buffer);
        }
      });
    });
  });

  app.get('/sessions/:sessionId/texts', function (req, res) {
    database.listSessionTexts(req.params.sessionId, function (err, texts) {
      if (err) {
        res.status(500).send(err); 
      } else {
        res.setHeader('content-type', 'application/json');
        res.send(texts.map(function (text) {
          return text.text;
        }));
      }
    });
  });
  
  app.get('/sessions/', function (req, res) {
    database.listSessions(function (err, sessions) {
      if (err) {
        res.status(500).send(err); 
      } else {
        res.setHeader('content-type', 'application/json');
        res.send(JSON.stringify(sessions.map((session) => {
          return {
            "id": session.sessionId,
            "started": session.started,
            "state": session.state
          }
        })));
      }
    });
  });
  
  app.delete('/sessions/:sessionId', function (req, res) {
    database.deleteSession(req.params.sessionId, function (err) {
      if (err) {
        res.status(500).send(err); 
      } else {
        res.status(204).send();
      }
    });
  });
  
  app.get('/', function (req, res) {
    res.render('pages/index', { });
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
    var time = new Date().getTime();
    
    client.setSessionId(sessionId);
    client.setSessionStatus("RECORDING");
    
    database.findSession(sessionId, function (findErr, session) {
      if (findErr) {
        console.err(findErr);
      } else {
        if (session == null) {
          database.insertSession(sessionId, time, "RECORDING", function (err) {
            if (err) {
              console.err(err);
            } else {
              console.log(util.format("Started session %s", sessionId));
            }
          });
        }
      }
    });
    
  });
  
  webSockets.on("transmit:end", function (event) {
    var client = event.client;
    var sessionId = event.sessionId;
    if (client.getSessionStatus() != 'RECORDING') {
      console.error("Session was not recording");
      return;
    }

    client.setSessionStatus("PROCESSING");
    
    console.log(util.format("Stopped receiving data for session %s", sessionId));
    
    database.updateSessionState(sessionId, "PROCESSING", function (updErr) {
      if (updErr) {
        console.err(updErr);
      } else {
        console.log(util.format("Processing clips for for session %s", sessionId));
        
        database.listSessionClips(sessionId, function (listErr, clips) {
          if (listErr) {
            console.error(listErr);
          } else {
            console.log(util.format("Sending %d clips for recognition in session %s", clips.length, sessionId));
            
            var recognizeStream = speechToText.createRecognizeStream()
              .on('error', (recognizeErr) => {
                console.error(util.format("Error %s occurred while recognizing session %s", recognizeErr, sessionId));
              })
              .on('data', (data) => {
                if (data.results) {
                  database.insertText(sessionId, data.results, function (err) {
                    if (err) {
                      console.error(err);
                    } else {
                      database.updateSessionState(sessionId, "DONE", function (stateErr) {
                        if (stateErr) {
                          console.error(stateErr);
                        } else {
                          client.setSessionStatus("DONE");
                          client.setSessionId(null);
                          console.log(util.format("Done processing session %s", sessionId));
                        }
                      });
                    }
                  });
                } else {
                  console.log("Unhandeled recognize result", data);
                }
              });
            
            for (var i = 0, l = clips.length; i < l; i++) {
              var clip = clips[i];
              recognizeStream.write(clip.data.buffer);
            }

            setTimeout(function () {
              console.log("Recognize cool down 5s");
              recognizeStream.end();
            }, 5000);
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