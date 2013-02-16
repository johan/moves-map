/**
 * Mercator Puzzle Redux
 * Built by Bramus! - http://www.bram.us/
 *
 * Inspired upon the original Mercator Puzzle:
 * http://gmaps-samples.googlecode.com/svn/trunk/poly/puzzledrag.html
 *
 * Used Country data: https://github.com/johan/world.geo.json/countries.geo.json
 * Beware though: Antarctica has been omitted from it as that one
 * can color the whole world instead of ATA itself
 *
 * Uses google.maps.Polygon.moveTo (amongst other extensions):
 * https://github.com/bramus/google-maps-polygon-moveto
 */

var maxCountries = parseInt(location.hash.slice(1) || '', 10) || 15;

/**
 * Get X random number beneath an upper limit
 * @param  {int} numItems The number of numbers you want generated
 * @param  {int} max      The max value a number may be
 * @return {array}  The array with numbers
 */
function getXRandomNumbersBeneathMax(numItems, max) {
  var toReturn = [];
  while(toReturn.length < numItems){
    var randomnumber = Math.ceil(Math.random() * max);
    var found = false;
    for (var i = 0, l = toReturn.length; i < l; i++){
      if (toReturn[i] == randomnumber) {
        found = true;
        break;
      }
    }
    if (!found) {
      toReturn.push(randomnumber);
    }
  }
  return toReturn;
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


window.addEventListener('load', function(e) {

  // Our map
  var map = new google.maps.Map(document.getElementById('map_canvas'), {
    zoom: 2,
    minZoom: 1,
    maxZoom: 6,
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

  // Get 15 random indexes. We'll show these 15 on screen.
  var countriesToShow = getXRandomNumbersBeneathMax(maxCountries, countries.features.length);
  var totalScore = 0;

  countries.features.forEach(function(item, i) {

    // Don't show it if it's not one of our selected
    if (countriesToShow.indexOf(i) < 0) return;

    // Create a polygon of our country
    var poly = new google.maps.Polygon({
      paths: geoJSONgeometry2GMapsCoords(item.geometry),
      strokeColor: '#FF0000',
      strokeOpacity: 1,
      strokeWeight: 1,
      fillColor: '#FF0000',
      fillOpacity: 0.4,
      countryCode: item.id,
      countryNum: i,
      countryName: item.properties.name,
      // I know, we recalc this here,
      // but that's because we want a copy/clone of the paths:
      countryPaths: geoJSONgeometry2GMapsCoords(item.geometry),
      draggable: true,
      geodesic: true,
      zIndex: 2
    });

    // define targetBounds in which the shape should end up being placed in
    var targetBounds = poly.getBounds().expand(
      google.maps.geometry.spherical.computeArea(poly.getPath()) / 1e9 < 20
      ? 10 : 5
    );

    // Move the polygon to some random place on the map
    poly.moveTo(new google.maps.LatLng(Math.random() * 100 - 50, Math.random() * 300 - 150)).setMap(map);

    // Show the polygon on the map
    poly.setMap(map);

    // When we've dragged around our polygon(s), check if it's aligned right
    google.maps.event.addListener(poly, 'dblclick', function(e) {
      if (this.draggable) placeCountry(this, false);
    });
    google.maps.event.addListener(poly, 'dragend', function(e) {
      if (targetBounds.containsPath(this.getPaths())) {
        placeCountry(this, true);
      }
    });

    function placeCountry(poly, incrementScore) {
      // Update the poly
      var color = (incrementScore) ? '#00FF00' : '#0000FF';
      poly.setOptions({
        paths: poly.countryPaths,
        strokeColor: color,
        fillColor: color,
        draggable: false,
        zIndex: 1
      });

      // Give feedback to the user
      var message;
      if (!incrementScore) {
        message = 'Alas, that was ' + poly.countryName;
      } else {
        message = 'Nice! That is ' + poly.countryName + ' indeed.';
        totalScore++;
      }

      // Adjust countriesToShow + end game if needed
      countriesToShow.splice(countriesToShow.indexOf(poly.countryNum), 1);
      if (countriesToShow.length == 0) {
        message += ' // Game Finished! Hit refresh to start a new game!';
      }

      document.getElementById('message').textContent = message;
      document.getElementById('score').textContent = totalScore + '/' + maxCountries;
    }
  });
});
