import Map from 'ol/Map.js';
import TileLayer from 'ol/layer/WebGLTile.js';
import GeoTIFF from 'ol/source/GeoTIFF.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/WebGLTile.js';
import GeoTIFF from 'ol/source/GeoTIFF.js';
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4.js';
import {get as getProjection} from 'ol/proj.js';

proj4.defs(
  'EPSG:2056',
  '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 ' +
    '+k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +units=m +no_defs',
);
register(proj4);
const projection = getProjection('EPSG:2056');

const max = 3000;
function normalize(value) {
  return ['/', value, max];
}

const red = normalize(['band', 1]);

const trueColor = {
  color: ['array', red, 0, 0, 1],
  gamma: 1.1,
};

const ndvi = {
  color: [
    'interpolate',
    ['linear'],
    ['*', 30, red],
    // color ramp for NDVI values, ranging from -1 to 1
    -0.2,
    [191, 191, 191],
    -0.1,
    [219, 219, 219],
    0,
    [255, 255, 224],
    0.025,
    [255, 250, 204],
    0.05,
    [237, 232, 181],
    0.075,
    [222, 217, 156],
    0.1,
    [204, 199, 130],
    0.125,
    [189, 184, 107],
    0.15,
    [176, 194, 97],
    0.175,
    [163, 204, 89],
    0.2,
    [145, 191, 82],
    0.25,
    [128, 179, 71],
    0.3,
    [112, 163, 64],
    0.35,
    [97, 150, 54],
    0.4,
    [79, 138, 46],
    0.45,
    [64, 125, 36],
    0.5,
    [48, 110, 28],
    0.55,
    [33, 97, 18],
    0.6,
    [15, 84, 10],
    0.65,
    [0, 69, 0],
  ],
};

const ndviPalettePlasma = {
  color: [
    'palette',
    ['interpolate', ['linear'], red, 0, 0, 20, 4],
    ['#0d0887', '#7e03a8', '#cb4778', '#f89540', '#f0f921'],
  ],
};
const ndviPaletteViridis = {
  color: [
    'palette',
    ['interpolate', ['linear'], red, 0, 0, 20, 4],
    ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
  ],
};

const layer = new TileLayer({
  style: trueColor,
  source: new GeoTIFF({
    normalize: false,
    sources: [
      {
        url: 'https://windwurfs1.s3.dualstack.eu-central-1.amazonaws.com/subset/WI_1_masked_ZG_Int8_pos.tif',
      },
    ],
  }),
});

const map = new Map({
  target: 'map',
  layers: [layer],
  view: new View({
    projection: 'EPSG:2056',
    center: [2687000, 1216000],
    zoom: 18,
    maxZoom: 24,
  }),
});

const styles = {
  trueColor,
  //  ndvi,
  ndviPalettePlasma,
  ndviPaletteViridis,
};

const styleSelector = document.getElementById('style');

function update() {
  const style = styles[styleSelector.value];
  layer.setStyle(style);
}
styleSelector.addEventListener('change', update);
