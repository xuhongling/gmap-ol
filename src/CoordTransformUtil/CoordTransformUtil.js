/**
 * web墨卡托转经纬度
 * @param mercator_longitude
 * @param mercator_latitude
 * @returns {*[]}
 */
export function mercatorTowgs84(mercatorLon, mercatorLat) {
  let lon = 0;
  let lat = 0;

  let x = (mercatorLon / 20037508.34) * 180;
  let y = (mercatorLat / 20037508.34) * 180;

  y = (180 / Math.PI) * (2 * Math.atan(Math.exp((y * Math.PI) / 180)) - Math.PI / 2);

  lon = x;
  lat = y;

  return [lon, lat];
}

/**
 * 经纬度转web墨卡托
 * @param longitude
 * @param latitude
 * @returns {*[]}
 */
export function wgs84ToMercator(lon, lat) {
  let mercatorLon = 0;
  let mercatorLat = 0;

  let x = (lon * 20037508.34) / 180;
  let y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);

  y = (y * 20037508.34) / 180;

  mercatorLon = x;
  mercatorLat = y;

  return [mercatorLon, mercatorLat];
}

// 定义一些常量
let x_PI = (3.14159265358979324 * 3000.0) / 180.0;
let PI = 3.1415926535897932384626;
let A = 6378245.0;
let EE = 0.00669342162296594323;

/**
 * 百度坐标系 (BD-09) 与 火星坐标系 (GCJ-02) 的转换
 * 即 百度 转 谷歌、高德
 * @param bd_longitude
 * @param bd_latitude
 * @returns {*[]}
 */
export function bd09Togcj02(bd_lng, bd_lat) {
  var bd_lng = +bd_lng;
  var bd_lat = +bd_lat;
  var x = bd_lng - 0.0065;
  var y = bd_lat - 0.006;
  var z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_PI);
  var theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_PI);
  var gg_lng = z * Math.cos(theta);
  var gg_lat = z * Math.sin(theta);
  return [gg_lng, gg_lat];
}

/**
 * 火星坐标系 (GCJ-02) 与百度坐标系 (BD-09) 的转换
 * 即 谷歌、高德 转 百度
 * @param longitude
 * @param latitude
 * @returns {*[]}
 */
export function gcj02Tobd09(lng, lat) {
  var lat = +lat;
  var lng = +lng;
  var z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * x_PI);
  var theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * x_PI);
  var bd_lng = z * Math.cos(theta) + 0.0065;
  var bd_lat = z * Math.sin(theta) + 0.006;
  return [bd_lng, bd_lat];
}

/**
 * WGS-84 转 GCJ-02
 * @param longitude
 * @param latitude
 * @returns {*[]}
 */
export function wgs84Togcj02(lng, lat) {
  var lat = +lat;
  var lng = +lng;
  if (out_of_china(lng, lat)) {
    return [lng, lat];
  } else {
    var dlat = transformlat(lng - 105.0, lat - 35.0);
    var dlng = transformlng(lng - 105.0, lat - 35.0);
    var radlat = (lat / 180.0) * PI;
    var magic = Math.sin(radlat);
    magic = 1 - EE * magic * magic;
    var sqrtmagic = Math.sqrt(magic);
    dlat = (dlat * 180.0) / (((A * (1 - EE)) / (magic * sqrtmagic)) * PI);
    dlng = (dlng * 180.0) / ((A / sqrtmagic) * Math.cos(radlat) * PI);
    var mglat = lat + dlat;
    var mglng = lng + dlng;
    return [mglng, mglat];
  }
}

/**
 * GCJ-02 转换为 WGS-84
 * @param longitude
 * @param latitude
 * @returns {*[]}
 */
export function gcj02Towgs84(lng, lat) {
  var lat = +lat;
  var lng = +lng;
  if (out_of_china(lng, lat)) {
    return [lng, lat];
  } else {
    var dlat = transformlat(lng - 105.0, lat - 35.0);
    var dlng = transformlng(lng - 105.0, lat - 35.0);
    var radlat = (lat / 180.0) * PI;
    var magic = Math.sin(radlat);
    magic = 1 - EE * magic * magic;
    var sqrtmagic = Math.sqrt(magic);
    dlat = (dlat * 180.0) / (((A * (1 - EE)) / (magic * sqrtmagic)) * PI);
    dlng = (dlng * 180.0) / ((A / sqrtmagic) * Math.cos(radlat) * PI);
    var mglat = lat + dlat;
    var mglng = lng + dlng;
    return [lng * 2 - mglng, lat * 2 - mglat];
  }
}

export function transformlat(lng, lat) {
  var lat = +lat;
  var lng = +lng;
  var ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  ret += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) / 3.0;
  ret += ((160.0 * Math.sin((lat / 12.0) * PI) + 320 * Math.sin((lat * PI) / 30.0)) * 2.0) / 3.0;
  return ret;
}

export function transformlng(lng, lat) {
  var lat = +lat;
  var lng = +lng;
  var ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  ret += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) / 3.0;
  ret += ((150.0 * Math.sin((lng / 12.0) * PI) + 300.0 * Math.sin((lng / 30.0) * PI)) * 2.0) / 3.0;
  return ret;
}

/**
 * 判断是否在国内，不在国内则不做偏移
 * @param longitude
 * @param latitude
 * @returns {boolean}
 */
export function out_of_china(lng, lat) {
  var lat = +lat;
  var lng = +lng;
  // 纬度 3.86~53.55, 经度 73.66~135.05
  return !(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55);
}
