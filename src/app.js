// Server Initiation
var express = require('express');
var app = express();
var config = require('./js/config');

var http = require('http') ;
var port = config.ws.port;

var server = http.createServer(app).listen(port, function() {
  console.log('[+] Set [http] protocol and server running at port #' + port);
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