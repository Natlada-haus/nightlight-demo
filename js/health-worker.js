/* Moonpuff v3 — Web Worker: unzip + scan an Apple Health export off the UI thread. Nothing leaves the device. */
importScripts("../vendor/fflate.min.js", "health-parse.js");
var lastSent = 0;
self.onmessage = function (e) {
  var file = e.data && e.data.file;
  if (!file) return;
  self.NLHealth.readFile(file, function (p) {
    var now = Date.now();
    if (now - lastSent > 150 || p >= 1) { lastSent = now; self.postMessage({ type: "progress", p: p }); }
  }, self.fflate).then(function (r) {
    self.postMessage({ type: "done", nights: r.nights, records: r.records, scanned: r.scanned, name: r.name });
  }, function (err) {
    self.postMessage({ type: "error", msg: String(err && err.message || err) });
  });
};
