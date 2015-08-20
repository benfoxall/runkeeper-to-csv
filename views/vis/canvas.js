console.time('generate data')


// plonk everything into a big fat array
var data; //new Float32Array

// array of typed arrays
var arrays = [];

// points of interest
var pois = []

db
  .activities
  .reverse()
  // .limit(10)
  .each(function(activity){
    if(activity.path && activity.path.length){

      var lat_total = 0, lng_total = 0,
          lat_min = Number.MAX_VALUE, lng_min = Number.MAX_VALUE,
          lat_max = Number.MIN_VALUE, lng_max = Number.MIN_VALUE;

      var points = new Float32Array(activity.path.length * 2)

      activity.path.forEach(function(p, i){
        points[i*2]       = p.latitude;
        points[(i*2) + 1] = p.longitude;

        lat_total += p.latitude;
        lng_total += p.longitude;
        lat_min = Math.min(p.latitude, lat_min)
        lng_min = Math.min(p.longitude, lng_min)
        lat_max = Math.max(p.latitude, lat_max)
        lng_max = Math.max(p.longitude, lng_max)
      })

      arrays.push(points);

      pois.push({
        lng: lng_total / activity.path.length,
        lat: lat_total / activity.path.length,

        // a scale that will include both
        extent: Math.max(
          lat_max - lat_min,
          lng_max - lng_min
        )
      })

    }
  })
  .then(function(){

    data = new Float32Array(arrays.reduce(function(memo, arr){
      return memo + arr.length;
    }, 0))

    arrays.reduce(function (idx, arr){
      data.set(arr, idx);
      return idx + arr.length;
    }, 0)

    console.timeEnd('generate data');

    draw();

  })

// canvas centered at 0,0
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d')
ctx.translate(canvas.width/2, canvas.height/2);
ctx.fillStyle = ctx.strokeStyle = 'rgba(1,1,1,0.3)';


// current point of interest
var poi;

var poii = 0;

canvas.addEventListener('click', function(e){
  e.preventDefault();
  poi = pois[poii];
  poii = (poii + 1) % pois.length;
  draw();
})

function xdraw(){

  console.time('draw');

  ctx.clearRect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
  ctx.beginPath()

  for(var i = 0; i < data.length; i+=20){
    if(poi){
      ctx.fillRect(
        (data[i+1] - poi.lng) * (poi.scale || 2000),
        (-data[i]  + poi.lat) * (poi.scale || 2000),
      2, 2);
    } else {
      ctx.fillRect(data[i+1],-data[i], 2, 2);
    }
    if(window.performance.now() < 0) break;
  }

  console.timeEnd('draw');

}

function draw(){
  console.time('draw');

  ctx.clearRect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height);

  var lng = poi ? function(d){
    return (d - poi.lng) * (poi.scale || 2000)
  } : function(d){
    return d
  };

  var lat = poi ? function(d){
    return (-d + poi.lat) * (poi.scale || 2000)
  } : function(d){
    return -d
  };


  arrays.forEach(function(points){
    ctx.beginPath()
    ctx.moveTo(lng(points[1]), lat(points[0]));

    for (var i = 2; i < points.length; i += 2) {
      ctx.lineTo(lng(points[i+1]),lat(points[i]));
    }

    ctx.stroke();
  })

  console.timeEnd('draw');
}

document.addEventListener('click', function(e){
  if(e.target.dataset.poi){
    e.preventDefault();
    poi = JSON.parse(e.target.dataset.poi);
    draw();
  }
}, false)
