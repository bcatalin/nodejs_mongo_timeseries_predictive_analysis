

# TimeSeries Predictive Analysis

##What does this sample application do?

This Node.js application provides the building blocks for analyzing sensor data to detect problems, in time to prevent them.

##How does it work?

The sensor sends readings to the Informix Database using the Mongo Node.js Driver. The application then retrieves the readings and notifies the web browser via web sockets (Socket.io). After recieving a notification from the application server, the web browser plots a realtime graph using Vis.js. Meanwhile, the application server will run analytics on the latest data and notify the user of the safety status!

##What dependencies does it use?

The application relies on Express.js, Http, Socket.io, Mongodb, and Vis.js.

##Important Files

* __public/vis.* -__ These are the files for the real-time plotting of sensor data.

* __views/monitor.html -__ This is the main client side file. It plots data to the screen and communicates with the application server about the current safety status.

* __server.js -__ This file controls the interaction between the client, analytics, and database connection. This is the file that is run to initiate the application.

* __connection.js -__ This file handles all the communication with the database. It can establish a connection, initialize a database, and pull recent data.

* __analytics.js -__ This file runs the analytics on the data.

* __sensor.js -__ This file generates fake sensor data. If a sensor is not readily available, the sensor.js file can act as a sensor with default sensorID of 1. When an actual sensor is present, specify a different sensorID (not 1) to select from in Informix. This application defaults to using the sensor.js file as the primary sensor source.

* __package.json -__ This file gives instructions on how to start the application and what dependencies are needed.

##How do I run this application?

###Option 1: Locally

Prerequisite: IBM Informix database server and the IBM Informix wire listener configured and running 

Step 1 : Install Node.js

Step 2 : Clone this project

```
  git clone <url>
``` 

Step 3 : Install external dependencies

```
  npm install
```

Step 4 : Edit connection information in the server.js file

```
	function initializeConnectionInfo(){
		// For testing locally: set the url to your JSON listener here
		url = "mongodb://localhost:27017/test";
	}
```

Step 5 : Run application

```
  node server.js
```

Step 6: View the application in your web browser at http://localhost:80

###Option 2: Bluemix

Step 1 : Clone this project

```
  git clone <url>
``` 

Step 2 : Set api and login to Bluemix

```
  cf api api.ng.bluemix.net
  cf login
```

Step 3 : Push the application to Bluemix

```
  cf push <nameOfApp>
```

Step 4 : Create and bind Time Series Service to application

```
  cf create-service timeseriesdatabase small timeseries
  cf bind-service <nameOfApp> timeseries
```

Step 5 : Restage application

```
  cf restage <nameOfApp>
```

Step 6 : View the application at nameOfApp.mybluemix.net
