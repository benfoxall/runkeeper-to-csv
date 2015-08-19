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



self.addEventListener('message', function(event) {
  console.log("WORKER<<", event.data)

  switch (event.data.action) {

    case 'populate':
      urls.push.apply(urls,event.data.urls)
      q.push(event.data.urls);
      update();
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
        postMessage({
          tasks: q.tasks.length,
          downloaded: keys.length,
          keys: keys
        });
      })
      break;

  }

});
