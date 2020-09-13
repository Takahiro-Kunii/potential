window.onload = function (e) {
	lab = new Lab("canvas-frame");
	lab.setup({shadow:true, useTrackball:true});
	lab.camera.position.set(0.5, 2, 2);
	lab.trackball.target.set(0.5, 0, 0.5);
	
	lab.start(new PotentialField(lab, {resolution:30}));
}

