'use strict';

var bower = require('bower');
var path = require('path');
var debug = require('debug')('google-cdn');
var bowerUtil = module.exports;


bowerUtil.joinComponent = function joinComponent(directory, component) {
  var dirBits = directory.split(path.sep);

  // Always join the path with a forward slash, because it's used to replace the
  // path in HTML.
  return path.join(dirBits.join('/'), component).replace(/\\/g, '/');
};


function findJSMainFile(component, main) {
  if (Array.isArray(main)) {
    var js = main.filter(function (name) {
      return (/\.js$/i).test(name);
    });

    if (js.length === 1) {
      return js[0];
    }
  } else if (typeof(main) === 'string') {
    return main;
  }

  debug('Cannot determine main property');
  return component.replace(/js$/i, '') + '.js';
}

var queue = [];
var pending = 0;

bowerUtil.resolveMainPath = function resolveMain(component, version, callback) {
  if (pending > 4) {
    queue.push(resolveMain.bind(this, component, version, callback));
    return false;
  }
  pending++;

  debug('resolving main property for component %s#%s', component, version);
  bower.commands.info(component + '#' + version, 'main').on('end', function (main) {
    pending--;
    if (queue.length > 0) {
      (queue.shift())();
    }
    callback(null, bowerUtil.joinComponent(component, findJSMainFile(component, main)));
  }).on('error', function (e) {
    pending--;
    if (queue.length > 0) {
      (queue.shift())();
    }
    callback(e);
  });
};
