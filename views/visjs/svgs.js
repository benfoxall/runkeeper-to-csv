
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

      var groups = geofn
                    .group_bounds(geo.features.map(function(f){
                      return f.bbox
                    }))

      // group together by intersecting bounding box
      var group_layout = {
        children:
          groups
          .map(function(bound, i) {
            return {
              id:i,
              bbox: bound,
              centroids: []
            }
          })
      }

      d3.layout.pack()
        .value(function(){return 1})
        .size([w,h])
        (group_layout)


      // assign groups to features
      geo.features.forEach(function(feature, i){
        for (var i = 0; i < groups.length; i++) {
          if(geofn.intersects(feature.bbox, groups[i])){
            feature.properties.group = group_layout.children[i];
            group_layout.children[i].centroids.push(feature.properties.centroid);
            break;
          }
        }
      })

      group_layout.children.forEach(function(group){
        group.centroid = d3.transpose(group.centroids)
                           .map(function(d){return d3.mean(d)})
      })


      // this screws up the geojson by adding `children` to all the features,
      // but it looks cool
      var pack = d3.layout.pack();
      pack.value(function(d){return d.properties.total_distance})
      pack.children(function(d){return d.features})
      pack.size([w,h])
      pack(geo);


      var projection = d3.geo.equirectangular()
                          .translate([0,0])
                          .scale(300000);

      var path = d3.geo.path().projection(projection)

      var colours = d3.scale.category20();

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
              return colours(d.properties.group.id)
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
                var g = d.properties.group;
                return 'translate('+g.x+','+g.y+') scale(.5)'
            })

            // re-plot based on centroid
            .transition()
            .delay(function(d,i){
              return (i * 5) + 4500
            })
            .duration(3500)

            .attr("d", function(d, i){
              var g = d.properties.group;
              path.projection()
                .rotate(
                  g.centroid
                   .slice(0,2)
                   .map(function(d){return d*-1})
                )
              return path(d);
            })

            ;

    })

}
