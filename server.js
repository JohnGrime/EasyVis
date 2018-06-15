/*
Connect via web browser, e.g.:

REST-y stuff:

curl -v -X POST -H "Content-Type: application/json" -d '{"N": 9}' localhost:3000
curl -v -X PUT  -H "Content-Type: application/json" -d '{"type":0,"x":0,"y":1,"z":2}' localhost:3000/0
curl -v localhost:3000/0



 curl -v -X POST -H "Content-Type: application/json" -d '{"N": 9}' localhost:3000 => generate 9 particle system

curl -v localhost:3000/0/xyz => get coords of particle at index 0

curl -v -X PUT -H "Content-Type: application/json" -d '{"x":0,"y":0,"z":0}' localhost:3000/0/xyz => set coords of particle at index 0

*/

"use strict";

const fs = require( "fs" );
const express = require( "express" );
const compression = require( "compression" );
const bodyParser = require( "body-parser" );
const helmet = require( "helmet" );

//
// A microstate describes the current system.
//
class Microstate {

	constructor( { Lx = 10, Ly = 10, Lz = 10 } ) {
		this.setBounds( {Lx,Ly,Lz} );
		this.types = [];
		this.xyz = [];
	}

	setBounds( { Lx = 10, Ly = 10, Lz = 10 } ) {		
		this.Lx = Lx;
		this.Ly = Ly;
		this.Lz = Lz;
	}

	addParticle( { type=0, x=0, y=0, z=0 } ) {
		this.types.push( type );
		this.xyz.push( [x,y,z] );
	}

	getParticle( index ) {
		if( index<0 || index>=this.xyz.length ) {
			console.log( "Bad index : ", index );
			return undefined;
		}
		return { types:[this.types[index]], xyz:[this.xyz[index]] };
	}

	setParticle( { index, type=0, x=0, y=0, z=0 } ) {
		if( index<0 || index>=this.xyz.length ) {
			console.log( "Bad index : ", index );
			return undefined;
		}
		this.types[index] = type;
		this.xyz[index] = [x,y,z];
		return { types:[this.types[index]], xyz:[this.xyz[index]] };
	}

	deleteParticle( index ) {
		if( index<0 || index>=this.xyz.length ) {
			console.log( "Bad index : ", index );
			return undefined;
		}
		this.types.splice( index, 1 );
		this.xyz.splice( index, 1 );
		return { types:this.types, xyz:this.xyz };
	}
}


let config = {
	port: 3000,
	Lx: 200,
	Ly: 0,
	Lz: 200,
	mainPage: "Main page not set up",
	compression: true,
};

let microstate = new Microstate( { Lx: config.Lx, Ly: config.Ly, Lz: config.Lz } );

//
// Route handlers
//

let route_handlers = {

	options: function(req,res) {
		res.setHeader( "Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS" );
		res.end();
	},

	post: function(req,res) {
		let N = req.body.N;

		if( (!N) || (N<1) || (N>10) ) {
			console.log( "Bad N: ", N );
			res.status( 400 );
			res.end( "Number of new entities (N) is incoorectly specified" );
			return;
		}

		for( let i=0; i<N; i++ ) {
			let x = (Math.random()-0.5) * microstate.Lx;
			let y = (Math.random()-0.5) * microstate.Ly;
			let z = (Math.random()-0.5) * microstate.Lz;
			microstate.addParticle( {type:0,x,y,z} );
		}
		const {types,xyz} = microstate;
		res.end( JSON.stringify( {types,xyz} ) );
	},

	getMainPage: function(req,res) {
		res.setHeader( "content-type", "text/html" );
		res.end( config.mainPage );		
	},

	getSingle: function(req,res) {
		let index = req.params.index;
		let result = microstate.getParticle(index);
		if( ! result ) {
			res.status( 416 );
			res.end( "Element index is invalid" );
			return;			
		}
		res.end( JSON.stringify(result) );
	},

	putSingle: function(req,res) {
		let index = req.params.index;
		let {type,x,y,z} = req.body;
		if( ! microstate.setParticle( {index,type,x,y,z} ) ) {
			res.status( 416 );
			res.end( "Element index is invalid" );
			return;
		}
		res.end();
	},

	deleteSingle: function(req,res) {
		let index = req.params.index;
		if( ! microstate.deleteParticle(index) ) {
			res.status( 416 );
			res.end( "Element index is invalid" );
			return;
		}
		res.end();
	},

	getDefault: function(req,res) {
		res.status( 404 );
		res.end( "Missing!" );
	},

};

