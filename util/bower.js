'use strict';

var path = require('path');
var spawn = require('child_process').spawn;
var debug = require('debug')('google-cdn');
var bowerUtil = module.exports;
var which = require('which').sync;


bowerUtil.joinComponent = function joinComponent(directory, component) {
  var dirBits = directory.split(path.sep);

  // Always join the path with a forward slash, because it's used to replace the
  // path in HTML.
  return path.join(dirBits.join('/'), component).replace(/\\/g, '/');
};


function findJSMainFile(componentData) {
  var main = componentData.main;
  if (Array.isArray(main)) {
    var js = main.filter(function (name) {
      return (/\.js$/i).test(name);
    });

    if (js.length === 1) {
      return js[0];
    }
  }

  debug('Cannot determine main property');
  return componentData.name.replace(/js$/i, '') + '.js';
}

var queue = [];
var pending = 0;

bowerUtil.resolveMainPath = function resolveMain(component, version, callback) {
  if (pending > 4) {
    queue.push(resolveMain.bind(this, component, version, callback));
    return false;
  }
  pending++;
  var args = ['node_modules/bower/bin/bower', 'info', '--json', component + '#' + version];
  var output = '';
  debug('resolving main property for component %s#%s', component, version);
  var ps = spawn(which('node'), args, {
    stdio: ['ignore', 'pipe', 'ignore']
  });

  ps.stdout.on('data', function (data) {
    output += data;
  });

  ps.on('close', function (code) {
    debug('bower exited with status code %d', code);
    pending--;
    if (queue.length > 0) {
      (queue.shift())();
    }
    if (code !== 0) {
      return callback(new Error('bower exited non-zero with ' + code));
    }

    var data = JSON.parse(output);
    var main = findJSMainFile(data);
    callback(null, data.name + '/' + main);
  });
};
