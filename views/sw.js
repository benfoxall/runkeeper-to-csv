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


// any urls shoved into this queue will be downloaded
// (unless they are already saved)
var q = async.queue(function (uri, callback) {
  db.activities
    .where('uri').equals(uri)
    .count(function(c){
      if(c === 0)
        return populateActivity(uri)
          .then(function(){
            downloaded.push(uri);
          })
    })
    .then(function(){
      console.log("notifying")
      self.clients.matchAll().then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({
            tasks: q.tasks.length
          });
        });
      });
    })
    .then(callback)

}, 2);


// a list of all the activities that we've downloaded
var downloaded = [];
db.activities.toCollection().keys(function(keys){
  downloaded = downloaded.concat(keys);
})



self.addEventListener('message', function(event) {
  console.log("Message!", event.data)

  switch (event.data.action) {

    case 'populate':
      q.push(event.data.urls.filter(function(url){
        return downloaded.indexOf(url) > -1
      }));
      break;

    case 'pause':
      q.pause();
      break;

    case 'resume':
      q.resume();
      break;

    case 'kill':
      q.kill();
      break;

    case 'clear':
      q.kill();
      db.activities.clear()
      .then(function(){
        console.log("CLEARED")
      })
    break;


    case 'echo':
      console.log("notifying")
      db.activities.toCollection().keys(function(keys){
        self.clients.matchAll().then(function(clients) {
          clients.forEach(function(client) {
            client.postMessage({
              tasks: q.tasks.length,
              downloaded: keys.length,
              keys: keys
            });
          });
        });
      })
      break;

  }

});


function populateActivity(uri){
  return fetch('data' + uri, { credentials: 'include' })
          .then(function(res){ return res.json() })
          .then(function(data){
            return db.activities.put(data)
          })
}


function populateIndex(url) {
  return fetch('/data' + url, { credentials: 'include' })
    .then(function(res){
      return res.json()
    })
    .then(function(data){

      // push the urls into the queue
      q.push(data.items.map(function(item){
        return item.uri;
      }));

      // recurse if more to get
      if(data.next) return populateIndex(data.next);
    })
}


function downloadState(){
  return {
    complete: downloaded.length,
    queued: q.tasks.length
  }
}

function jsonResponse(json){
  return new Response(JSON.stringify(json), { 'Content-Type': 'application/json' } )
}

self.addEventListener('install', function(event) {
  console.log("installing SW")
});

self.addEventListener('fetch', function(event) {

  if(event.request.url.match(/sw\/state$/)){
    event.respondWith(
      jsonResponse(downloadState())
    )
  }

  if(event.request.url.match(/sw\/populate$/)){
    event.respondWith(new Response("populating"))
  }

  if(event.request.url.match(/sw\/data$/)){
    event.respondWith(summaryResponse())
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
