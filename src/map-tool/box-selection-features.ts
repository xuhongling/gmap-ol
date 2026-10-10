import { platformModifierKeyOnly } from 'ol/events/condition';
import { DragBox, Select } from 'ol/interaction';
import Layer from 'ol/layer/Layer';
import type Map from 'ol/Map';
import VectorSource from 'ol/source/Vector';
import { FEATURE_PROP_COLOR, FEATURE_PROP_LINE_COLOR, FEATURE_PROP_NAME } from '../constants';
import { getLayerByName } from '../layer';
import type { BoxSelectionOptions, StyleOptions } from '../types';
import { getOptionsStyle } from '../utils/style';

/**
 * 为地图添加框选交互(支持按住修饰键拖拽框选和点击选择要素)
 *
 * 选择变化回调经 500ms 防抖,参数为选中要素的名称数组;
 * 与旧版行为一致:仅当选中要素数量大于 0 时才触发回调(清空选择不回调)。
 *
 * @param olMap - 地图实例
 * @param boxSelectionOptions - 框选配置项
 * @param selectionCallbackFn - 选择变化时的回调函数(参数为选中要素的名称数组)
 */
export function boxSelectionFeatures(
  olMap: Map,
  boxSelectionOptions: BoxSelectionOptions,
  selectionCallbackFn?: (selectedNames: string[]) => void
): void {
  if (!olMap) return; // 地图实例不存在时终止

  // 1. 获取目标图层及数据源
  const targetLayer = getLayerByName(olMap, boxSelectionOptions.layerName);
  if (!targetLayer) {
    console.error('框选失败:未找到目标图层,请检查图层名称配置');
    return;
  }
  const vectorSource = targetLayer instanceof Layer ? targetLayer.getSource() : null;
  if (!(vectorSource instanceof VectorSource)) {
    console.error('框选失败:目标图层不是矢量图层,不支持要素选择');
    return;
  }

  // 2. 定义选中要素的默认样式
  const defaultSelectedStyle: StyleOptions = {
    fill: {
      color: 'rgba(255, 255, 255, 0.3)', // 半透明白色填充
    },
    stroke: {
      color: 'rgba(255, 255, 255, 1)', // 白色描边
      width: 2,
    },
    text: {
      font: '12px Microsoft YaHei', // 字体样式
      fill: { color: 'rgba(255, 255, 255, 1)' }, // 文本颜色
      stroke: {
        color: 'rgba(0, 0, 0, 1)', // 文本描边颜色
        width: 1.5,
      },
      text: '', // 文本内容(动态设置)
    },
  };

  // 3. 创建点击选择交互(处理单点选择)
  const selectInteraction = new Select({
    style: (feature) => {
      // 从要素属性中提取样式和文本信息
      const fillColor = feature.get(FEATURE_PROP_COLOR) || feature.get('color');
      const strokeColor = feature.get(FEATURE_PROP_LINE_COLOR) || fillColor;
      const featureName = feature.get(FEATURE_PROP_NAME) || feature.get('name') || '';

      // 合并默认样式与要素自定义样式、配置项样式
      const mergedStyle: StyleOptions = {
        ...defaultSelectedStyle,
        ...(fillColor && { fill: { ...defaultSelectedStyle.fill, color: fillColor } }),
        ...(strokeColor && { stroke: { ...defaultSelectedStyle.stroke, color: strokeColor } }),
        ...(featureName && { text: { ...defaultSelectedStyle.text, text: featureName } }),
        ...boxSelectionOptions.styles, // 覆盖用户自定义样式
      };

      return getOptionsStyle(mergedStyle);
    },
  });
  olMap.addInteraction(selectInteraction);

  // 4. 获取选中要素集合(用于跟踪选择变化)
  const selectedFeatures = selectInteraction.getFeatures();

  // 5. 创建拖拽框选交互(按住修饰键拖拽触发,如Ctrl/Command)
  const dragBoxInteraction = new DragBox({
    condition: platformModifierKeyOnly, // 仅在按住修饰键时触发
  });
  olMap.addInteraction(dragBoxInteraction);

  // 6. 框选结束时:将框内要素添加到选中集合
  dragBoxInteraction.on('boxend', () => {
    const boxGeometry = dragBoxInteraction.getGeometry();
    const boxExtent = boxGeometry.getExtent();

    // 获取框范围内的要素(并过滤出与框实际相交的要素)
    const candidateFeatures = vectorSource
      .getFeaturesInExtent(boxExtent)
      .filter((feature) => feature.getGeometry()?.intersectsExtent(boxExtent) ?? false);

    // 处理倾斜视图(旋转角度非90度倍数)的特殊情况
    const viewRotation = olMap.getView().getRotation();
    const isOblique = viewRotation % (Math.PI / 2) !== 0;

    if (isOblique) {
      // 倾斜视图下:将框和要素几何旋转至水平后再判断相交
      // 注意:Geometry.rotate 为原地修改且无返回值,不能链式调用(旧版链式写法存在缺陷)
      const rotationAnchor = [0, 0]; // 旋转锚点(原点)
      const adjustedBoxGeometry = boxGeometry.clone();
      adjustedBoxGeometry.rotate(-viewRotation, rotationAnchor);
      const adjustedBoxExtent = adjustedBoxGeometry.getExtent();

      candidateFeatures.forEach((feature) => {
        const featureGeometry = feature.getGeometry();
        if (!featureGeometry) return;
        const adjustedFeatureGeometry = featureGeometry.clone();
        adjustedFeatureGeometry.rotate(-viewRotation, rotationAnchor);
        if (adjustedFeatureGeometry.intersectsExtent(adjustedBoxExtent)) {
          selectedFeatures.push(feature);
        }
      });
    } else {
      // 非倾斜视图:直接添加范围内要素
      selectedFeatures.extend(candidateFeatures);
    }
  });

  // 7. 框选开始时:清空已有选择
  dragBoxInteraction.on('boxstart', () => {
    selectedFeatures.clear();
  });

  // 8. 监听选择变化(防抖处理,避免频繁触发回调)
  let selectionDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  selectedFeatures.on(['add', 'remove'], () => {
    // 提取选中要素的名称(根据配置的字段名)
    const fieldName = boxSelectionOptions.textFieldName ?? 'name';
    const selectedNames = selectedFeatures.getArray().map((feature): string => feature.get(fieldName) || '');

    // 防抖:500ms内连续变化只触发一次回调
    if (selectedNames.length > 0) {
      if (selectionDebounceTimer) clearTimeout(selectionDebounceTimer);
      selectionDebounceTimer = setTimeout(() => {
        selectionCallbackFn?.(selectedNames);
      }, 500);
    }
  });
}
