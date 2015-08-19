/*
  This is for populating the database
*/


importScripts('bower_components/dexie/dist/latest/Dexie.min.js');
importScripts('bower_components/async/dist/async.min.js');
importScripts('db.js');


var downloaded = [],
    urls       = [];

// send back to the UI
function update(){
  // inefficient, but kind of correct
  postMessage({
    total: urls.length,
    sofar: urls.reduce(function(total, url){
      return downloaded.indexOf(url) == -1 ? total : total + 1;
    }, 0)
  })
}


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
          .then(function(){
            fetch('/sw/expire-cache');
          })
    })
    .then(update)
    .then(callback)

}, 2);


function populateActivity(uri){
  return fetch('data' + uri, { credentials: 'include' })
          .then(function(res){ return res.json() })
          .then(function(data){
            return db.activities.put(data)
          })
}



// a list of all the activities that we've downloaded
var downloaded = [];
db.activities.toCollection().keys(function(keys){
  downloaded = downloaded.concat(keys);
})

// this would be cooler as an actual state thing
var started = false;

self.addEventListener('message', function(event) {
  console.log("WORKER<<", event.data)

  switch (event.data.action) {

    case 'start':
      if(!started) index('/fitnessActivities',[]);
      started = true;
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
        fetch('/sw/expire-cache');
        console.log("CLEARED")
      })
  }

});



// find all of the urls that we'd like to have saved
function index(url) {
  if(!url) return

  return fetch('/data' + url, { credentials: 'include' })
    .then(function(res){
      return res.json();
    })
    .then(function(json){

      var _urls = json.items.map(function(item){
        return item.uri;
      })

      urls.push.apply(urls,_urls)
      q.push(_urls);
      update();

      return index(json.next)
    })
}
