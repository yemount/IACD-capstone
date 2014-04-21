var zoomFactor = 2;
var stepLen = 2;

function Plane(plane, rgbMap, depthMap, zoomLevel){
	this.n = plane.n;
	this.up = [0, 0, 1];
    this.forward = [this.n[1]*this.up[2]-this.n[2]*this.up[1], 
    	this.n[2]*this.up[0]-this.n[0]*this.up[2], 
    	this.n[0]*this.up[1]-this.n[1]*this.up[0]];
	this.d = plane.d;
	this.points = [];
	this.rgbMap = rgbMap;
	this.depthMap = depthMap;
	this.zoomLevel = zoomLevel;
}

Plane.prototype.addTwoDPoint = function(point) {
	this.points.push({
		twoD: point,
		threeD: null,
		twoDProjection: null,
	});
};

Plane.prototype.toThreeD = function() {
	for(var i = 0; i < this.points.length; i++){
		var p = this.points[i],
			v = [0, 0, 0], 
			t, phi, theta, w, h;

		w = this.depthMap.width;
		h = this.depthMap.height;
		phi = (w - p.twoD.x - 1) / (w - 1) * 2 * Math.PI + Math.PI/2;
        theta = (h - p.twoD.y - 1) / (h - 1) * Math.PI;

		v[0] = Math.sin(theta) * Math.cos(phi);
		v[1] = Math.sin(theta) * Math.sin(phi);
        v[2] = Math.cos(theta);
        t = this.d / (v[0]*this.n[0] + v[1]*this.n[1] + v[2]*this.n[2]);
		v[0] *= t;
        v[1] *= t;
        v[2] *= t;

        this.points[i].threeD = v;
	}
	return this;
};

Plane.prototype.project = function() {
	var origin = this.points[0].threeD;
	this.points[0].twoDProjection = {x: 0, y: 0};
	for(var i = 1; i < this.points.length; i++){
		var p = this.points[i], x, y;
		x = (p.threeD[0]-origin[0]) * this.forward[0] + 
			(p.threeD[1]-origin[1]) * this.forward[1] + 
			(p.threeD[2]-origin[2]) * this.forward[2];
		y = (p.threeD[0]-origin[0]) * this.up[0] + 
			(p.threeD[1]-origin[1]) * this.up[1] + 
			(p.threeD[2]-origin[2]) * this.up[2];
		this.points[i].twoDProjection = {x: x, y: y};
	}
	var minX = 100000, 
		minY = 100000, 
		maxX = -100000,
		maxY = -100000;	
	for(var i= 0; i < this.points.length; i++){
		minX = Math.min(this.points[i].twoDProjection.x, minX);
		maxX = Math.max(this.points[i].twoDProjection.x, maxX);
		minY = Math.min(this.points[i].twoDProjection.y, minY);
		maxY = Math.max(this.points[i].twoDProjection.y, maxY);
	}
	this.projRange = {
		minX: minX,
		maxX: maxX,
		minY: minY,
		maxY: maxY,
	};
	return this;
};

Plane.prototype.tessellate = function(){
	var faces = [];
	var rows = {};
	var keys = [];
	for(var i = 0; i < this.points.length; i++){
		var p = this.points[i];
		if(!(p.twoD.y in rows)){
			rows[p.twoD.y] = {
				max: -100000,
				maxIdx: -1,
				min: 100000,
				minIdx: -1,
			};
			keys.push(p.twoD.y);
		}
		if(p.twoD.x > rows[p.twoD.y].max){
				rows[p.twoD.y].max = p.twoD.x;
				rows[p.twoD.y].maxIdx = i;
		}
		if(p.twoD.x < rows[p.twoD.y].min){
				rows[p.twoD.y].min = p.twoD.x;
				rows[p.twoD.y].minIdx = i;
		}
	}
	keys.sort(function(a, b){return a-b;});
	for(var r = 0; r < keys.length - 1; r += stepLen){
		var rNext = r+stepLen < keys.length - 1 ? r+stepLen : keys.length - 1;
		faces.push([rows[keys[r]].minIdx, rows[keys[r]].maxIdx, rows[keys[rNext]].minIdx]);
		faces.push([rows[keys[rNext]].minIdx, rows[keys[r]].maxIdx, rows[keys[rNext]].maxIdx]);
	}
	this.faces = faces;
	return this;
}

