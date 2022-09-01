import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import GeoJSON from 'ol/format/GeoJSON';

// EPSG:4326: WGS84 地理坐标系，EPSG:4326
// EPSG:3857: wgs 横轴墨卡托 EPSG:3857
// EPSG:2000: 国家2000 地理坐标系
// EPSG:2000e: 国家2000 120e 投影坐标系
proj4.defs([
  ['EPSG:4326', '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees'],
  ['EPSG:4269', '+title=NAD83 (long/lat) +proj=longlat +a=6378137.0 +b=6356752.31414036 +ellps=GRS80 +datum=NAD83 +units=degrees'],
  ['EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs'],
  ['EPSG:2000', '+proj=longlat +ellps=GRS80 +no_defs'],
  ['EPSG:2000e', '+proj=tmerc +lat_0=0 +lon_0=120 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs'],
]);
register(proj4);

// openlayers自定义投影坐标系(EPSG:4542)，GeoJSON读取geometry和坐标转换
export function projTransform(geoJson, metaData = 'EPSG:3857', afterData = 'EPSG:4326') {
  if (typeof geoJson === 'string') {
    try {
      geoJson = JSON.parse(geoJson);
    } catch (error) {
      console.log('convert data ...', error);
    }
  }
  let geojsonFeature = new GeoJSON().readFeatures(geoJson, {
    dataProjection: metaData, // 元数据的投影坐标
    featureProjection: afterData, // 规定要素以哪种坐标显示
  });
  return geojsonFeature;
}
