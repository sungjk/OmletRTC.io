// Server Initiation
var express = require('express');
var app = express();
var config = require('../js/config');

if ( config.ws.secured ) { // HTTPS Setup
  var https = require('https');
  var options = {
    key: fs.readFileSync('./server.key').toString(),
    cert: fs.readFileSync('./server.crt').toString()
  };
  var securePort = process.env.OPENSHIFT_NODEJS_PORT || config.ws.securePort;

  var server = https.createServer(options,app).listen(securePort, function() {
    console.log('[+] Set [https] protocol and server running at port #' + port);
  });
} 
else { //HTTP Setup
  var http = require('http') ;
  var port = process.env.OPENSHIFT_NODEJS_PORT  || config.ws.port;
  var ip = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";

  var server = http.createServer(app).listen(port, function() {
    console.log('[+] Set [http] protocol and server running at port #' + port);
  });
}

var webRTC = require('webrtc.io').listen(server);



// Handle resource request by server
app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.get('/webrtc/main.js', function(req, res) {
  res.sendfile(__dirname + '/webrtc/main.js');
});

app.get('/webrtc/webrtc.js', function(req, res) {
  res.sendfile(__dirname + '/webrtc/webrtc.js');
});

webRTC.rtc.on('chat_msg', function(data, socket) {
  var roomList = webRTC.rtc.rooms[data.room] || [];

  for (var i = 0; i < roomList.length; i++) {
    var socketId = roomList[i];

    if (socketId !== socket.id) {
      var soc = webRTC.rtc.getSocket(socketId);

      if (soc) {
        soc.send(JSON.stringify({
          "eventName": "receive_chat_msg",
          "data": {
            "messages": data.messages,
            "color": data.color
          }
        }), function(error) {
          if (error) {
            console.log(error);
          }
        });
      }
    }
  }
});

app.use(express.static('.'));