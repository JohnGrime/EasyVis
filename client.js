"use strict";

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

//
// Main code starts here.
//

let worlds = [];        // allow for multiple independent 3D scenes
let staticScene = true; // do we need animation loops for scenes?

//
// Use DOM to hook up renderers to "EasyVis" elements
//
{
	let elements = document.getElementsByClassName( "EasyVis" );
	for( let e of elements ) {
	let world = new World( 1, 1, window.devicePixelRatio, e );
		world.renderer.setClearColor( 0x000000, 0.3 );
		worlds.push( world );
	}
}

window.addEventListener( 'resize', resizeHandler, false );
resizeHandler();

//
// Do we need animate loop(s)?
//
if ( staticScene ) {
	for( let world of worlds ) {
		world.controls.addEventListener( 'change', () => world.Render() );
	}
}
else {
	animate();
}

//
// Fetch scene data as JSON, convert into THREE objects
//
{
	//
	// Auto-cache geometry and materials we're using for efficiency.
	//
	let cache = new MeshCache();

	//
	// Here we tag each request with a unique ID for each specific view.
	// 
	//
	for( let world_i=0; world_i<worlds.length; world_i++ ) {
		let world = worlds[world_i];
		fetch( `/scene/${world_i}` )
		.then( response => response.json() )
		.then( function(scene_data) {
			let objects = [];
			let structures = scene_data.structures;
			for( let key of Object.keys(structures) ) {
				let obj = new THREE.Object3D();
				for( let s of structures[key] ) {
					
					let type = s.type || "sphere";
					let color = s.color || 0x000000;
					let [sx,sy,sz] = s.scale || [1,1,1];
					let [x,y,z] = s.xyz || [0,0,0];

					let mesh = cache.get( {type, color, sx,sy,sz, x,y,z} );

					mesh.matrixAutoUpdate = false; // require explicit updateMatrix()
					obj.add( mesh );
				}
				obj.updateMatrix();
				objects.push( obj );
			}
			world.Rebuild( objects, createSceneLights() );
		})
		.catch( function(error) {
			console.log( `Unable to retrieve scene data for view ${world_i}` );
		})
		.then( () => world.Render() );
	}
}


function createSceneLights() {
	let light, lights = [];

	light = new THREE.AmbientLight( 0x999999 );
	lights.push( light );

	light = new THREE.DirectionalLight( 0xffffff );
	light.position.set( 0, 10, 0 );
	lights.push( light );

	return lights;
}

function animate() {
	requestAnimationFrame( animate );
	for( let world of worlds ) {
		for( let o of world.objects ) { o.rotation.y += 0.01; }
		world.Tick();
	}
	render();
}

function render() {
	for( let world of worlds ) { world.Render(); }
}

// Could chew CPU if not throttled!
function resizeHandler() {
	let container = document.getElementById( 'vis_container' );
	let w = Math.floor( container.clientWidth/worlds.length );
	let h = container.clientHeight;
	for( let world of worlds ) {
		world.Resize( w, h );
	}
};
