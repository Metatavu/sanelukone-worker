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
            
            console.log(clip.data.buffer.byteLength);
          }
          
          var buffers = Buffer.concat(buffers);
          
          console.log(buffers.byteLength);
          
          
          callback(null, buffers);
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