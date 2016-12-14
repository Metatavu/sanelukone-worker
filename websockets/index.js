(function() {
  'use strict';
  
  var _ = require('underscore');
  var EventEmitter = require('events');
  var util = require('util');
  var WebSocketServer = require('websocket').server;
  
  class Client extends EventEmitter {
    constructor (connection) {
      super();
    
      this.connection = connection;
      this.sessionId = null;
    
      connection.on('message', function (message) {
        this._onConnectionMessage(connection, message);
      }.bind(this));
      
      connection.on('close', function (reasonCode, description) {
        this._onConnectionClose(connection, reasonCode, description);
      }.bind(this));
    }
    
    getSessionId () {
      return this.sessionId;
    }
    
    setSessionId (sessionId) {
      this.sessionId = sessionId;
    }
    
    sendMessage (type, data) {
      this._sendMessage(this.connection, JSON.stringify({
        type: type,
        data: data
      }));
    } 
    
    _sendMessage (connection, message) {
      connection.sendUTF(message);
    }
    
    _sendBinary (connection, binaryData) {
      connection.sendBytes(binaryData);
    }
    
    _onConnectionMessage (connection, message) {
      switch (message.type) {
        case 'utf8':
          var message = JSON.parse(message.utf8Data);
          this.emit("message", {
            sessionId: this.sessionId,
            type: message.type, 
            data: message.data
          });
        break;
        case 'binary':
          this.emit("clip", {
            sessionId: this.sessionId,
            data: message.binaryData
          });
        break;
      }
    }
    
    _onConnectionClose (connection, reasonCode, description) {
      this.emit("close", {
        sessionId: this.sessionId
      });
    }
  }
    
  class WebSockets extends EventEmitter {
  
    constructor (httpServer) {
      super();
    
      this._server = new WebSocketServer({
        httpServer: httpServer
      });
      
      this._server.on("connection", this._onServerConnection.bind(this));
      this._server.on("request", this._onServerRequest.bind(this));
    }
    
    _onServerConnection (webSocket) {
      var url = webSocket.upgradeReq.url;
    }
    
    _onServerRequest (request) {
      var connection = request.accept();
      var client = new Client(connection);

      client.on("message", function (message) {
        this.emit(message.type, _.extend(message.data, {
          client: client
        }));
      }.bind(this));

      client.on("clip", function (data) {
        this.emit('clip', {
          client: client,
          data: data.data
        });
      }.bind(this));

      client.on("close", function () {
        // client left
      });
    }
  
  };
  
  module.exports = WebSockets;
  
}).call(this);