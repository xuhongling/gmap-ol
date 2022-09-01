/*
 * @Author: xuhongling
 * @Date:   2022-08-21 17:18:46
 * @Last Modified by:   xuhongling
 * @Last Modified time: 2022-08-29 10:22:20
 */
import Overlay from 'ol/Overlay';

function pickFeaturesPopover(olMap, pickOptions, overlayCallbackFn) {
  if (!olMap) return;
  const overlayContainer_ = document.createElement('div');
  const overlayContainerCloser_ = document.createElement('div');
  const overlayContainerTitle_ = document.createElement('h3');
  const overlayContainerContent_ = document.createElement('ul');
  overlayContainer_.className = 'gmap-popover gmap-pick-list';
  overlayContainerTitle_.className = 'gmap-title-header';
  overlayContainerCloser_.className = 'ol-popup-closer';
  overlayContainerContent_.className = 'gmap-popover-content';
  overlayContainerTitle_.innerText = '请选择';
  overlayContainer_.appendChild(overlayContainerCloser_);
  overlayContainer_.appendChild(overlayContainerTitle_);
  overlayContainer_.appendChild(overlayContainerContent_);

  const pickFeaturesData = pickOptions.data;
  const textFieldName = pickOptions.textFieldName;

  // 如果数据只有一个，就直接返回数据，不弹出Overlay
  if (pickFeaturesData.length === 1) {
    return overlayCallbackFn ? overlayCallbackFn(pickFeaturesData[0]) : null;
  }
  let overlay = new Overlay({
    id: 'PickStationOverlay',
    element: overlayContainer_,
    autoPan: true,
    positioning: 'bottom-center',
    stopEvent: true,
    autoPanAnimation: {
      duration: 250,
    },
  });
  overlayContainerCloser_.addEventListener(
    'click',
    (event) => {
      event.stopPropagation();
      overlay.setPosition(undefined);
      overlayContainer_.blur();
      olMap.removeOverlay(olMap.getOverlayById('PickStationOverlay'));
    },
    false
  );
  olMap.addOverlay(overlay);
  setOverlayPopupContent(overlay, overlayContainerContent_, pickFeaturesData, textFieldName, overlayCallbackFn);
}

function setOverlayPopupContent(overlay, overlayContainerContent_, pickFeaturesData, textFieldName, overlayCallbackFn) {
  if (pickFeaturesData === null || pickFeaturesData.length === 0) {
    return;
  }

  // 添加Overlay的内容
  let popupContent = '';
  const fieldName = textFieldName ? textFieldName.split(',') : [];
  for (let i = 0; i < pickFeaturesData.length; i++) {
    let name = '';
    for (let j = 0; j < fieldName.length; j++) {
      if (pickFeaturesData[i][fieldName[j]]) {
        name = pickFeaturesData[i][fieldName[j]];
      }
    }
    let properties = { ...pickFeaturesData[i] };
    //删除geometry这个属性
    Reflect.deleteProperty(properties, 'geometry');
    popupContent = `<li data-text=${JSON.stringify(properties)}>${name}</li>`;
    overlayContainerContent_.insertAdjacentHTML('beforeend', popupContent);
  }

  // 设置 Overlay的坐标位置
  let coordinates;
  if (pickFeaturesData[0].LGTD) {
    coordinates = [pickFeaturesData[0].LGTD, pickFeaturesData[0].LTTD];
  } else if (pickFeaturesData[0].lgtd) {
    coordinates = [pickFeaturesData[0].lgtd, pickFeaturesData[0].lttd];
  } else {
    coordinates = pickFeaturesData[0].geometry.getCoordinates();
  }
  overlay.setPosition(coordinates);

  // 事件委托
  let addEventDelegation = (event) => {
    let target = event.target;
    let data = JSON.parse(target.dataset.text);
    return overlayCallbackFn ? overlayCallbackFn(data) : null;
  };
  overlayContainerContent_.addEventListener('click', addEventDelegation.bind(this), false);
}

export default pickFeaturesPopover;
