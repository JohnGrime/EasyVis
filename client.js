"use strict";

function structureToTHREEObject( structure ) {

};

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

//
// Main code starts here.
//

let worlds = [];        // allow for multiple independent 3D scenes
let staticScene = true; // do we need animation loops for scenes?

//
// Use DOM to set up scenes in "vis" elements
//
{
	let elements = document.getElementsByClassName( "EasyVis" );
	for( let e of elements ) {
	let world = new World( 1, 1, window.devicePixelRatio, e );
		world.renderer.setClearColor( 0x000000, 0.25 );
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

let scene_data = {
	"structures": {},
};

//
// Set up scene objects
//
{
	let colors = [ 0xff0000, 0x00ff00, 0x0000ff ];

	//
	// Axes
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
		scene_data.structures.axes = structure;
	}

	//
	// Bounding sphere
	//
	{
		let r = 0.2, outer_r = 10.0;
		let triplet_vec = getUnitSpherePoints( 100 );
		
		let structure = [];
		for( let [x,y,z] of triplet_vec ) {
			structure.push( {
				type:"sphere",
				color:0xffffff,
				scale:[r,r,r],
				xyz:[x*outer_r,y*outer_r,z*outer_r] } );
		}
		scene_data.structures.boundary = structure;
	}
}

//
// Process scene data: convert into THREE objects
//
{
	//
	// Auto-cache geometry and materials we're using for efficiency.
	//
	let cache = new MeshCache();

	let structures = scene_data.structures;

	for( let world of worlds ) {
		let scene_objects = [];

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
			scene_objects.push( obj );
		}

		world.Rebuild( scene_objects, createSceneLights() );
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
