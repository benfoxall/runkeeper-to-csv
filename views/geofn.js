var geofn = {};

// find the bounds of a set of coords
// [[1,20,0],[2,23,0], [3,22,10]] => [1,3,20,23,0,10]
geofn.bounds = function(coords){
  var bounds = [], coord, v;
  for (var i = 0; i < coords.length; i++) {
    coord = coords[i];

    for (var j = 0; j < coord.length*2; j+=2) {
      v = coord[j/2]

      if(j >= bounds.length) {
        bounds[j] = bounds[j+1] = v
        continue;
      }

      bounds[j]   = Math.min(bounds[j],   v)
      bounds[j+1] = Math.max(bounds[j+1], v)
    }
  }

  return bounds;
}


// do two bounding boxes intersect?
geofn.intersects = function(a, b){
  // http://gamemath.com/2011/09/detecting-whether-two-boxes-overlap/
  for (var i = 0; i < a.length; i+=2) {
    if(a[i+1] < b[i]  ) return false
    if(a[i]   > b[i+1]) return false
  }
  return true
}

// merging bounding boxes
geofn.merge = function(a, b){
  if(a.length !== b.length) throw new Error("can't merge boxes of different length")

  var merged = new Array(a.length);
  for (var i = 0; i < a.length; i++) {
    merged[i] = Math[i % 2 ? 'max' : 'min'](a[i], b[i])
  }
  return merged;
}

geofn.centre = function(box){
  var c = [];
  for (var i = 0; i < box.length; i+=2) {
    c[i/2] = (box[i] + box[i+1]) / 2
  }
  return c;
}

geofn.group_bounds = function(boxes) {
  var groups = boxes.map(function(box){
    return box.slice(0)
  })

  for (var i = groups.length-1; i >= 0; i--) {

    // if a group intersects any group before it,
    // merge it in and remove this one
    for (var j = i-1; j >= 0; j--) {
      if(geofn.intersects(groups[i], groups[j])){

        groups[j] = geofn.merge(groups[i], groups[j]);

        groups.splice(i, 1);

        break;
      }
    }
  }
  return groups;
}


geofn.group = function(boxes) {
  var groups = geofn.group_bounds(boxes);

  // map the boxes into the group they intersect with
  return boxes.map(function(box){
    for (var i = 0; i < groups.length; i++) {
      if(geofn.intersects(box, groups[i]))
      return i;
    }
    throw new Error("couldn't find box intersection")
  })

}


geofn.expand = function(box, expansion) {
  var expanded = box.slice(0);

  var size, mid;
  for (var i = 0; i < box.length; i += 2) {
    mid  = (box[i+1] + box[i]) / 2
    size = (box[i+1] - box[i]) * expansion * .5

    expanded[i]   = mid - size;
    expanded[i+1] = mid + size;
  }

  return expanded;
}

geofn.centroid = function(coords) {
  var totals = coords[0].map(function(){return 0}),
      coord;
  for (var i = 0; i < coords.length; i++) {
    coord = coords[i]

    for (var j = 0; j < coords[i].length; j++) {
      totals[j] += coords[i][j];
    }
  }

  return totals.map(function(t){
    return t/coords.length;
  })
}


geofn.cartesian = function(position) {
  var lng = position[0], lat = position[1]
	var rho = 6371000 + ((position[2] || 0));
	var phi = (lat + 90) * (Math.PI/180);
	var theta = (lng) * (Math.PI/180) * -1;

	var x = rho * Math.sin(phi) * Math.cos(theta);
	var y = rho * Math.sin(phi) * Math.sin(theta);
	var z = rho * Math.cos(phi);

  return [x,y,z];
}

geofn.contains = function(box, point){
  for (var i = 0; i < point.length && i < box.length/2; i++) {
    if(
      (point[i] < box[i*2])
    ){
      return false
    }

    if(
      (point[i] > box[i*2 + 1])
    ){
      // console.log("GT", point[i], box[i*2 + 1])
      return false
    }
  }
  return true;
}
