// Server Initiation
var express = require('express');
var app = express();
var http = require('http') ;
var server = http.createServer(app).listen(3310, function() {
  console.log('[+] Set [http] protocol and server running at port #3310');
});

var proto_webRTC = require('./webrtcjs/proto.webrtc.io').listen(server);

// Handle resource request by server
app.get('/', function(req, res) {
  res.sendfile(__dirname + '/proto.index.html');
});

app.get('/proto.index.html', function(req, res) {
  res.sendfile(__dirname + '/proto.index.html');
});

app.get('/video-calling-interface.html', function(req, res) {
  res.sendfile(__dirname + '/video-calling-interface.html');
});

app.get('/webrtcjs/main.js', function(req, res) {
  res.sendfile(__dirname + '/webrtcjs/main.js');
});

app.get('/webrtcjs/webrtc.io.js', function(req, res) {
  res.sendfile(__dirname + '/webrtcjs/webrtc.io.js');
});

app.get('/js/omlet.js', function(req, res) {
  res.sendfile(__dirname + '/js/omlet.js');
});

app.use(express.static('.'));