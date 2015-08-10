
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

      // console.log("count>", geo.features.reduce(function(memo, item){
      //   return memo + item.geometry.coordinates.length
      // },0))

      // roughly 80% reduction for my data
      simplify(geo, 0.0001, true);

      var boxes = geo.features.map(function(f){
        return f.bbox
      });

      var gs = geofn.group(boxes)

      console.log("found %d groups", Math.max.apply(Math, gs));

      var bbox_centroids = window.bbox_centroids = {};

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


      var boxes = geo.features.map(function(f){
        return f.bbox
      });

      var gs = geofn.group(boxes)

      var keyed_bbox_groups = window.keyed_bbox_groups =
      d3.layout.pack()
        .value(function(){return 1})
        .size([w,h])
        (bbox_groups)
        .reduce(function(memo, bbox){
          memo[bbox.id] = bbox;
          return memo;
        },[])

      // console.table(keyed_bbox_groups)

      var projection = d3.geo.equirectangular();
      var path = d3.geo.path().projection(projection)


      // var path = d3.geo.path().projection(d3.geo.equirectangular());
      var colours = d3.scale.category20b();
      var colours = d3.scale.category10();


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
            .attr("d", function(d, i){
              projection.scale(300000)
              projection.rotate(
                d.properties
                 .centroid.slice(0,2)
                 .map(function(d){return d*-1})
              )
              projection.translate([0,0]);
              return path(d);
            })
            .style('stroke', function(d,i){
              // console.log(d)
              return colours(d.properties.bbox_group)
            })
            // .transition()
            // .delay(function(d,i){
            //   return i * 200
            // })
            .attr('transform', function(d,i){
                return 'translate('+d.x+','+d.y+') scale(0.01) rotate(-45)'
            })

            .transition()
            .delay(function(d,i){
              return (i * 5) + 200
            })
            .duration(3500)
            .attr('transform', function(d,i){
                var g = keyed_bbox_groups[d.properties.bbox_group];
                return 'translate('+g.x+','+g.y+') scale(.5)'
            })


            .transition()
            .delay(function(d,i){
              return (i * 5) + 4500
            })
            .duration(3500)

            .attr("d", function(d, i){
              var g = keyed_bbox_groups[d.properties.bbox_group];
              projection.rotate(
                g.centroid[0]
                 .slice(0,2)
                 .map(function(d){return d*-1})
              )
              projection.translate([0,0]);
              return path(d);
            })

            ;



    // svg.append("path")
    //   .datum(d3.geo.graticule())
    //   .attr("d", path)
    //   .attr('class', 'graticule');

/*

      svg.append("path")
        .datum(d3.geo.graticule())
        .attr("d", path)
        .attr('class', 'graticule');


      svg
        .selectAll("path")
        .transition()
        .duration(3000)
        .attrTween("d", function(d) {
          var i = d3.interpolate(150, 2050);
          var r = d3.geo.interpolate([0,0],[1.27, -51.75])
          // var dmin = d.slice(0,10)
          return function(t) {
            projection.rotate(r(t))
            // projection.scale(i(t))
            return path(d) || '';
          };
        })
        .transition()
        .duration(2000)

        .attrTween("d", function(d) {
          var i = d3.interpolate(150, 3000);
          var r = d3.geo.interpolate([0,0],[1.27, -51.75])
          // var dmin = d.slice(0,10)
          return function(t) {
            // projection.rotate(r(t))
            projection.scale(i(t))
            return path(d) || '';
          };
        })

        .transition()
        .duration(2000)

        .attrTween("d", function(d) {
          var i = d3.interpolate(3000, 250000);
          var r = d3.geo.interpolate([0,0],[1.27, -51.75])
          // var dmin = d.slice(0,10)
          return function(t) {
            // projection.rotate(r(t))
            projection.scale(i(t))
            return path(d) || '';
          };
        })


        .transition()
        .duration(2000)
        .style('stroke-width', 1)
        .style('opacity', 0.3)


        .call(function(){
          console.log('calld')
        })

      // var a = 0;
      // setInterval(function(){
      //   projection.scale(projection.scale()+100)
      //   // projection.rotate([a += 1, 0])
      //   svg.selectAll("path")
      //   .attr("d", path)
      // }, 100)
      */
    })

}
