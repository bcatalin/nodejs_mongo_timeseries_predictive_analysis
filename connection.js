//dependencies
var MongoClient = require('mongodb').MongoClient;
var analytics = require('./analytics.js');

var db = null;
var sensorID = 1;//specify which sensor data to use

exports.dbConnect = function(url) {
	MongoClient.connect(url, function(err, data) {
		if (err != null)
			return console.error("[ERROR]: ", err.message);
		else {
			console.log("Connected to " + url);
			db = data;
			dbInit();
		}
	});
}

function dbInit() {
	/*
	 * This function resets and creates a timeseries database on Informix
	 * Here is the procedure:
	 * 1. Make sure there is no calendar with the name chosen
	 * 2. Make sure there is not a table thrmos_vti (main table that holds everything (sensor id, time, temp))
	 * 3. Make sure there is not a table thermometers (table that holds id for sensors and time&temp row type)
	 * 4. Make sure there is not a row named thermometer_reading (row type that holds timestamp and temp)
	 * 5. Create a calendar using the system.timeseries.calendar document
	 * 6. Create a row type named thermometer_reading (holds timestamp and temp)
	 * 7. Create a table named thermometers (holds which thermometer sent data and row type w time&temp)
	 * 8. Create a virtual table named thrmos_vti based off of thermometers table (seperates time&temp rowtype to their own columns)
	 */

	function dropCalendar(){
		
		db.collection("system.timeseries.calendar", function(err, coll){
			
			coll.remove({"name": "onesec"}, function(err){
				if (err){
					return console.error("Calendar drop error: ", err.message);
				}
				dropThermosvti();
			});
		});
	}
	
	function dropThermosvti(){
		
		db.dropCollection("thermos_vti", function(err){
			if (err){
				return console.error("Drop vti error: ", err.message);
			}
			dropThermometers();
		});
	}

	function dropThermometers(){
		
		db.dropCollection("thermometers", function(err){
			if (err){
				return console.error("Drop thermometers error: ", err.message);
			}
			dropThermometerReading()
			});
	}

	function dropThermometerReading(){
		
		db.collection("system.timeseries.rowType", function(err, coll){
			if (err){
				return console.error("Getting rowType error: ", err.message);
			}
			coll.remove({"name":"thermometer_reading"}, function(err){
				if (err){
					return console.error("Drop row type error: ", err.message);
				}
				createCalendar();
			});
			
		});
	}
	
	function createCalendar(){

		db.collection("system.timeseries.calendar", function(err, coll){
			
			coll.insert({"name":"onesec", 
				 "calendarStart":"2015-01-01 00:00:00",
				 "patternStart":"2015-01-01 00:00:00",
				 "pattern":{"type":"second", 
				          "intervals":[{"duration":"1","on":"true" }]}}, function(err){
				        	  if (err){
				      			return console.error("Calendar creation error: ", err.message);
				      		}
				        	  createRowType();
				          });
		});
	}

	function createRowType(){
		
		db.collection("system.timeseries.rowType", function(err, coll){
			if (err){
				return console.error("Get rowType error: ", err.message);
			}
			
			coll.insert({"name":"thermometer_reading",
				"fields":[{"name":"tstamp_gmt","type":"datetime year to fraction(5)"},
				          {"name":"celsius","type":"float"}]}, function(err){
				        	  if (err){
				      			return console.error("Create row error: ", err.message);
				      		}
				        	createTable();
				          });
		});
	}

	function createTable(){
		db.command({"create": "thermometers", "columns": [{"name": "thermometer_id", "type": "int", "primaryKey": "true", "notNull": "true"},
		                                                     {"name": "celsius_series", "type": "timeseries(thermometer_reading)"}]}, function(err){
		                                                    	 if (err){
		                                                 			return console.error("Thermometer Table creation error: ", err.message);
		                                                 		}
		                                                    	 createVirtualTable();
		                                                    	 });
	}

	function createVirtualTable(){
		
		db.command({"create": "thermos_vti", "timeseriesVirtualTable": 
		{"baseTableName": "thermometers", "newTimeseries": "calendar(onesec), origin(2014-01-01 00:00:00), " +
				"threshold(0), irregular", "timeseriesColumnName":"celsius_series"}}, function(err){
					if (err){
						return console.error("Create virtual table error: ", err.message);
					}
				});
	}
	dropCalendar();

};

/*
 * The runAnalysis variable changes how often the analytics are run. It is in reference
 * to how many times the sensor emits new data to the database. 
 * 
 * Example: runAnalysis >= 2 and the sensor uploads data every 2 seconds, the analysis will try to run every 6 seconds
 */
var runAnalysis = 0;

exports.pullData = function(socket){
	var lastReading, averageReading, recentReadings;
	var timestamp;
	var fullDataObject = {}
	console.log(" ----- PULL DATA ----- ");
	
	//get latest temperature reading
	function lastTemp(){
		db.collection("thermos_vti", function(err, coll){
			if (err){
				return console.error("Connecting to thermos_vti error: ", err.message);
			}
			coll.find({"thermometer_id": sensorID, "celsius": {"$exists": true}}).sort({"tstamp_gmt": -1}).limit(1).toArray(function(err, last){
				if (err){
					return console.error("Finding latest error: ", err.message);
				}
				timestamp = last[0].tstamp_gmt;
				timestamp.toISOString().replace(/T/, ' ').replace(/\..+/, '').trim();
				last[0].tstamp_gmt = timestamp;
				lastReading = last;
				console.log("Last Timestamp: " + timestamp);
				console.log("[DATA-PULLED] : Latest Temp -> ", last);
				averageTemp(coll);
				
			});
		});
	}
//	//get average temperature reading
	function averageTemp(coll){
		coll.aggregate([{"$match": {"thermometer_id": sensorID}}, 
		                {"$group": {"_id": "$thermometer_id", "avgcelsius": {"$avg": "celsius"}}}], function(err, avg){
			if (err){
				return console.error("Getting average error: ", err.message);
			}
			averageReading = avg[0].avgcelsius;
			console.log("[DATA-PULLED] : Average Temp -> ", averageReading);
			recentTemps(coll);
		});
	}

//	//get recent temperature readings
	function recentTemps(coll){
		coll.find({"thermometer_id": sensorID}).sort({"tstamp_gmt": -1}).limit(4).toArray(function(err, read){
			if (err){
				return console.error("Getting Recent error: ", err.message);
			}
			console.log("Recent Temps " + JSON.stringify(read));
			recentReadings = read;
			signalNewData();
		});
	}
	

//	create JSON object of data to send for analytics and display
	function signalNewData(){
			
		fullDataObject = {
			"latestTemp"	: lastReading,
			"averageTemp"	: averageReading,
			"recentTemp"	: recentReadings};
		socket.emit("updateData", fullDataObject);
		runAnalysis++;
		if (runAnalysis >= 2) {
			runAnalysis = 0;
			analytics.analyze(socket, fullDataObject);
		}
	}
	lastTemp();
}

