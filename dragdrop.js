// http://www.html5rocks.com/en/tutorials/file/dndfiles/
document.addEventListener('dragover', handleDragOver);
document.addEventListener('drop', handleFileSelect);

var polys, bounds, visited = {};

function handleFileSelect(event) {
  var files = event.dataTransfer.files // FileList object
    , about = []
    , shape = null;
  event.stopPropagation();
  event.preventDefault();

  for (var i = 0, file; file = files[i]; i++) {
    // f.name, f.size, f.type (doesn't grok "json"), f.lastModifiedDate
    readFileAsText(file, gotMovesExport);
  }
}

function readFileAsText(file, cb) {
  var reader = new FileReader;
  reader.onload = function(e) {
    cb(e.target.result, file);
  };
  reader.readAsText(file);
}

function handleDragOver(event) {
  event.stopPropagation();
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

function expose(obj) {
  for (var key in obj) {
    window[key] = obj[key];
  }
  return obj;
}

function wasAtOnDay(day) {
  const n = String(this);
  return (day.segments || []).some(s => s && s.place && s.place.name === n);
}

function gotMovesExport(content, file) {
  var json = JSON.parse(content.replace(/\,\]\}$/, ']}'));
  console.log('Dropped file exposed as variable "json":', json);
  const days = json.export;
  const segments = days.reduce(
    (segs, d) => d.segments ? segs.concat(d.segments) : segs,
    []
  ).sort((a, b) => a.startTime < b.startTime ? -1 : 1);
  const places = segments.filter(s => s.place).reduce(
    (places, s) => ((places[s.place.id] = s.place), places),
    {}
  );
  console.log('Exposed objects:', Object.keys(expose({days,segments,places})));
  [window.D, window.S, window.P] = [days, segments, places];

  polys = countries.features.map(makeCountry);
  bounds = polys.map(p => p.getBounds());
  for (const id in places) {
    const place = places[id];
    const where = featureNoAroundLatLng(place.location);
    if (where !== undefined) {
      const country = countries.features[where];
      place.country = country.id;
      visited[place.country] = country;
    }
  }

  for (let iso in visited) {
    const index = countries.features.indexOf(visited[iso]);
    polys[index].setMap(map);
  }

  logTravel(segments, places);
}

function logTravel(segments, places) {
  segments = segments.filter(s => s.place);

  let last = null;
  for (const seg of segments) {
    const {country} = places[seg.place.id];
    if (country && country !== last) {
      console.log(approximateStartTime(seg), country, seg.place.name || '');
      last = country;
    }
  }
}

function featureNoAroundLatLng(loc) {
  if (typeof loc === 'object' && loc.hasOwnProperty('lon')) {
    loc = new google.maps.LatLng(loc.lat, loc.lon);
  }

  // first check if the rough polygons contain it
  for (let i = 0; i < polys.length; i++) {
    // perf: no need to check countries the coordinate is out of bounds for
    if (!bounds[i].contains(loc)) continue;
    if (google.maps.geometry.poly.containsLocation(loc, polys[i])) return i;
  }

  // then check, by increasing orders of magnitudes of tolerance, if we're close
  for (t = -3; t <= 0; t++) {
    const degrees = Math.pow(1, t); // tolerance(°) - ~111m, 1.1km, 11km, 111km
    for (let i = 0; i < polys.length; i++) {
      if (!bounds[i].contains(loc)) continue;
      if (google.maps.geometry.poly.isLocationOnEdge(loc, polys[i], degrees))
        return i;
    }
  }
}

function wasAtOnDay(day) {
  const n = String(this);
  return (day.segments || []).some(s => s.place && s.place.name === n);
}