//
// Main script starts here.
//

// Check arguments, load main page data (debug; should really be handled by e.g. nginx)
{
	const argv = process.argv;

	function loadLocalFile( path, flags ) {
		try {
			return fs.readFileSync( path, flags );
		}
		catch( error ) {
			console.log( "Error: " + error );
			process.exit( -1 );
		};
	};

	if( argv.length < 3 ) {
		console.log( "Usage: node " + argv[1] + " <main html file>" );
		process.exit( -1 );
	}

	config.mainPage = loadLocalFile( argv[2], "utf8" );
}


//
// Basic server app setup.
//

let app = express();
{
	// Handle application/json input, along with urlencoded; only
	// allow the latter to use simple values in the key/val pairs!
	app.use( bodyParser.json() );
	app.use( bodyParser.urlencoded({extended:false}) );

	// If not using helmet, at least disable x-powered-by header.
	// https://expressjs.com/en/advanced/best-practice-security.html
	if( false ) {
		app.disable('x-powered-by');
	}
	else {
		app.use( helmet() );
	}

	// Prevent client caching; not included in helmet?
	app.use( (req,res,next) => {
		res.setHeader( "Cache-Control",
			"no-cache,no-store,max-age=0,must-revalidate,proxy-revalidate" );
		res.setHeader( "Pragma", "no-cache" );
		res.setHeader( "Expires", "-1" );

		next();
	});

	// Enable compression. Could relieve pressure on internal networks, external
	// ssumed to be compressed as standard by any reverse proxy setup.
	if( config["compression"] !== undefined && config["compression"] === true ) {
		console.log( "Using compression." );
		app.use( compression() );
	}

	// Internal paths for serving static files; again, this should really be handled
	// by a downstream reverse proxy (e.g. nginx).
	{
		let base_files = express.static( __dirname );
		app.use( "/", base_files );
	}

	// Debug!
	app.use( (req,res,next) => {
		
		// Return string description for connection information
		function getConnectionInfo( connection ) {
			let { port, family, address } = connection.address();
			return `${address}:${port} < ${connection.remoteAddress} [${family}]`;
		};

		console.log( "" );
		console.log( "Incoming ", req.method, ":", req.originalUrl, getConnectionInfo(req.connection) );
		console.log( "-Headers:", req.headers );
		console.log( "-Body:", req.body );

		next();
	});
}

//
// Routing
//

{
	//
	// OPTIONS
	//

	app.options( "/*", route_handlers.options );

	//
	// GET: retrieve existing data
	//

	// Main page
	app.get( "/", route_handlers.getMainPage );

	// Get xyz triplet for specified index
	app.get( "/:index", route_handlers.getSingle );

	// Default path - must go last!
	app.get( "*", route_handlers.getDefault );

	//
	// PUT: modify existing data
	//

	app.put( "/:index", route_handlers.putSingle );

	//
	// POST: create new data (see e.g. HTTP/1.1 spec)
	//

	app.post( "/", route_handlers.post );

	//
	// DELETE: remove existing data
	//
	app.delete( "/:index", route_handlers.deleteSingle );
}

//
// Launch server
//

let server = app.listen( config.port, function() {
	const {addr,port} = server.address();
	console.log( "Server: http://[%s]:[%s]", addr, port );
});


//
// Handle some signals more gracefully, in case we're e.g. running
// in a Docker container as pid 1
//
{
	let signal_handler = function( signal ) {
		console.log( 'Server received signal: ' + signal );
		process.exit( -1 );
	};

	process.on( 'SIGINT',  signal_handler );
	process.on( 'SIGTERM', signal_handler );
}
