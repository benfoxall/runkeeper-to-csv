/*
  This is a service worker for gathering runkeeper data
  and providing it in a friendly way for people to take
  away with them.
*/



// Grab control (in case I've got more than one tab open by accident)

if (typeof self.skipWaiting === 'function') {
  console.log('self.skipWaiting() is supported.');
  self.addEventListener('install', function(e) {
    // See https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-global-scope-skipwaiting
    e.waitUntil(self.skipWaiting());
  });
} else {
  console.log('self.skipWaiting() is not supported.');
}

if (self.clients && (typeof self.clients.claim === 'function')) {
  console.log('self.clients.claim() is supported.');
  self.addEventListener('activate', function(e) {
    // See https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#clients-claim-method
    e.waitUntil(self.clients.claim());
  });
} else {
  console.log('self.clients.claim() is not supported.');
}



importScripts('bower_components/cache-polyfill/index.js');

// storage
importScripts('bower_components/dexie/dist/latest/Dexie.min.js');
importScripts('db.js');

// api retrieval
importScripts('bower_components/async/dist/async.min.js');

// geojson helpers
importScripts('geofn.js');
importScripts('simplify-geojson.bundle.js');
var simplify = require('simplify-geojson');

// all the responses could go into the cache
// though indexeddb allows them to be carved
// up a bit easier
var CACHE_NAME = "RK_DATA";

self.addEventListener('install', function(event) {
  console.log("installing SW");
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {

    if(event.request.url.match(/sw\/summary\.csv$/)){
      respond(event, summaryResponse)
    }
    if(event.request.url.match(/sw\/distances\.csv$/)){
      respond(event, distancesResponse)
    }

    if(event.request.url.match(/sw\/paths\.csv$/)){
      respond(event, pathsResponse)
    }

    if(event.request.url.match(/sw\/geo\.json$/)){
      respond(event, geoJSONResponse)
    }

    if(event.request.url.match(/sw\/geo\.simple\.json$/)){
      respond(event, geoJSONResponseSimple)
    }

    if(event.request.url.match(/sw\/binary\.path\.b$/)){
      respond(event, binaryPathResponse)
    }

    if(event.request.url.match(/sw\/expire-cache$/)){
      event.respondWith(
        caches.delete(CACHE_NAME)
        .then(function(){
          return new Response("okay")
        })
      )
    }

});

function respond(event, actual){

  event.respondWith(
    caches.match(event.request)
    .then(function(cached){
      if(cached)
        return cached
      else
        return respondAndCache();
    })
    .catch(function(e){
      console.error("a pretty weird thing happend", e)
      return respondAndCache();
    })
  )

  function respondAndCache(){
    return actual()
      .then(function(response){

        var responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then(function(cache) {
            cache.put(event.request, responseToCache);
          });

        return response;

      })
  }
}


function summaryResponse(){
  console.time('build summary')

  var keys = ['uri', 'duration', 'type', 'start_time', 'total_distance', 'climb', 'total_calories'];
  var rows = [keys];

  return db
    .activities
    .reverse()
    .each(function(activity){
      rows.push(
        row(keys, activity)
      )
    })
    .then(function(){
      console.timeEnd('build summary');

      var data = new Blob(rows.map(function(row){
        return csv(row) + '\n';
      }));

      return new Response( data, {
        headers: { 'Content-Type': 'text/csv' }
      });
    })

}



function distancesResponse(){
  console.time('build distances')

  var data = [new Blob(['uri, timestamp, distance\n'])];

  return db
    .activities
    .reverse()
    .each(function(activity){
      data.push(
        new Blob([activity.distance.map(function(d){
          return csv([activity.uri, d.timestamp, d.distance])
        }).join('\n') + '\n'])
      );
    })
    .then(function(){
      console.timeEnd('build distances');

      var blob = new Blob(data);

      return new Response( blob, {
        headers: { 'Content-Type': 'text/csv' }
      });
    })

}

function pathsResponse(){
  console.time('build paths')

  var data = [new Blob(['uri, timestamp, altitude, latitude, longitude\n'])];

  return db
    .activities
    .reverse()
    .each(function(activity){
      data.push(
        new Blob([activity.path.map(function(d){
          return csv([activity.uri, d.timestamp, d.altitude, d.latitude, d.longitude])
        }).join('\n') + '\n'])
      );
    })
    .then(function(){
      console.timeEnd('build paths');

      var blob = new Blob(data);

      return new Response( blob, {
        headers: { 'Content-Type': 'text/csv' }
      });
    })
}


// pull out a row of keys
function row(keys, obj){
  return keys.map(function(k){
    return obj[k]
  })
}
// create a csv row from an array
function csv(array){

  // this is not a world class csv generator
  return array.map(function(item){
    return  typeof(item) === 'string' ?
      item.replace(/[\",]/g,'') :
      item;
  }).join(',')
}


// GEO JSON

function geoJSONResponse(){
  return geoJSON()
    .then(function(geo){
      return new Response( JSON.stringify(geo), {
        headers: { 'Content-Type': 'application/json' }
      });
    })
}

function geoJSONResponseSimple(){
  return geoJSON()
    .then(function(geo){
      // roughly 80% reduction for my data
      simplify(geo, 0.0001, true);

      return new Response( JSON.stringify(geo), {
        headers: { 'Content-Type': 'application/json' }
      });
    })
}

function geoJSON() {
  var geo = {
    type: "FeatureCollection",
    features: []
  }

  return db
    .activities

    .filter(function(activity){
      return activity.path && activity.path.length
    })

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
      return geo;
    });
}


// Binary

function binaryPathResponse(){

  var paths = [];
  var output;

  return db
    .activities

    .filter(function(activity){
      return activity.path && activity.path.length
    })

    .each(function(activity){

      // millis since epoch
      // var start = new Date(activity.start_time).getTime();

      var path = new Float32Array(activity.path.length * 3);

      activity.path.forEach(function(p, i){
        path.set(geofn.cartesian([p.longitude, p.latitude, p.altitude]), i*3)
      })

      paths.push(path);

    })

    .then(function(){
      return new Response( new Blob(paths), {
        headers: { 'Content-Type': 'application/octet-stream' }
      });
    })

}
