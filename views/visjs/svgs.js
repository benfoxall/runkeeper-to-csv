
window.vis = window.vis || {};

window.vis.svgs = function(element){

  var simplify = require('simplify-geojson')

  console.log("SVGS");

  var line = d3.svg.line()
    .x(function(d) { return d.x; })
    .y(function(d) { return d.y; })
    .interpolate("basis");

  var w = 600, h = 600;
  var svg = d3.select(element)
    .select('.panel-body')
    .append('svg')
    .attr('width', w)
    .attr('height', h);


  var geo = window.geo = {
    type: "FeatureCollection",
    features: []
  }

  db
    .activities

    .filter(function(activity){
      return activity.path && activity.path.length
    })

    // .limit(20)

    .each(function(activity){

      var coords = activity.path.map(function(p){
        return [p.longitude, p.latitude, Math.round(p.altitude)]
      });

      geo.features.push({
        "type": "Feature",
        "bbox": geofn.bounds(coords),
        "geometry": {
          "type": "LineString",
          "coordinates": coords
          },
        "properties" : {
          "activity": activity.activity,
          "centroid": geofn.centroid(coords),
          "total_distance": activity.total_distance
          }
        })
    })
    .then(function(){

      // roughly 80% reduction for my data
      simplify(geo, 0.0001, true);

      var boxes = geo.features.map(function(f){
        return f.bbox
      });

      var gs = geofn.group(boxes)

      console.log("found %d groups", Math.max.apply(Math, gs));

      var bbox_centroids = {};

      geo.features.forEach(function(feature, i){
        feature.properties.bbox_group = gs[i];

        (bbox_centroids[gs[i]] = bbox_centroids[gs[i]] || [])
          .push(feature.properties.centroid)
      })

      var group_idx = Math.max.apply(Math, gs) + 1;

      var bbox_groups = {
        children:[]
      }

      for (var i = 0; i < group_idx; i++) {
        bbox_groups.children.push({
          id: i,
          centroid: bbox_centroids[i] // TODO - average all centroids
        });
      }

      var keyed_bbox_groups =
      d3.layout.pack()
        .value(function(){return 1})
        .size([w,h])
        (bbox_groups)
        .reduce(function(memo, bbox){
          memo[bbox.id] = bbox;
          return memo;
        },[])

      var projection = d3.geo.equirectangular()
                          .translate([0,0])
                          .scale(300000);
      var path = d3.geo.path().projection(projection)


      var colours = d3.scale.category20();


      // this screws up the geojson by adding `children` to all the features,
      // but it looks cool
      var pack = d3.layout.pack();
      pack.value(function(d){return d.properties.total_distance})
      pack.children(function(d){return d.features})
      pack.size([w,h])
      pack(geo);

      var x = d3.scale.linear()
        .domain([0,geo.features.length])
        .range([50,w-50])

      svg.selectAll("path.activity")
          .data(geo.features)
          .enter()
            .append("path")
            .attr('class', 'activity')
            .attr("d", function(d){
              path.projection()
                .rotate(
                  d.properties.centroid
                   .slice(0,2)
                   .map(function(d){return d*-1})
                )
              return path(d);
            })
            .style('stroke', function(d,i){
              return colours(d.properties.bbox_group)
            })
            .attr('transform', function(d,i){
                return 'translate('+d.x+','+d.y+') scale(0.5) rotate(-45)'
            })

            // group together
            .transition()
            .delay(function(d,i){
              return (i * 5) + 200
            })
            .duration(3500)
            .attr('transform', function(d,i){
                var g = keyed_bbox_groups[d.properties.bbox_group];
                return 'translate('+g.x+','+g.y+') scale(.5)'
            })

            // re-plot based on centroid
            .transition()
            .delay(function(d,i){
              return (i * 5) + 4500
            })
            .duration(3500)

            .attr("d", function(d, i){
              var g = keyed_bbox_groups[d.properties.bbox_group];

              path.projection()
                .rotate(
                  g.centroid[0]
                   .slice(0,2)
                   .map(function(d){return d*-1})
                )
              return path(d);
            })

            ;

    })

}
