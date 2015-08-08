var geo = {};

// find the bounds of a set of coords
// [[1,20,0],[2,23,0], [3,22,10]] => [1,3,20,23,0,10]
geo.bounds = function(coords){
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
geo.intersects = function(a, b){
  // http://gamedev.stackexchange.com/questions/586/
  return (Math.abs(a[0] - b[0]) * 2 < ((a[1] - a[0]) + (b[1] - b[0]))) &&
         (Math.abs(a[2] - b[2]) * 2 < ((a[3] - a[2]) + (b[3] - b[2])));
           // skip 3rd dimension
}

// merging bounding boxes
geo.merge = function(a, b){
  if(a.length !== b.length) throw new Error("can't merge boxes of different length")

  var merged = new Array(a.length);
  for (var i = 0; i < a.length; i++) {
    merged[i] = Math[i % 2 ? 'max' : 'min'](a[i], b[i])
  }
  return merged;
}


geo.group = function(boxes) {
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
        if(geo.intersects(groups[i], groups[j])){
          groups[j] = geo.merge(groups[i], groups[j])
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
      if(geo.intersects(box, groups[i]))
      return i;
    }
    throw new Error("couldn't find box intersection")
  })

}
