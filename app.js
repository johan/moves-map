/**
 * Moves.app country visit visualizer
 * site scaffolding, c/o Bramus' https://github.com/bramus/mercator-puzzle-redux
 */

var map;

window.addEventListener('load', loaded);

function loaded(e) {
  // map object intentionally leaked into global scope
  map = new google.maps.Map(document.getElementById('map_canvas'), {
    zoom: 2,
    minZoom: 1,
    disableDoubleClickZoom: true,
    scrollwheel: true,
    center: new google.maps.LatLng(35, -20),
    mapTypeId: google.maps.MapTypeId.TERRAIN
  });

  // Custom map style, borrowed from Gowalla (remember the days!)
  var gowallaStyles =
    [ { featureType: "road"
      , elementType: "labels"
      , stylers: [ { visibility: "simplified" }, { lightness: 20 } ]
      }
    , { featureType: "administrative.province"
      , elementType: "all"
      , stylers: [ { "visibility": "off" } ]
      }
    , { featureType: "administrative.land_parcel"
      , elementType: "all"
      , stylers: [ { visibility: "off" } ]
      }
    , { featureType: "landscape.man_made"
      , elementType: "all"
      , stylers: [ { visibility: "off" } ]
      }
    , { featureType: "transit"
      , elementType: "all"
      , stylers: [ { visibility: "off" } ]
      }
    , { featureType: "road.local"
      , elementType: "all"
      , stylers: [ { visibility: "off" } ]
      }
    , { featureType: "road.highway"
      , elementType: "labels"
      , stylers: [ { visibility: "simplified" } ]
      }
    , { featureType: "poi"
      , elementType: "labels"
      , stylers: [ { visibility: "off" } ]
      }
    , { featureType: "road.arterial"
      , elementType: "labels"
      , stylers: [ { visibility: "off" } ]
      }
    , { featureType: "water"
      , elementType: "all"
      , stylers: [ { hue: "#a1cdfc" }, { saturation: 30 }, { lightness: 49 } ]
      }
    , { featureType: "road.highway"
      , elementType: "geometry"
      , stylers: [ { hue: "#f49935" } ]
      }
    , { featureType: "road.arterial"
      , elementType: "geometry"
      , stylers: [ { hue: "#fad959" } ]
      }
    ];
  map.mapTypes.set(
    'gowalla',
    new google.maps.StyledMapType(gowallaStyles, {name: "Gowalla"})
  );
  map.setMapTypeId('gowalla');
}

function makeCountry(country) {
  return new google.maps.Polygon({
    paths: geoJSONgeometry2GMapsCoords(country.geometry),
    strokeColor: '#00f',
    strokeOpacity: 1,
    strokeWeight: 1,
    fillColor: '#88f',
    fillOpacity: 0.4,
    countryCode: country.id,
    countryName: country.properties.name,
    draggable: false,
    geodesic: true,
    zIndex: 1
  });
}

/**
 * Convert GeoJSON geometry to coordinates usable in Google Maps
 * @param  {string} geometryType  The Geometry Type. Polygon or MultiPolygon
 * @param  {json} geoJSONCoords The coordindates in GeoJSON format
 * @return {array} The coordinates in a format usable by Google Maps
 */
function geoJSONgeometry2GMapsCoords(geometry) {
  var geometryType = geometry.type;
  var geoJSONCoords = geometry.coordinates;
  var paths = [];
  geoJSONCoords.forEach(function(coords) {
    var shapeCoords = [];
    coords = geometryType == 'Polygon' ? coords : coords[0];
    coords.forEach(function(coord) {
      if (isNaN(coord[0]) || isNaN(coord[1])) return;
      shapeCoords.push(new google.maps.LatLng(coord[1], coord[0]));
    });
    paths.push(shapeCoords);
  });
  return paths;
}

var USA; // save a global reference for the replaced actual country

// increase geographic resolution for USA to raise make states into "countries":
((features) => {
  USA = features.filter(c => c.id === 'USA')[0];
  features.splice(features.indexOf(USA), 1, ...states.features);
})(countries.features);

const isoTimeRe = /^(\d{4})-?(\d\d)-?(\d\d)T(\d\d):?(\d\d):?(\d\d)[\d\.]*Z$/;

function approximateStartTime(segment) {
  const tzOffsInMs = segment.place.location.lon * 24 / 360 * 3600e3;
  const [x, y, m, d, H, M, S] = isoTimeRe.exec(segment.startTime).map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, H, M, S) - tzOffsInMs);
  return t.toISOString().replace(isoTimeRe, '$1-$2-$3 $4:$5');
}

function approximateStartDate(segment) {
  return approximateStartTime(segment).split(' ')[0];
}
