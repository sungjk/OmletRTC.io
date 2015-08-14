// Server Initiation

var express = require('express');
var app = express();
var http = require('http') ;
var server = http.createServer(app).listen(3310, function() {
  console.log('[+] Set [http] protocol and server running at port #3310');
});

var webRTC = require('./webrtcjs/omletrtc').listen(server);

// Handle resource request by server
app.get('/', function(req, res) {
  res.sendfile(__dirname + '/proto.index.html');
});

app.get('/css/proto.style.css', function(req, res) {
  res.sendfile(__dirname + '/css/proto.style.css');
});

app.get('/webrtcjs/main.js', function(req, res) {
  res.sendfile(__dirname + '/webrtcjs/main.js');
});

app.get('/webrtcjs/omletrtc.js', function(req, res) {
  res.sendfile(__dirname + '/webrtcjs/omletrtc.js');
});

app.get('/js/omlet.js', function(req, res) {
  res.sendfile(__dirname + '/js/omlet.js');
});

app.use(express.static('.'));