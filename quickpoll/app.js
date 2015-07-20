/*
 * Example - app.js
*/
var fs = require('fs');
var express = require('express');
var app = express();
var http = require('http');

app.use('/js', express.static(__dirname + "/js"));
app.use('/css', express.static(__dirname + "/css"));
app.use('/images', express.static(__dirname + "/images"));

var server = http.createServer(app).listen(3310, function() {
	console.log('Sever running port#3310.');
});

// index.html routing
app.get('/', function(req, res){
	fs.readFile('index.html', function(error, data){
		res.writeHead(200, { 'Content-Type':'text/html' });
		res.end(data);
	});
});
