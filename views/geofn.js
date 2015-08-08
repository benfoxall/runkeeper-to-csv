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
  // http://gamedev.stackexchange.com/questions/586/
  return (Math.abs(a[0] - b[0]) * 2 < ((a[1] - a[0]) + (b[1] - b[0]))) &&
         (Math.abs(a[2] - b[2]) * 2 < ((a[3] - a[2]) + (b[3] - b[2])));
           // skip 3rd dimension
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


geofn.group = function(boxes) {
  var groups = boxes.map(function(box){
    return box.slice(0)
  })

  var merged;
  do {
    merged = false;

    for (var i = 0; i < groups.length; i++) {

      // if a group intersects any group before it,
      // merge it in and remove this one
      for (var j = i-1; j >= 0; j--) {
        if(geofn.intersects(groups[i], groups[j])){
          groups[j] = geofn.merge(groups[i], groups[j])
          groups.splice(i, 1);
          merged = true;
          break;
        }
      }
    }
  } while (merged);

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
