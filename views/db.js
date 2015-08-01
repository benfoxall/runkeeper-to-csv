Dexie.Promise.on('error', function(err) {
    console.log("Uncaught error: " + err);
});
var db = new Dexie("Runkeeper");
db.version(1).stores({
  activities: "&uri,total_distance,userID,start_time_norm"
});
db.version(2).stores({
  activities: "&uri",
  summaries: "&id, userID, uri, state"
});
db.version(3).stores({
  activities: "&uri"
}).upgrade(function(trans){
  return trans.summaries.clear()
});
db.open();
