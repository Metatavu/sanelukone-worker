(function() {
  'use strict';
  
  var _ = require('underscore');
  var EventEmitter = require('events');
  var util = require('util');
  var stream = require('stream');
  var config = require(__dirname + '/../config.json');

  const WavDecoder = require("wav-decoder");
  const WavEncoder = require("wav-encoder");
  
  class Wave extends EventEmitter {
    constructor () {
      super();
    }
    
    rawClips (clips, callback) {
      var decodePromises = [];
      
      for (var i = 0, l = clips.length; i < l; i++) {
        if (clips[i].data.buffer.byteLength || clips[i].data.buffer.length) {
          decodePromises.push(WavDecoder.decode(clips[i].data.buffer));  
        }
      }
      
      Promise.all(decodePromises)
        .then((audioDatas) => {
          callback(null, audioDatas.map((audioData) => {
            return audioData.channelData[0];
          }));
        })
        .catch((error) => {
          callback(error);
        });
    }
    
    mergeClipsWave (clips, callback) {
      var decodePromises = [];
      
      for (var i = 0, l = clips.length; i < l; i++) {
        if (clips[i].data.buffer.byteLength) {
          decodePromises.push(WavDecoder.decode(clips[i].data.buffer));  
        }
      }
      
      Promise.all(decodePromises)
        .then((audioDatas) => {
          var channelDatas = this.mergeChannelDatas(audioDatas.map((audioData) => {
            return audioData.channelData[0];
          }));
        
          var data = {
            sampleRate: 16000,
            channelData: [ channelDatas ]
          }
          
          WavEncoder.encode(data)
            .then((buffer) => {
              callback(null, new Buffer(buffer, 'binary'));
            })
            .catch((error) => {
              callback(error);
            });
       })
       .catch((error) => {
         callback(error);
       });
    }
    
    mergeClipsRaw (clips, callback) {
      var decodePromises = [];
      
      for (var i = 0, l = clips.length; i < l; i++) {
        if (clips[i].data.buffer.byteLength) {
          decodePromises.push(WavDecoder.decode(clips[i].data.buffer));  
        }
      }
      
      Promise.all(decodePromises)
        .then((audioDatas) => {
          var channelDatas = this.mergeChannelDatas(audioDatas.map((audioData) => {
            return audioData.channelData[0];
          }));
        
          callback(null, channelDatas);
       })
       .catch((error) => {
         callback(error);
       });
    }

    mergeChannelDatas (channelDatas) {
      var resultLength = 0;
      for (var i = 0, l = channelDatas.length; i < l; i++) {
        resultLength += channelDatas[i].length;
      }

      var result = new Float32Array(resultLength);
  
      var offset = 0;
      for (var i = 0, l = channelDatas.length; i < l; i++) {
        var channelData = channelDatas[i];
        result.set(channelData, offset);
        console.log(offset, channelData.buffer.byteLength);
        
        offset += channelData.length;
      }
      
      return result;
    }
  }

  module.exports = new Wave();
  
}).call(this);