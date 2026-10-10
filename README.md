# gmap-ol-ts

基于 OpenLayers 常用 API 封装的 TypeScript 工具库,是 [gmap-ol](https://github.com/xuhongling/gmap-ol) 的 TS 重写版。目标是为前端项目提供简便快捷的地图操作方法,包括地图数据加载、数据转换、地图效果、地图控件等功能。

相比旧版:全量 TypeScript(strict 模式)、完整的类型声明与 options 接口、ESM + CJS 双产物、Vite 库模式构建,并修复了旧版的一批已知缺陷(见文末「行为变更清单」)。

## 安装

```bash
npm install gmap-ol-ts --save
```

`ol`(>= 6.5.0,推荐 9.x)为 peerDependency,需项目自行安装:

```bash
npm install ol
```

### 从 gmap-ol 迁移

API 与旧版完全一致(同名函数、同参数),可用 npm alias 零改动替换:

```json
{
  "dependencies": {
    "gmap-ol": "npm:gmap-ol-ts@^0.1.0"
  }
}
```

## 使用

```ts
import { addPointLayer, measureLength, wgs84Togcj02 } from 'gmap-ol-ts';

// 添加点图层(GeoJSON)
addPointLayer(map, pointGeoJSON, {
  layerName: 'station',
  textFieldName: 'name',
  icon: '/assets/station.png',
});

// 测距
measureLength(map, { showSegments: true }, (length) => {
  console.log(length); // '1.23 km'
});

// 坐标转换
const [lon, lat] = wgs84Togcj02(116.4, 39.9);
```

样式表会随 JS 自动注入(`.ol-popup` / `.gmap-popover` 等弹层样式),无需手动引入。

## API 一览(45 个)

| 模块 | 导出 |
|---|---|
| 坐标转换 | `mercatorTowgs84` `wgs84ToMercator` `bd09Togcj02` `gcj02Tobd09` `wgs84Togcj02` `gcj02Towgs84` `transformLat` `transformLng` `isOutOfChina` |
| 投影 | `projTransform`(模块加载时自动注册 EPSG:4326/4269/3857/2000/2000e 投影定义) |
| 图层操作 | `getLayerByName` `getLayerByNameParam` `getAllLayers` `getLayerUrl` `removeLayer` `setLayerVisible` |
| 地图效果 | `getOptionsStyle` `judgeLayerVisible` `hoverChangeStyle` `clearHoverChangeStyle` `hoverShowTips` `clearHoverShowTips` |
| 点图层 | `addPointLayer` `addPointDataLayer`(支持分级显示与聚合) |
| 线图层 | `addLineStringLayer` |
| 面图层 | `addPolygonLayer` `addRainPolygonLayer` |
| 绘制 | `drawFeatures` `removeDraw` `freehandDrawing` `removeFreehandDraw` |
| 测量 | `measureLength` `measureArea` `clearMeasure` |
| 地图工具 | `pickFeaturesByName` `pickFeaturesPopover` `zoomToFitExtent` `exportMapToImage` `boxSelectionFeatures` |
| 弹层 | `addOverlayPopup` |
| WMS/WFS | `addWmsLayer` `addWfsLayer` `getWmsFeature` `updateWfsFilter` `clearWfsEvents` |

所有 options 参数均有对应的 TypeScript 接口(`PointOptions`、`MeasureOption`、`WmsLayerOptions` 等,从包根导出),编辑器内可获得完整提示。

### 图层与要素的命名约定

库内部通过图层/要素的自定义属性协作,与旧版一致:

- 图层属性:`layerName`(标识名,`getLayerByName` 精确匹配;`removeLayer`/`setLayerVisible` 子串匹配)、`pickLayerName`(`'Point'|'LineString'|'Polygon'` 前缀 + layerName)、`hoverLayerName`/`tipsLayerName`(`hoverLayerName${layerName}_${type}` 形式)
- 要素属性:`NAME`(名称)、`COLOR`/`color`(颜色)、`LINE_COLOR`(线颜色);点数据经纬度字段约定为 `LGTD`/`LTTD`(兼容小写)

## 行为变更清单

重写修复了旧版的以下缺陷,其余行为与旧版保持一致:

1. **addLineStringLayer**:修复共享样式对象污染——无 `color` 属性的线要素不再沿用前一个要素的颜色/文本,而是回到默认样式
2. **measure 测量**:修复"清除按钮"点击与悬停光标只在第一次操作时有效的问题(`once` 绑定缺陷,改为持久监听);`showSegments: false` 现在对绘制完成的要素同样生效;多张地图并存时测量样式不再互相串扰
3. **addPointLayer**:`styles.circle` 配置现在真正生效(旧版永远渲染默认圆点);要素会写入 `NAME` 属性,使 `zoomToFitExtent` / 按名拾取对该图层可用
4. **addPointLayer / addPointDataLayer**:hover/tips 图层标识统一为带下划线形式(`hoverLayerName${name}_Point`),旧版两种写法消费端均可匹配,不受影响
5. **removeLayer**:修复对 LayerGroup 和 WMS 源图层调用时抛 TypeError 的问题;现在可以正确移除嵌套在图层组内的图层
6. **drawFeatures**:修复重复调用时旧的编辑交互与图层泄漏残留的问题
7. **freehandDrawing**:状态改为按地图实例隔离,多地图不再互相覆盖;`removeFreehandDraw()` 保持无参签名,清理最近一次使用的地图
8. **pickFeaturesPopover**:要素数据不再经隐藏 DOM 节点序列化传递,修复属性值含特殊字符时解析失败的问题与注入风险(显示文本改用 `textContent`)
9. **exportMapToImage**:修复图层画布无 CSS 矩阵变换时残留上一图层变换导致的错位
10. **boxSelectionFeatures**:修复旋转视图下框选必抛 TypeError 的问题(ol 9 中 `geometry.rotate` 为原地操作)
11. **addWfsLayer**:补充地图实例空值守卫
12. **addOverlayPopup**:重复调用不再叠加多个同 id 弹层

ol 9 API 适配(行为等价):Overlay 的 `autoPanAnimation` 选项改为 `autoPan: { animation: {...} }`;测量清除按钮图标移除已废弃的 `imgSize` 选项。

以下为有意保留的旧行为:`gcj02Towgs84` 为近似反推算法(存在米级残差);`isOutOfChina` 使用粗略矩形边界;`boxSelectionFeatures` 清空选择时不触发回调、不返回清理句柄;`pickFeaturesPopover` 单条数据时直接回调不弹层;`clearMeasure()` 不传地图实例时仅警告;坐标转换函数参数限定为 `number`(旧版部分函数容忍数字字符串)。

## 开发

```bash
npm install
npm run build        # 构建产物到 dist/(ESM + CJS + d.ts),并核对 45 个公开导出
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier
```

## License

MIT
