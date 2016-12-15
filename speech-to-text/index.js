(function() {
  'use strict';

  var config = require(__dirname + '/../config.json');
  
  var fs = require('fs');
  var _ = require('underscore');
  var EventEmitter = require('events');
  var util = require('util');
  var stream = require('stream');
  var Speech = require('@google-cloud/speech');

  class SpeechToText extends EventEmitter {
    constructor () {
      super();
    }
    
    createRecognizeStream () {
      const speech = Speech({
        projectId: config.projectId,
        keyFilename: config.keyFile
      });
      
      const recognizeStream = speech.createRecognizeStream({
        config: {
          encoding: 'LINEAR16',
          sampleRate: 16000,
          languageCode: 'fi-FI'
        },
        interimResults: false
      });
      
      return recognizeStream;
    }
    
  }

  module.exports = new SpeechToText();
  
}).call(this);