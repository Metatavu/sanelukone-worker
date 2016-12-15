(function() {
  'use strict';
  
  var _ = require('underscore');
  var EventEmitter = require('events');
  var util = require('util');
  var MongoClient = require('mongodb').MongoClient;
  var config = require(__dirname + '/../config.json');
  
  class Database extends EventEmitter {
    constructor () {
      super();
    }
    
    insertSession (sessionId, started, state, callback) {
      this._getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          connection.collection('sessions')
            .insert({
              sessionId: sessionId,
              started: started,
              state: state
            });
          
          callback(null);
        }
      });
    }
    
    findSession (sessionId, callback) {
      this._getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          connection.collection('sessions')
            .find({"sessionId": sessionId})
            .toArray(function(queryErr, results) {
              callback(queryErr, results && results.length ? results[0] : null);
            });
        }
      });
    }
    
    deleteSession (sessionId, callback) {
      this._getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          connection.collection('sessions')
            .remove({ "sessionId" : sessionId });
          
          connection.collection('clips')
            .remove({ "sessionId" : sessionId });
          
          connection.collection('texts')
            .remove({ "sessionId" : sessionId });
          
          callback(null);
        }
      });
    }
    
    updateSessionState (sessionId, state, callback) {
      this._getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          connection.collection('sessions')
            .update(
              { "sessionId" : sessionId }, 
              { $set: {state: state} 
            });
          
          callback(null);
        }
      });
    }
    
    insertText (sessionId, text, callback) {
      this._getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          connection.collection('texts')
            .insert({
              sessionId: sessionId,
              text: text
            });
          
          callback(null);
        }
      });
    }

    listSessionTexts (sessionId, callback) {
      this._getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          connection.collection('texts')
            .find({"sessionId": sessionId})
            .toArray(function(queryErr, results) {
              callback(queryErr, results);
            });
        }
      });
    }
    
    insertClip (sessionId, time, data, callback) {
      this._getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          connection.collection('clips')
            .insert({
              sessionId: sessionId,
              time: time,
              data: data
            });
          
          callback(null);
        }
      });
    }
    
    listSessions (callback) {
      this._getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          var options = {
            "sort": "time"
          };
          
          connection.collection('sessions')
            .find({}, options)
            .toArray(function(queryErr, results) {
              callback(queryErr, results);
            });
        }
      });
    }
    
    listSessionClips (sessionId, callback) {
      this._getConnection(function (err, connection) {
        if (err) {
          callback(err);
        } else {
          var options = {
            "sort": "time"
          };
          
          connection.collection('clips')
            .find({"sessionId": sessionId}, options)
            .toArray(function(queryErr, results) {
              callback(queryErr, results);
            });
        }
      });
    }
    
    getClipData (sessionId, callback) {
      this.listSessionClips(sessionId, function (err, clips) {
        if (err) {
          callback(err);
        } else {
          var buffers = [];
          
          for (var i = 0, l = clips.length; i < l; i++) {
            var clip = clips[i];
            buffers.push(clip.data.buffer);
          }
          
          callback(null, Buffer.concat(buffers));
        }
      });
    }
    
    _getConnection (callback) {
      MongoClient.connect(config.mongoURL, function(err, connection) {
        if (err) {
          callback(err);
        } else {
          callback(null, connection);
        }
      }.bind(this));
    }
    
  }

  module.exports = new Database();
  
}).call(this);