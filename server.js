//dependencies
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var connection = require('./connection.js');
var sensor = require('./sensor.js');


//connection information
var port = process.env.VCAP_APP_PORT || 80;
var url = "";

function initializeConnectionInfo(){
	// For testing locally: set the url to your JSON listener here
	//url = "mongodb://localhost:27017/test";

	// For deploying on Bluemix, use this code to parse the VCAP_SERVICES for TimeSeriesDB
	var vcap_services = JSON.parse(process.env.VCAP_SERVICES);
	var credentials = vcap_services['timeseriesdatabase'][0].credentials;
	url = credentials.json_url
}
app.use(express.static(__dirname + '/public'));

io.sockets.on('connection', function(socket){
	
	socket.on('raiseTemp', function() {
		sensor.generateFakeData(url, socket, .125);
	});
	
	socket.on('holdTemp', function() {
		sensor.generateFakeData(url, socket, 0);
	});
	
	socket.on('lowerTemp', function() {
		sensor.generateFakeData(url, socket, -.125);
	});
	
	socket.on('getData', function(){
		connection.pullData(socket);
	});
	
	socket.on('analytics', function(latestDataFromSensor) {
		analytics.analyze(socket, latestDataFromSensor);
	});
});


app.get('/simulation', function(req, res) {
	res.sendFile(__dirname + '/views/monitor.html');
	console.log("Starting Simulation ...");
});

app.get('/', function(req, res) {
	initializeConnectionInfo();
	connection.dbConnect(url);
	res.sendFile(__dirname + '/views/index.html');
});

server.listen(port,  function() {
	console.log("Server starting on " + port);
});