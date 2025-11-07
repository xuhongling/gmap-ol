import { Vector as VectorLayer, Tile as TileLayer } from 'ol/layer';
import { Vector as VectorSource, TileWMS } from 'ol/source';
import { getLayerByName } from '../LayerUtil/LayerUtil';
import { GeoJSON } from 'ol/format';

/**
 * 向地图添加WMS瓦片图层
 *
 * @param {import("ol/Map").default} olmap - 目标地图实例
 * @param {Object} wmsOptions - WMS图层配置项
 * @param {string} [wmsOptions.layerName=''] - 图层名称（用于标识）
 * @param {string} [wmsOptions.url=''] - WMS服务地址
 * @param {string} wmsOptions.layers - WMS图层名（对应服务端的图层标识）
 * @param {string[]} [wmsOptions.filter=[]] - CQL过滤条件数组（将拼接为CQL_FILTER参数）
 * @param {boolean} [wmsOptions.visible=true] - 初始可见性
 * @param {number} [wmsOptions.zIndex=5] - 图层层级
 * @param {Object} [wmsOptions.params={}] - 额外的WMS请求参数
 */
export function addWmsLayer(olmap, wmsOptions) {
  // 地图实例不存在时终止执行
  if (!olmap) return;

  // 解构配置项并设置默认值
  const {
    layerName = '',
    url = '',
    layers,
    filter = [],
    visible = true,
    zIndex = 5,
    params = {}
  } = wmsOptions;

  // 处理CQL过滤条件（拼接为字符串）
  const cqlFilter = filter.length > 0 ? filter.join(' and ') : '';

  // 创建WMS瓦片图层
  const wmsLayer = new TileLayer({
    source: new TileWMS({
      url: `${url}/wms`, // 拼接完整WMS服务地址
      params: {
        layers, // 必选参数：服务端图层名
        ...(cqlFilter && { CQL_FILTER: cqlFilter }), // 可选：添加CQL过滤参数
        ...params // 合并额外参数
      },
      serverType: 'geoserver', // 服务类型（默认GeoServer）
      crossOrigin: 'anonymous' // 跨域设置
    }),
    visible,
    zIndex
  });

  // 设置图层标识属性
  wmsLayer.set('layerName', layerName);
  olmap.addLayer(wmsLayer);
}

/**
 * 向地图添加WFS矢量图层（动态加载要素）
 *
 * @param {import("ol/Map").default} olmap - 目标地图实例
 * @param {Object} wfsOptions - WFS图层配置项
 * @param {string} [wfsOptions.layerName=''] - 图层名称（用于标识）
 * @param {string} [wfsOptions.url=''] - WFS服务地址
 * @param {string} wfsOptions.layers - WFS图层名（对应服务端的图层标识）
 * @param {import("ol/style/Style").default|((feature: import("ol/Feature").default) => import("ol/style/Style").default)} wfsOptions.style - 要素样式
 * @param {string[]} [wfsOptions.filter=[]] - CQL过滤条件数组（将拼接为cql_filter参数）
 * @param {boolean} [wfsOptions.visible=true] - 初始可见性
 * @param {number} [wfsOptions.zIndex=5] - 图层层级
 */
export function addWfsLayer(olmap, wfsOptions) {
  // 解构配置项并设置默认值
  const {
    layerName = '',
    url = '',
    layers,
    style,
    filter = [],
    visible = true,
    zIndex = 5
  } = wfsOptions;

  // 获取地图当前投影
  const view = olmap.getView();
  const projection = view.getProjection().getCode();

  // 处理CQL过滤条件（拼接为字符串）
  const cqlFilter = filter.length > 0 ? `&cql_filter=${filter.join(' and ')}` : '';

  // 创建WFS矢量图层
  const wfsLayer = new VectorLayer({
    source: new VectorSource({
      projection, // 投影坐标系
      format: new GeoJSON(), // 要素格式（GeoJSON）
      url: () => {
        // 动态生成WFS请求URL（包含当前视图参数）
        return `${url}/wfs?` +
          `service=WFS&version=1.1.0&request=GetFeature&` +
          `typename=${layers}&outputFormat=application/json&` +
          `srsname=${projection}${cqlFilter}`;
      }
    }),
    style, // 要素样式
    visible,
    zIndex
  });

  // 设置图层标识属性
  wfsLayer.set('layerName', layerName);
  olmap.addLayer(wfsLayer);
}

