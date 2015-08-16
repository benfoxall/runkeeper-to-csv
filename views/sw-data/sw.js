importScripts('cache-polyfill.js');

console.log("hello from SW")

// example usage:
// self.addEventListener('install', function(event) {
//   event.waitUntil(
//     caches.open('demo-cache').then(function(cache) {
//       return cache.put('/sw-data/test', new Response("From the cache!"));
//     })
//   );
// });
//
// self.addEventListener('fetch', function(event) {
//   console.log("fetching being called")
//   event.respondWith(
//     caches.match(event.request).then(function(response) {
//       return response || new Response("Nothing in the cache for this request");
//     })
//   );
// });
//
//


self.addEventListener('fetch', function(event) {
  console.log("fetch called > ", event.request.url)
  event.respondWith(
    new Response("THIS IS THE SERVICE WORKER")
  );
});
