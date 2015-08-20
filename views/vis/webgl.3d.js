var element = document.getElementById('vis');


var camera, scene, renderer, first, world;

var line_material = new THREE.LineBasicMaterial({
  linewidth: 2,
  color: 0x000000,
  transparent: true,
  opacity: 0.4
});

console.log("WEBGL3d")

var m = location.hash.match('box=(.*)$');
if(!m) throw new Error("no box selected");

box = m[1].split(',').map(parseFloat);

var w = 600, h = 600;
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera( 75, w / h, 0.00000001, 1000 );

renderer = new THREE.WebGLRenderer({
  antialias: true
});
renderer.setSize( w, h );
renderer.setClearColor( 0xeeeeee );
element.appendChild( renderer.domElement );

world = new THREE.Object3D();
scene.add(world)

var globe_geometry = new THREE.IcosahedronGeometry( 6371000, 5 );
var globe_material = new THREE.MeshBasicMaterial( {
  color: 0x0ccccc,
  transparent:true,
  opacity: 0.2,
  wireframe: true
} );
var globe = new THREE.Mesh( globe_geometry, globe_material );
world.add( globe );


// find target from bounding box (url hash)
var p = geofn.cartesian(box);
var target = new THREE.Vector3( p[0], p[1], p[2] )

// rotate so that target is at 0,0 in the world view
world.quaternion.setFromUnitVectors(target.clone().normalize(), new THREE.Vector3(0,1,0))
world.position.y = - target.length()

window.focusOn = function(coords){
  // todo animate
  var p = geofn.cartesian(coords);
  var target = new THREE.Vector3( p[0], p[1], p[2] )

  // rotate so that target is at 0,0 in the world view
  world.quaternion.setFromUnitVectors(target.clone().normalize(), new THREE.Vector3(0,1,0))
  world.position.y = - target.length()
}


camera.position.z = 200;
camera.position.y = 100;

controls = new THREE.OrbitControls( camera );
controls.damping = 0.2;

db
  .activities

  .filter(function(activity){
    return activity.path && activity.path.length
  })

  .each(function(activity){

    // could simplify here if we hit any problems

    var data = new Float32Array(activity.path.length * 3);

    activity.path.forEach(function(p, i){
      data.set(geofn.cartesian([p.longitude, p.latitude, p.altitude]), i*3)
    });

    var geometry = new THREE.BufferGeometry();

    geometry.addAttribute( 'position', new THREE.BufferAttribute( data, 3 ) );
    geometry.computeBoundingSphere();

    mesh = new THREE.Line( geometry, line_material );

    globe.add( mesh );

  })

  .then(function(){
    console.log('render time: %s seconds', (window.performance.now()/1000).toFixed(2))
  })

function render() {
	requestAnimationFrame( render );
	renderer.render( scene, camera );
}
render();
