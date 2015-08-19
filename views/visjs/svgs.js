
window.vis = window.vis || {};

window.vis.svgs = function(element){

  var simplify = require('simplify-geojson')

  var w = 600, h = 600;
  var svg = d3.select(element)
    .select('.panel-body')
    .append('svg')
    .attr('width', w)
    .attr('height', h);

  d3.json('/sw/geo.simple.json',function(error, geo) {
    if(error) return console.error("Unable to get json", error);

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

      // WARNING layout can re-order group_layout.children
      d3.layout.pack()
        .value(function(){return 1})
        .size([w,h])
        (group_layout)


      group_layout.children.forEach(function(group){
        group.centroid = d3.transpose(group.centroids)
                           .map(function(d){return d3.mean(d)})
      })



      var layout = {
        children: d3.range(geo.features.length).map(function(){return {}})
      }

      d3.layout.pack()
        .value(function(d, i){return geo.features[i].properties.total_distance})
        .value(function(){return 1})
        .size([w,h])
        (layout)

      geo.features.forEach(function(feature,i){
        feature.properties.layout = layout.children[i]
      })


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
                var l = d.properties.layout;
                return 'translate('+l.x+','+l.y+') scale(0.5) rotate(-45)'
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


      svg.selectAll('circle.choice')
        .data(group_layout.children)
        .enter()
        .append('circle')
        .attr('class','choice')
        .attr('r', 0)
        .on('click', function(d){
          console.log(d)
          window.location.hash = 'box=' + d.centroid.join(',');
          if(window.focusOn){
            window.focusOn(d.centroid)
          }
        })
        .transition()
        .delay(function(d,i){return 7000 + i*100})
        .duration(2000)
        .attr('r',  function(d){return d.r})
        .attr('cx', function(d){return d.x})
        .attr('cy', function(d){return d.y})


    })

}
