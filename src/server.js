//Server Initiation
var express = require('express');
var fs = require('fs');
var app = express() ;
var config = require('./js/config');
var omletrtc = require('./js/omletrtc');
var server;

if ( config.ws.secured ) { // HTTPS Setup
	var https = require('https');
	var options = {
		key: fs.readFileSync('./server.key').toString(),
		cert: fs.readFileSync('./server.crt').toString()
	};
	var securePort = process.env.OPENSHIFT_NODEJS_PORT || config.ws.securePort;
	server = https.createServer(options,app).listen(securePort, function() {
		console.log('[+] Set [https] protocol and server running at port #' + port);
	});
} else { //HTTP Setup
	var http = require('http') ;
	var port = process.env.OPENSHIFT_NODEJS_PORT  || config.ws.port;
	var ip = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
	
	server = http.createServer(app).listen(port, function() {
		console.log('[+] Set [http] protocol and server running at port #' + port);
	});
}

app.get('/',function(req,res){
	res.sendFile(__dirname + '/edit-index.html');
});

app.get('/index.html', function(req,res){
	res.sendFile(__dirname + '/index.html');
});

app.get('/edit-index.html', function(req,res){
	res.sendFile(__dirname + '/edit-index.html');
});

app.get('/js/omletrtc.js', function(req,res){
	res.sendFile(__dirname + '/js/omletrtc.js');
});

app.get('/js/script.js', function(req,res){
	res.sendFile(__dirname + '/js/script.js');
});

app.get('/js/main.js', function(req,res){
	res.sendFile(__dirname + '/js/main.js');
});

app.get('/js/adapter.js', function(req,res){
	res.sendFile(__dirname + '/js/adapter.js');
});

app.get('/css/style.css', function(req,res){
	res.sendFile(__dirname + '/css/style.css');
});

app.get('/css/iphone.css', function(req,res){
	res.sendFile(__dirname + '/css/iphone.css');
});

app.get('/css/android_phone.css', function(req,res){
	res.sendFile(__dirname + '/css/android_phone.css');
});

app.get('/css/main_style.css', function(req,res){
	res.sendFile(__dirname + '/css/main_style.css');
});

app.get('/iamges/*', function(req,res){
   res.sendFile(__dirname + '/images/*');
});

app.use(express.static('.'));
