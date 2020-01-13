var cacheName = 'avanca+-v1.1';

self.addEventListener('install', event => {

  self.skipWaiting();

  event.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll([

        './index.html',
        './camera.html',
        './graph.html',
        './round1.html',
        './round2.html',

        './assets/css/bootstrap.min.css',
        './assets/css/camera.style.css',
        './assets/css/graph.style.css',
        './assets/css/mdb.min.css',
        './assets/css/style.css',

        './assets/js/adapter.min.js',
        './assets/js/app.js',
        './assets/js/bootstrap.min.js',
        './assets/js/chart.min.js',
        './assets/js/chartjs-plugin-datalabels.min.js',
        './assets/js/instascan.min.js',
        './assets/js/jquery.min.js',
        './assets/js/mdb.min.js',
        './assets/js/popper.min.js',
        './assets/js/vue.min.js',

        './assets/img/background.png',
        './assets/img/favicon.png',
        './assets/img/logo.png',
        './assets/img/icon_128.png',
        './assets/img/icon_144.png',
        './assets/img/icon_152.png',
        './assets/img/icon_167.png',
        './assets/img/icon_180.png',
        './assets/img/icon_192.png',
        './assets/img/icon_256.png',
        './assets/img/icon_512.png',
        './assets/img/formulas.JPG',
      ]))
  );
});

self.addEventListener('message', function (event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', function (event) {
  //Atualizacao internet
  // event.respondWith(async function () {
  //   try {
  //     return await fetch(event.request);
  //   } catch (err) {
  //     return caches.match(event.request);
  //   }
  // }());

  //Atualizacao cache
  event.respondWith(
    caches.match(event.request)
      .then(function (response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );

});