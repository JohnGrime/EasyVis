"use strict";

//
// Simple wrapper for WebGL functionality via three.js
//
class World {
	constructor( width, height, pixelRatio, canvas ) {
		this.renderer = new THREE.WebGLRenderer( { alpha: true, antialias: true, canvas: canvas } );
			this.renderer.setPixelRatio( pixelRatio );
			this.renderer.setSize( width, height );
			this.renderer.setClearColor( 0x000000, 0 );

		this.camera = new THREE.PerspectiveCamera( 60, width/height, 1, 1000 );
			this.camera.position.set( 15, 15, 15 );

		this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
			this.controls.enableDamping = true; // animation loop required if damping or auto-rotation used
			this.controls.dampingFactor = 0.25;
			this.controls.screenSpacePanning = false;
			this.controls.minDistance = 10;
			this.controls.maxDistance = 500
			this.controls.maxPolarAngle = Math.PI;

		this.scene = new THREE.Scene();
		this.objects = [];
		this.lights = [];
	}

	Rebuild( objects, lights ) {
		for( let object of this.scene.children ) {
			if ( object.geometry ) object.geometry.dispose();
			if ( object.material ) object.material.dispose();
			if ( object.texture )  object.texture.dispose();
			if ( object.mesh )     object.mesh.dispose();
			if ( object.dispose )  object.dispose();
			this.scene.remove(object);
		}

		this.objects = objects;
		this.lights = lights;

		this.scene = new THREE.Scene();
		for ( let o of this.objects ) { this.scene.add( o ); }
		for ( let l of this.lights )  { this.scene.add( l ); }

		this.Render();
	}

	Resize( width, height ) {
		this.camera.aspect = width/height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize( width, height );
		this.Render();
	}

	Render() {
		this.renderer.render( this.scene, this.camera );
	}

	Tick() {
		// Handle some implementation details as part of an animation loop	
		for( let o of this.objects ) {
			if( !o.matrixAutoUpdate ) o.updateMatrix();
		}

		if ( this.controls && (this.controls.enableDamping||this.controls.autoRotate) ) {
			this.controls.update(); // only if controls.enableDamping|autoRotate
		}
	}
}



//
// Caches materials and geometries. Returns mesh objects.
//
class MeshCache {

	constructor() {
		this.materials = {};
		this.geometries = {
			'sphere': new THREE.SphereBufferGeometry(1,10,10),
			'cuboid': new THREE.BoxBufferGeometry( 1, 1, 1 ),
		}
	}

	get( {type, color, sx=1, sy=1, sz=1, x=0, y=0, z=0} ) {

		type = type || "sphere";
		color = color || 0xffffff;
		sx = sx || 1.0;
		sy = sy || 1.0;
		sz = sz || 1.0;
		x = x || 0;
		y = y || 0;
		z = z || 0;

		if( !(color in this.materials) ) {
				let m = new THREE.MeshPhongMaterial( {color} );
				this.materials[color] = m;
		}

		let mat = this.materials[color], geom;

		if( type in this.geometries ) {
			geom = this.geometries[type];
		}
		else {
			console.log( 'Unsupported geometry type "%s"; using sphere', type );			
			geom = this.geometries['sphere'];
		}

		let mesh = new THREE.Mesh( geom, mat );
		mesh.position.x = x;
		mesh.position.y = y;
		mesh.position.z = z;
		mesh.scale.x = sx;
		mesh.scale.y = sy;
		mesh.scale.z = sz;
		mesh.updateMatrix();
		return mesh;
	}

	getSphere( {color, r=1, x=0, y=0, z=0} ) {
		return this.get( {type: 'sphere', color, sx:r, sy:r, sz:r, x,y,z} );
	}

	getCuboid( {color, lx=1, ly=1, lz=1, x=0, y=0, z=0} ) {
		return this.get( {type: 'cuboid', color, sx:lx, sy:ly, sz:lz, x,y,z} );
	}
}

// In the unlikely event we're using this via require("xxx") on server side.
//module.exports = { World, MeshCache };
