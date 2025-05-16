import Map from "ol/Map.js";
import TileLayer from "ol/layer/WebGLTile.js";
import GeoTIFF from "ol/source/GeoTIFF.js";

const source = new GeoTIFF({
  sources: [
    {
      url: "https://windwurfs1.s3.eu-central-1.amazonaws.com/S1_LRW_PD12_SP6_20150107-20150118.tif",
      bands: [1, 2],
      min: -30.0,
      nodata: 0,
      max: 30.0,
    },
    {
      url: "https://windwurfs1.s3.eu-central-1.amazonaws.com/S1_LRW_PD12_SP6_20150101-20150112.tif",
      bands: [1, 2],
      min: -30.0,
      nodata: 0,
      max: 30.0,
    },
  ],
});
source.setAttributions(
  "<a href='https://s2maps.eu'>Sentinel-2 cloudless</a> by <a href='https://eox.at/'>EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2019)"
);

const ndvi = [
  "/",
  ["-", ["band", 2], ["band", 1]],
  ["+", ["band", 2], ["band", 1]],
];

const ndwi = [
  "/",
  ["-", ["band", 3], ["band", 1]],
  ["+", ["band", 3], ["band", 1]],
];

const map = new Map({
  target: "map",
  layers: [
    new TileLayer({
      style: {
        color: [
          "color",
          // red: | NDVI - NDWI |
          ["*", 255, ["abs", ["-", ndvi, ndwi]]],
          // green: NDVI
          ["*", 255, ndvi],
          // blue: NDWI
          ["*", 255, ndwi],
          // alpha
          ["band", 4],
        ],
      },
      source,
    }),
  ],
  view: source.getView(),
});