/**
 * 为WMS瓦片图层绑定点击事件，获取要素信息并触发回调
 * 同时处理鼠标悬停时的光标样式变化
 *
 * @param {import("ol/Map").default} olmap - 目标地图实例
 * @param {Object} wfsOptions - 配置项（与图层标识相关）
 * @param {string} [wfsOptions.layerName=''] - 目标WMS图层的名称（用于查找图层）
 * @param {string} [wfsOptions.layers=''] - 需查询的WMS图层名（服务端标识）
 * @param {Object} [wfsOptions.params={}] - 额外的查询参数
 * @param {(features: import("ol/Feature").default[]) => void} getFeatureCallbackFn - 获取要素后的回调函数（参数为要素数组）
 */
export function getWmsFeature(olmap, wfsOptions, getFeatureCallbackFn) {
  const { layerName = '', layers = '', params = {} } = wfsOptions;
  // 根据名称查找目标WMS图层
  const wmsLayer = getLayerByName(olmap, layerName);

  if (!wmsLayer) return; // 图层不存在时终止

  // 绑定地图点击事件（获取要素信息）
  olmap.on('singleclick', async (event) => {
    const view = event.map.getView();
    const resolution = view.getResolution(); // 当前视图分辨率

    // 图层可见时才发起查询
    if (wmsLayer.getVisible()) {
      // 生成要素信息查询URL
      const url = wmsLayer.getSource().getFeatureInfoUrl(
        event.coordinate, // 点击坐标
        resolution,
        view.getProjection(),
        {
          INFO_FORMAT: 'application/json', // 返回格式
          FEATURE_COUNT: 5, // 最大返回要素数
          query_layers: layers, // 需查询的图层
          ...params // 合并额外参数
        }
      );

      if (url) {
        // 发起请求并处理结果
        fetch(url)
          .then(response => response.json())
          .then(data => {
            if (data.features?.length > 0 && getFeatureCallbackFn) {
              getFeatureCallbackFn(data.features); // 触发回调
            }
          })
          .catch(error => console.error('WMS要素查询失败:', error));
      }
    }
  });

  // 绑定鼠标移动事件（改变光标样式）
  olmap.on('pointermove', (evt) => {
    if (evt.dragging) return; // 拖拽时不处理

    // 判断鼠标是否悬停在图层要素上（通过像素数据透明度判断）
    const pixelData = wmsLayer.getData(evt.pixel);
    const isHovering = pixelData && pixelData[3] > 0; // 非透明像素表示有要素

    // 设置光标样式
    evt.map.getTargetElement().style.cursor = isHovering ? 'pointer' : '';
  });
}

/**
 * 更新WFS图层的过滤条件（CQL_FILTER）并刷新数据
 *
 * @param {import("ol/Map").default} olmap - 目标地图实例
 * @param {Object} wfsOptions - 配置项
 * @param {string} [wfsOptions.layerName=''] - 目标WFS图层的名称（用于查找图层）
 * @param {string[]} [wfsOptions.filter=[]] - 新的CQL过滤条件数组
 */
export function updateWfsFilter(olmap, wfsOptions) {
  const { layerName = '', filter = [] } = wfsOptions;
  // 根据名称查找目标WFS图层
  const wfsLayer = getLayerByName(olmap, layerName);

  if (!wfsLayer) return; // 图层不存在时终止

  // 获取当前数据源的URL生成函数（或字符串）
  const source = wfsLayer.getSource();
  const currentUrl = typeof source.getUrl() === 'function'
    ? source.getUrl()() // 动态URL需执行函数获取
    : source.getUrl();

  if (!currentUrl) return; // URL不存在时终止

  // 解析URL并处理参数
  const urlObj = new URL(currentUrl);
  const params = new URLSearchParams(urlObj.search);

  // 更新或移除cql_filter参数
  if (filter.length > 0) {
    params.set('cql_filter', filter.join(' and '));
  } else {
    params.delete('cql_filter');
  }

  // 更新URL参数并刷新数据源
  urlObj.search = params.toString();
  source.setUrl(urlObj.toString());
  source.refresh(); // 强制刷新数据
}
