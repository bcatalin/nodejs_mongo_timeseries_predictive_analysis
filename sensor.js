/*
 * This file simulates a sensor by creating data and uploading to a database via its own connection.
 * The data created by this fake sensor is not accessed locally by any other file.
 * It instead uses the database as a median between the data and the analytics.
 */

//dependencies
var MongoClient = require('mongodb').MongoClient;
var collection= null;
var timer = null;
var sensorUploadSpeed = 2000; //how often the sensor will upload data in milliseconds
var tempToSend = 2; // start at 2 celsius (apprx. 36F)
var quadraticCounter = 1;
var sensorID = 1; //specify the id of the sensor

exports.generateFakeData = function(url, socket, delta) {
	//called every time a button is pressed
	MongoClient.connect(url, function(err, db){
			if (err){
				return console.error("[ERROR]: ", err.message);
			}
			else {
				console.log("Sensor connected to " + url);
				collection = db.collection('thermos_vti');
		
			if (timer != null) {
				clearInterval(timer);
			}
			
			quadraticCounter = 1; //increase this each time to make slope not linear
			
			timer = setInterval(function() {
				
				tempToSend = delta*quadraticCounter + tempToSend;
				quadraticCounter = quadraticCounter + .25;
				
				var timestamp =  new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').trim(); //get a timestamp in GMT time with the format that Informix accepts
				console.log(" ----- SENSOR DATA ----- ");
				console.log("Timestamp : ", timestamp);
				console.log("Temperature Reading : ", tempToSend);
				console.log("Delta : " + delta + ", quadraticCounter : " + quadraticCounter);
				console.log("<------------------------>");
				
				collection.insert({"thermometer_id": sensorID, "tstamp_gmt": timestamp, "celsius": tempToSend}, function(err){
					if (err){
						return console.error("Sensor Insertion error: ", err.message);
					}
					console.log("Sucessful insert!");
					socket.emit('newData');
				});
				
			}, sensorUploadSpeed);
		}
	});
}