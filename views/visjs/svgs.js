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

      var totals = [0,0,0];

      var coords = activity.path.map(function(p){
        totals[0] += p.longitude;
        totals[1] += p.latitude;
        totals[2] += Math.round(p.altitude);

        return [p.longitude, p.latitude, Math.round(p.altitude)]
      });

      var bbox = coords.reduce(function(bounds, coord){
        for (var i = 0; i < coord.length*2; i+=2) {
          bounds[i]   = bounds[i]   ? Math.min(bounds[i],   coord[i/2]) : coord[i/2];
          bounds[i+1] = bounds[i+1] ? Math.max(bounds[i+1], coord[i/2]) : coord[i/2];
        }
        return bounds;
      },[])

      geo.features.push({
        "type": "Feature",
        "bbox": bbox,
        "geometry": {
          "type": "LineString",
          "coordinates": coords
          },
        "properties" : {
          "activity": activity.activity,
          "centroid": totals.map(function(t){return - t / coords.length}),
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

      var projection = d3.geo.equirectangular();

      // var projection = d3.geo.orthographic();

      // projection.translate([w/2,h/2])
      // projection.clipExtent([[0,0],[w,h]])

      // oxford
      // projection.scale(250000)
      // projection.center([-1.27, 51.75])
      // projection.rotate([1.27, -51.75])

      //
      // group any features with the same bounding box
      // (could be a geojson function I guess)
      function bboxIntersect(a, b){
        // http://gamedev.stackexchange.com/questions/586/
        return (Math.abs(a[0] - b[0]) * 2 < ((a[1] - a[0]) + (b[1] - b[0]))) &&
               (Math.abs(a[2] - b[2]) * 2 < ((a[3] - a[2]) + (b[3] - b[2])));
               // skip 3rd dimension
      }

      var bbox_centroids = {};
      var group_idx = 0;
      for (var i = 0; i < geo.features.length; i++) {

        var test = bboxIntersect.bind(this, geo.features[i].bbox);
        var found = false;

        for (var j = i-1; j > 0; j--) {
          if(test(geo.features[j].bbox)){
            found = geo.features[j];
            break;
          }
        }

        if(found){
          // console.log("found", i, j, found.properties.bbox_group);
          geo.features[i].properties.bbox_group = found.properties.bbox_group;

          bbox_centroids[found.properties.bbox_group].push(
            geo.features[i].properties.centroid
          )
        } else {
          // console.log("not found", i, group_idx);
          geo.features[i].properties.bbox_group = group_idx;
          bbox_centroids[group_idx] = [geo.features[i].properties.centroid];

          group_idx++;
        }
      }
      console.log("found ", group_idx, " bbox intersections")

      var bbox_groups = {
        children:[]
      }

      for (var i = 0; i < group_idx; i++) {
        bbox_groups.children.push({
          id: i,
          centroid: bbox_centroids[i] // TODO - average all centroids
        });
      }

      window.bbox_groups = bbox_groups;

      var keyed_bbox_groups =
      d3.layout.pack()
        .value(function(){return 1})
        .size([w,h])
        (bbox_groups)
        .reduce(function(memo, bbox){
          memo[bbox.id] = bbox;
          return memo;
        },[])

      // console.table(keyed_bbox_groups)



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
              projection.rotate(d.properties.centroid.slice(0,2))
              projection.translate([0,0]);
              // console.log(d.properties.centroid)
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
                return 'translate('+d.x+','+d.y+') scale(.5)'
            })
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
              projection.scale(300000)
              projection.rotate(g.centroid[0].slice(0,2))
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
