/*global module:false*/

var fs = require('fs');
var pug = require('pug');

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);
  
  const PUG_TEMPLATE = __dirname + '/public/js/pug-templates.js';

  grunt.registerMultiTask('compile-template', 'Compiles pug templates', function () {
    var clientTemplates = fs.readdirSync(this.data.sourceFolder);
    var compiledClientTemplates = [];
    for (var i = 0; i < clientTemplates.length; i++) {
      var templateName = clientTemplates[i].replace('.pug', '');
      templateName = 'sanelukonePug' + templateName[0].toUpperCase() + templateName.substring(1);
      compiledClientTemplates.push(pug.compileFileClient(
        this.data.sourceFolder + clientTemplates[i],
        { name: templateName, compileDebug: false }
      ));
    }
    fs.writeFileSync(this.data.destFile, compiledClientTemplates.join(''));
  });

  grunt.initConfig({
    'compile-template': {
      'compile-pug-template': {
        'sourceFolder': __dirname + '/client-templates/',
        'destFile': PUG_TEMPLATE,
      }
    },
    uglify: {
      'uglify-pug-source': {
        files: {
          'public/js/pug-templates.min.js': [PUG_TEMPLATE]
        }
      }
    }
  });

  grunt.registerTask('default', ['compile-template:compile-pug-template', 'uglify:uglify-pug-source']);
};