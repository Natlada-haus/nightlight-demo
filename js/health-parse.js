/* Moonpuff v3 — Apple Health sleep import, parsed entirely on this device (never uploaded).
   Used by js/health-worker.js (Web Worker, preferred) and by app.js as a main-thread fallback.

   - export.zip: read the ZIP central directory from the end of the file, find apple_health_export/export.xml,
     then stream-inflate ONLY that entry in 4 MB slices with fflate (vendor/fflate.min.js, MIT). Nothing is held
     whole in memory, so exports of hundreds of MB work. ZIP64 sizes/offsets are understood.
   - export.xml: read in 4 MB slices.
   - A small chunk scanner looks for `<Record ... type="HKCategoryTypeIdentifierSleepAnalysis" ...>` opening tags
     and reads 4 attributes with string search (no DOMParser over the whole file).
   - buildNights(): group into nights (noon-to-noon in the record's own clock; a 01:00 start belongs to the
     previous evening), merge the UNION of all asleep-* intervals across sources (Watch + iPhone overlaps are
     not double-counted), never count InBed or Awake as sleep. */
(function (root) {
  "use strict";
  var CHUNK = 4 * 1024 * 1024;
  var SLEEP_TYPE = "HKCategoryTypeIdentifierSleepAnalysis";

  function attr(tag, name) {
    var k = tag.indexOf(" " + name + '="');
    if (k < 0) k = tag.indexOf("\n" + name + '="');
    if (k < 0) k = tag.indexOf("\t" + name + '="');
    if (k < 0) return null;
    var a = k + name.length + 3, b = tag.indexOf('"', a);
    return b < 0 ? null : tag.slice(a, b);
  }
  /* "2026-11-10 23:08:00 +0700" → { t: UTC ms, off: minutes east of UTC } */
  function parseDate(s) {
    var m = /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)(?::(\d\d))?\s*(?:([+-])(\d\d):?(\d\d)|Z)?/.exec(s || "");
    if (!m) return null;
    var wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
    var off = m[7] ? (m[7] === "-" ? -1 : 1) * (+m[8] * 60 + +m[9]) : (m[0].indexOf("Z") > -1 ? 0 : 420);
    return { t: wall - off * 60000, off: off };
  }
  /* value → "sleep" | "bed" | null (awake / unknown). Close variants (e.g. a future AsleepXyz) count as sleep. */
  function kindOf(v) {
    if (v == null) return null;
    if (/^\d+$/.test(v)) return { 0: "bed", 1: "sleep", 2: null, 3: "sleep", 4: "sleep", 5: "sleep" }[+v] || null;
    if (v.indexOf("Awake") > -1) return null;
    if (v.indexOf("InBed") > -1) return "bed";
    if (v.indexOf("Asleep") > -1) return "sleep";
    return null;
  }

  function Scanner() { this.buf = ""; this.recs = []; this.seen = 0; }
  Scanner.prototype.push = function (text) {
    var b = this.buf + text, i = 0, j, k;
    while ((j = b.indexOf("<Record", i)) !== -1) {
      k = b.indexOf(">", j);
      if (k === -1) { this.buf = b.slice(j); return; }
      var c = b.charCodeAt(j + 7);   /* must be "<Record " (not "<RecordX") */
      if (c === 32 || c === 10 || c === 9 || c === 13) {
        var tag = b.slice(j, k);
        this.seen++;
        if (tag.indexOf(SLEEP_TYPE) > -1 && attr(tag, "type") === SLEEP_TYPE) {
          var kind = kindOf(attr(tag, "value")), s = parseDate(attr(tag, "startDate")), e = parseDate(attr(tag, "endDate"));
          if (kind && s && e && e.t > s.t && e.t - s.t < 20 * 3600000) this.recs.push({ k: kind, s: s.t, e: e.t, off: s.off, src: attr(tag, "sourceName") || "" });
        }
      }
      i = k + 1;
    }
    this.buf = b.slice(Math.max(i, b.length - 7));   /* keep a possible partial "<Record" */
  };

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hm(wallMs) { var d = new Date(wallMs); return pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()); }
  function union(iv) {
    iv.sort(function (a, b) { return a[0] - b[0]; });
    var out = [];
    iv.forEach(function (x) {
      var last = out[out.length - 1];
      if (last && x[0] <= last[1]) { if (x[1] > last[1]) last[1] = x[1]; } else out.push([x[0], x[1]]);
    });
    return out;
  }
  function total(iv) { return iv.reduce(function (a, x) { return a + (x[1] - x[0]); }, 0); }

  /* records → [{ date, bed, wake, mins, inBed }] sorted by date (date = the evening the night started) */
  function buildNights(recs, keep) {
    var by = {};
    recs.forEach(function (r) {
      var ws = r.s + r.off * 60000, we = r.e + r.off * 60000;     /* wall clock of the record's own time zone */
      var h = new Date(ws).getUTCHours();
      if (h >= 12 && h < 18) return;                              /* afternoon naps are not a night */
      var key = new Date(ws - 12 * 3600000).toISOString().slice(0, 10);
      var n = by[key] || (by[key] = { sleep: [], bed: [], srcs: {} });
      n[r.k].push([ws, we]); if (r.src) n.srcs[r.src] = 1;
    });
    var out = [];
    Object.keys(by).sort().forEach(function (key) {
      var n = by[key], sl = union(n.sleep), bd = union(n.bed);
      var mins = Math.round(total(sl) / 60000);
      if (mins < 30) return;                                      /* no asleep time recorded → not counted */
      var first = sl[0][0], bed = first;
      if (bd.length && bd[0][0] < first && first - bd[0][0] <= 90 * 60000) bed = bd[0][0];  /* in bed a little before sleep */
      out.push({ date: key, bed: hm(bed), wake: hm(sl[sl.length - 1][1]), mins: mins, inBed: bd.length ? Math.round(total(bd) / 60000) : 0, srcs: Object.keys(n.srcs).length });
    });
    return keep ? out.slice(-keep) : out;
  }

  /* ---------- file reading (async; works in a Worker and on the main thread) ---------- */
  function slice(file, a, b) { return file.slice(a, b).arrayBuffer().then(function (ab) { return new Uint8Array(ab); }); }
  function u16(d, o) { return d[o] | (d[o + 1] << 8); }
  function u32(d, o) { return (d[o] | (d[o + 1] << 8) | (d[o + 2] << 16)) + d[o + 3] * 16777216; }
  function u64(d, o) { return u32(d, o) + u32(d, o + 4) * 4294967296; }

  function findEntry(file) {
    var size = file.size, tailLen = Math.min(size, 65536 + 22 + 20);
    return slice(file, size - tailLen, size).then(function (t) {
      var e = -1;
      for (var i = t.length - 22; i >= 0; i--) if (t[i] === 0x50 && t[i + 1] === 0x4b && t[i + 2] === 5 && t[i + 3] === 6) { e = i; break; }
      if (e < 0) throw new Error("notzip");
      var cdSize = u32(t, e + 12), cdOff = u32(t, e + 16);
      var loc = e - 20;   /* ZIP64 end-of-central-directory locator sits just before */
      var z64 = loc >= 0 && t[loc] === 0x50 && t[loc + 1] === 0x4b && t[loc + 2] === 6 && t[loc + 3] === 7;
      var next = z64 ? slice(file, u64(t, loc + 8), u64(t, loc + 8) + 56).then(function (z) { cdSize = u64(z, 40); cdOff = u64(z, 48); }) : Promise.resolve();
      return next.then(function () { return slice(file, cdOff, cdOff + cdSize); });
    }).then(function (cd) {
      var o = 0, best = null;
      while (o + 46 <= cd.length && u32(cd, o) === 0x02014b50) {
        var method = u16(cd, o + 10), csize = u32(cd, o + 20), usize = u32(cd, o + 24), nlen = u16(cd, o + 28), xlen = u16(cd, o + 30), clen = u16(cd, o + 32), lho = u32(cd, o + 42);
        var name = new TextDecoder().decode(cd.subarray(o + 46, o + 46 + nlen));
        var x = o + 46 + nlen, xe = x + xlen;
        while (x + 4 <= xe) {   /* ZIP64 extra field: only the 0xFFFFFFFF fields are present, in this order */
          var id = u16(cd, x), sz = u16(cd, x + 2), p = x + 4;
          if (id === 1) {
            if (usize === 0xFFFFFFFF) { usize = u64(cd, p); p += 8; }
            if (csize === 0xFFFFFFFF) { csize = u64(cd, p); p += 8; }
            if (lho === 0xFFFFFFFF) { lho = u64(cd, p); }
          }
          x += 4 + sz;
        }
        if (/(^|\/)export\.xml$/i.test(name) && name.indexOf("__MACOSX") < 0) best = { name: name, method: method, csize: csize, usize: usize, lho: lho };
        o = xe + clen;
      }
      if (!best) throw new Error("noexport");
      return slice(file, best.lho, best.lho + 30).then(function (h) { best.data = best.lho + 30 + u16(h, 26) + u16(h, 28); return best; });
    });
  }

  /* readFile(file, onProgress(0..1)) → Promise<{ nights, records, scanned, name }> */
  function readFile(file, onProgress, fflate) {
    fflate = fflate || root.fflate;
    var sc = new Scanner(), dec = new TextDecoder("utf-8");
    onProgress = onProgress || function () {};
    function pump(start, end, feed) {
      var pos = start;
      function step() {
        if (pos >= end) return Promise.resolve();
        var b = Math.min(end, pos + CHUNK);
        return slice(file, pos, b).then(function (u8) { pos = b; feed(u8, pos >= end); onProgress((pos - start) / Math.max(1, end - start)); return step(); });
      }
      return step();
    }
    return slice(file, 0, 4).then(function (head) {
      var isZip = head[0] === 0x50 && head[1] === 0x4b && head[2] === 3 && head[3] === 4;
      if (!isZip) return pump(0, file.size, function (u8, last) { sc.push(dec.decode(u8, { stream: !last })); }).then(function () { return file.name || "export.xml"; });
      return findEntry(file).then(function (ent) {
        if (ent.method === 0) return pump(ent.data, ent.data + ent.csize, function (u8, last) { sc.push(dec.decode(u8, { stream: !last })); }).then(function () { return ent.name; });
        if (ent.method !== 8) throw new Error("method");
        if (!fflate) throw new Error("nofflate");
        var inf = new fflate.Inflate(function (chunk, final) { sc.push(dec.decode(chunk, { stream: !final })); });
        return pump(ent.data, ent.data + ent.csize, function (u8, last) { inf.push(u8, last); }).then(function () { return ent.name; });
      });
    }).then(function (name) {
      sc.push(dec.decode());
      return { nights: buildNights(sc.recs, 180), records: sc.recs.length, scanned: sc.seen, name: name };
    });
  }

  root.NLHealth = { Scanner: Scanner, buildNights: buildNights, parseDate: parseDate, kindOf: kindOf, readFile: readFile, union: union };
})(typeof self !== "undefined" ? self : this);
