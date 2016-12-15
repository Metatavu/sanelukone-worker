(function() {
  'use strict';

  function loadTexts(sessionId) {
    $.ajax({
      type : "GET",
      dataType : "json",
      url : "/sessions/" + sessionId + '/texts',
      success : function(texts) {
        if (texts && texts.length) {
          var session = $('*[data-session-id="' + sessionId + '"]');
          var textContainer = session.find('.text-container');
          textContainer.find('.text').html(texts[0]);
          textContainer.show();
          session.find('.edit-session').show();
        }
      }
    });
  }

  function loadSessions() {
    $.ajax({
      type : "GET",
      dataType : "json",
      url : "/sessions",
      success : function(sessions) {
        $('.session-list').empty();
        for (var i = 0, l = sessions.length; i < l; i++) {
          var session = sessions[i];
          $('.sessions').append(sanelukonePugSession(session)); 
          loadTexts(session.id);
        }
      }
    });
  }
  
  function deleteSession(id, callback) {
    $.ajax({
      type : "DELETE",
      url : "/sessions/" + id,
      success : function() {
        callback(null);
      },
      error: function(jqXHR, status, error) {
        callback(error);
      }
    });
  }
  
  
  
  $(document).ready(function() {
    loadSessions();
    
    $(document).on('click', '.edit-session', function (event) {
      var container = $(event.target)
        .closest('.session');
      
      var text = container
        .find('.text');
     
      CKEDITOR.replace(text[0]);
    });
    
    $(document).on('click', '.trash-session', function (event) {
      var session = $(event.target)
        .closest('.session');
      var sessionId = session
        .attr('data-session-id');
      var sessionTitle = session
        .find('.title').html();
        
      $(sanelukonePugConfirmSessionDelete({
        title: sessionTitle
      })).dialog({
        resizable: false,
        height: "auto",
        width: 400,
        modal: true,
        buttons: {
          "Poista": function() {
            deleteSession(sessionId, $.proxy(function(err) {
              if (err) {
                alert(err);
              } else {
                session.remove();
                $( this ).dialog( "close" );
              }
            }, this));
          },
          "Peruuta": function() {
            $( this ).dialog( "close" );
          }
        }
      });
    });
  });

}).call(this);