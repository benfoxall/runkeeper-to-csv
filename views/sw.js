/*
  This is a service worker for gathering runkeeper data
  and providing it in a friendly way for people to take
  away with them.
*/



// DEV STUFF

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



self.addEventListener('install', function(event) {
  console.log("installing SW")
});

self.addEventListener('fetch', function(event) {

    if(event.request.url.match(/sw\/summary\.csv$/)){
      event.respondWith(summaryResponse())
    }

    if(event.request.url.match(/sw\/distances\.csv$/)){
      event.respondWith(distancesResponse())
    }

    if(event.request.url.match(/sw\/paths\.csv$/)){
      event.respondWith(pathsResponse())
    }

});


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
