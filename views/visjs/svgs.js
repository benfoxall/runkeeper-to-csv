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

      geo.features.push({
        "type": "Feature",
        "geometry": {
          "type": "LineString",
          "coordinates": coords
          },
        "properties" : {
          "activity": activity.activity,
          "centroid": totals.map(function(t){return - t / coords.length})
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


      var path = d3.geo.path().projection(projection)


      // var path = d3.geo.path().projection(d3.geo.equirectangular());
      var colours = d3.scale.category20b();

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
              return colours(i)
            })
            // .transition()
            // .delay(function(d,i){
            //   return i * 200
            // })
            .attr('transform', function(d,i){
                return 'translate('+x(i)+','+h/2+') scale(0.01) rotate(-45)'
            })
            //
            .transition()
            .delay(function(d,i){
              return (i * 5) + 1000
            })
            .duration(1000)
            .attr('transform', function(d,i){
                return 'translate('+x(i)+','+h/2+') scale(1)'
            })
            ;



    svg.append("path")
      .datum(d3.geo.graticule())
      .attr("d", path)
      .attr('class', 'graticule');

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