Plane.prototype.toMesh = function(parent){
	var cx, cy, p, rx, ry, 
		dw = this.depthMap.width,
		dh = this.depthMap.height,
		rw = this.rgbMap.width,
		rh = this.rgbMap.height;
	var cw = Math.floor((this.projRange.maxX - this.projRange.minX) * this.zoomLevel) * zoomFactor, 
		ch = Math.floor((this.projRange.maxY - this.projRange.minY) * this.zoomLevel) * zoomFactor;
	if(cw > 5000 || ch > 5000 || cw < 1 || ch < 1){
		return;
	}
	
	var canvas = document.createElement("canvas");
	canvas.setAttribute('width', cw);
	canvas.setAttribute('height', ch);	

	var camera, scene, renderer, mesh, gridMesh, 
		self = this;

	init();
	animate();

	function init() {
		cw = 500;
		ch = 500;

    	camera = new THREE.PerspectiveCamera( 40, cw / ch, 1, 10000 );
    	camera.position.z = 1380;
    	camera.position.x = 500;
    	camera.position.y = 500;

        
		renderer = new THREE.CanvasRenderer({canvas: canvas});
		renderer.setSize(cw, ch);

		scene = new THREE.Scene();

    	var texture = new THREE.Texture(self.rgbMap.rgbCanvas);	
    	texture.needsUpdate = true;	

    	var gridGeom = new THREE.Geometry();
    	var geom = new THREE.Geometry();
	    var v1 = new THREE.Vector3(0,0,-0.0001);
	    var v2 = new THREE.Vector3(1000,0,-0.0001);
	    var v3 = new THREE.Vector3(1000,1000,-0.0001);
	    
	    gridGeom.vertices.push(v1);
	    gridGeom.vertices.push(v2);
	    gridGeom.vertices.push(v3);
	    gridGeom.faces.push( new THREE.Face3( 0, 1, 2 ) );
	    gridGeom.faceVertexUvs[0][0] = [new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 1)];
	    gridGeom.computeFaceNormals();		

		for(var i = 0; i < self.points.length; i++){
			p = self.points[i];
			// cx = p.twoD.x * self.zoomLevel * zoomFactor;
			// cy = p.twoD.y * self.zoomLevel * zoomFactor;
			cx = Math.floor((p.twoDProjection.x-self.projRange.minX) * self.zoomLevel * zoomFactor);
			cy = Math.floor((p.twoDProjection.y-self.projRange.minY) * self.zoomLevel * zoomFactor);
			geom.vertices.push(new THREE.Vector3(cx, cy, 0));
		}

		for(var i = 0; i < self.faces.length; i++){
			var face = self.faces[i];
			// var tx1 = 0, tx2 = 1, tx3 = 1, 
			// 	ty1 = 0, ty2 = 0, ty3 = 1;
			var tx1 = self.points[face[0]].twoD.x / dw;
			var ty1 = 1-self.points[face[0]].twoD.y / dh;
			var tx2 = self.points[face[1]].twoD.x / dw;
			var ty2 = 1-self.points[face[1]].twoD.y / dh;
			var tx3 = self.points[face[2]].twoD.x / dw;
			var ty3 = 1-self.points[face[2]].twoD.y / dh;
			geom.faces.push(new THREE.Face3(face[0], face[1], face[2]));
			geom.faceVertexUvs[0][i] = [new THREE.Vector2(tx1, ty1), new THREE.Vector2(tx2, ty2), new THREE.Vector2(tx3, ty3)];
		}

		gridGeom.computeFaceNormals();
		geom.computeFaceNormals();

		var material = new THREE.MeshBasicMaterial( { color: 0xff0000} );

		gridMesh = new THREE.Mesh( gridGeom, material );
		mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial( { map: texture} ));
		scene.add( gridMesh );
		scene.add( mesh );
		renderer.render( scene, camera );

	}

	function animate() {

		requestAnimationFrame( animate );

		renderer.render( scene, camera );

	}

	parent.append(canvas);
}

function WallParser(rgbMap, depthMap, planes, zoomLevel, parent){

	var x, y, 
		_planes = {},
        w = depthMap.width, 
        h = depthMap.height;

	for(y = 0; y < h; y++){
		for(x = 0; x < w; x++){
			var index = depthMap.depthMap[y*w + x];
			if(index == 0) continue;
			if(!(index in _planes)){
				_planes[index] = new Plane(planes[index], rgbMap, depthMap, zoomLevel);
			}
			_planes[index].addTwoDPoint({
				x: x,
				y: y,
            });
		}
	}

	for(var index in _planes){
		_planes[index].toThreeD()
			.project()
			.tessellate()
			.toMesh(parent);
	}

	console.log('parsed ' + _planes.length + ' walls');

}