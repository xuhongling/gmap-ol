import Overlay from 'ol/Overlay';
import type Map from 'ol/Map';

/**
 * 为地图添加弹出层(Overlay)组件,包含关闭按钮和内容容器
 *
 * @param olMap - 目标地图实例
 * @returns
 */
export function addOverlayPopup(olMap: Map): void {
  // 地图实例不存在时直接终止执行,避免无效操作
  if (!olMap) return;

  // 已存在同 id 的弹出层时先移除,避免重复调用叠加同 id overlay
  const existingOverlay = olMap.getOverlayById('Overlay');
  if (existingOverlay) {
    olMap.removeOverlay(existingOverlay);
  }

  // 创建弹出层DOM元素
  const popupContainer = document.createElement('div'); // 弹出层容器
  const popupCloser = document.createElement('div'); // 关闭按钮
  const popupContent = document.createElement('ul'); // 内容容器

  popupContainer.className = 'ol-popup';
  popupCloser.className = 'ol-popup-closer';

  popupContainer.appendChild(popupCloser);
  popupContainer.appendChild(popupContent);

  const overlay = new Overlay({
    id: 'Overlay', // 弹出层唯一标识
    element: popupContainer, // 关联DOM元素
    positioning: 'bottom-center', // 弹出层相对于坐标的定位方式
    stopEvent: true, // 阻止事件冒泡到地图
    autoPan: {
      // 自动平移地图以确保弹出层可见
      animation: {
        duration: 250, // 自动平移动画时长(毫秒)
      },
    },
  });

  popupCloser.addEventListener(
    'click',
    (event) => {
      event.stopPropagation(); // 阻止事件冒泡
      overlay.setPosition(undefined); // 清除弹出层位置(隐藏)
      popupContainer.blur(); // 移除焦点
      const currentOverlay = olMap.getOverlayById('Overlay');
      if (currentOverlay) {
        olMap.removeOverlay(currentOverlay); // 从地图移除弹出层
      }
    },
    false
  );

  olMap.addOverlay(overlay);
}
