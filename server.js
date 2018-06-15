"use strict";

const fs = require( "fs" );
const express = require( "express" );
const compression = require( "compression" );
const bodyParser = require( "body-parser" );
const helmet = require( "helmet" );

//
// Spiral method using the "golden ratio" to generate points on a sphere surface:
// http://web.archive.org/web/20120421191837/http://www.cgafaq.info/wiki/Evenly_distributed_points_on_sphere
//
function getUnitSpherePoints( target_N ) {
	const dl = Math.PI * (3.0-Math.sqrt(5.0));
	const dz = 2.0 / target_N;
	
	let l = 0.0;
	let z = 1.0 - dz/2;

	let triplet_vec = [];
	for( let i=0; i<target_N; i++ ) {
		const r = Math.sqrt( 1.0-z*z );
		const x = Math.cos( l ) * r;
		const y = Math.sin( l ) * r;

		triplet_vec.push( [x,y,z] );

		z -= dz;
		l += dl;
	}
	return triplet_vec;
}

//
// Create a simple scene for testing.
//
function generateScene( target_N ) {
	const colors = [ 0xff0000, 0x00ff00, 0x0000ff ];
	let scene = { structures: {} };

	//
	// Axes indicator
	//
	{
		let r = 1.0, delta = 2.0;

		let structure = [];
		structure.push( { type:"cuboid", color:0xffffff, scale:[2,2,2], xyz:[0,0,0] } );
		for( let axis=0; axis<3; axis++ ) {
			for( let i=0; i<2; i++ ) {
				let x = (axis==0) ? ((1+i)*delta) : (0);
				let y = (axis==1) ? ((1+i)*delta) : (0);
				let z = (axis==2) ? ((1+i)*delta) : (0);
				structure.push( { type:"sphere", color:colors[axis], scale:[r,r,r], xyz:[x,y,z] } );
			}
		}
		scene.structures.axes = structure;
	}

	//
	// Bounding sphere of specified point density
	//
	{
		let r = 0.2, outer_r = 10.0;
		let triplet_vec = getUnitSpherePoints( target_N );
		
		let structure = [];
		for( let [x,y,z] of triplet_vec ) {
			structure.push( {
				type:"sphere",
				color:0xffffff,
				scale:[r,r,r],
				xyz:[x*outer_r,y*outer_r,z*outer_r] } );
		}
		scene.structures.boundary = structure;
	}

	return scene;
}

//
// Basic system configuration
//
let config = {
	port: 3000,
	Lx: 200,
	Ly: 0,
	Lz: 200,
	mainPage: "Main page not set up",
	compression: true,
};

//
// Route handlers
//
let route_handlers = {

	options: function(req,res) {
		res.setHeader( "Access-Control-Allow-Methods", "GET,OPTIONS" );
		res.end();
	},

	getMainPage: function(req,res) {
		res.setHeader( "content-type", "text/html" );
		res.end( config.mainPage );		
	},

	// Return basic test data for scene
	getSceneData(req,res) {
		let ID = req.params.N;
		let scene_data = generateScene( ((ID*ID)+1)*50 );

		res.setHeader( "content-type", "application/json" );
		res.end( JSON.stringify(scene_data) );
	},

	getDefault: function(req,res) {
		res.status( 404 );
		res.end( "Missing!" );
	},

};

//
// Main script starts here.
//

//
// Check arguments, load main page data (only for test purposes;
// should really be handled by actual webserver, e.g. NGINX).
//
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
	//
	// Handle application/json input, along with urlencoded; only
	// allow the latter to use simple values in the key/val pairs!
	// Also enable Helmet for some additional security.
	//
	app.use( bodyParser.json() );
	app.use( bodyParser.urlencoded({extended:false}) );
	app.use( helmet() );

	// Should be disabled by Helmet, but make sure!
	app.disable('x-powered-by');

	// Prevent client caching; not included in helmet?
	app.use( (req,res,next) => {
		res.setHeader( "Cache-Control", "no-cache,no-store,max-age=0,must-revalidate,proxy-revalidate" );
		res.setHeader( "Pragma", "no-cache" );
		res.setHeader( "Expires", "-1" );

		next();
	});

	//
	// Enable compression. May remove some pressure on internal networks, external
	// traffic assumed to be compressed as standard by any reverse proxy setup.
	//
	if( config["compression"] !== undefined && config["compression"] === true ) {
		console.log( "Using compression." );
		app.use( compression() );
	}

	//
	// Internal paths for serving static files; again, this should really be handled
	// by a downstream reverse proxy (e.g. nginx), but were only testing here.
	//
	{
		let base_files = express.static( __dirname );
		app.use( "/", base_files );
	}

	//
	// Debug! rint some incoming connection information.
	//
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

	// Customized scene for each view ID for testing purposes
	app.get( "/scene/:N", route_handlers.getSceneData );

	// Default path - must go last!
	app.get( "*", route_handlers.getDefault );
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
