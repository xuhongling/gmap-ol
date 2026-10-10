/**
 * 导出完整性核对:静态分析 src 的导出链,确保对外导出与旧版 gmap-ol 一致的全部 45 个公开 API。
 * (构建后由 `npm run build` 自动调用)
 */
import fs from 'node:fs';
import path from 'node:path';

const EXPECTED_EXPORTS = [
  // coord-transform(9)
  'mercatorTowgs84',
  'wgs84ToMercator',
  'bd09Togcj02',
  'gcj02Tobd09',
  'wgs84Togcj02',
  'gcj02Towgs84',
  'transformLat',
  'transformLng',
  'isOutOfChina',
  // projection(1)
  'projTransform',
  // layer(6)
  'getLayerByName',
  'getLayerByNameParam',
  'getAllLayers',
  'getLayerUrl',
  'removeLayer',
  'setLayerVisible',
  // map(6)
  'getOptionsStyle',
  'judgeLayerVisible',
  'hoverChangeStyle',
  'clearHoverChangeStyle',
  'hoverShowTips',
  'clearHoverShowTips',
  // point(2)
  'addPointLayer',
  'addPointDataLayer',
  // line-string(1)
  'addLineStringLayer',
  // polygon(2)
  'addPolygonLayer',
  'addRainPolygonLayer',
  // drawing(4)
  'drawFeatures',
  'removeDraw',
  'freehandDrawing',
  'removeFreehandDraw',
  // measure(3)
  'measureLength',
  'measureArea',
  'clearMeasure',
  // map-tool(5)
  'pickFeaturesByName',
  'pickFeaturesPopover',
  'zoomToFitExtent',
  'exportMapToImage',
  'boxSelectionFeatures',
  // overlay(1)
  'addOverlayPopup',
  // wfs(5)
  'addWmsLayer',
  'addWfsLayer',
  'getWmsFeature',
  'updateWfsFilter',
  'clearWfsEvents',
];

const SRC_DIR = path.resolve(process.cwd(), 'src');

/** 把 import 路径解析为实际的 .ts 文件 */
function resolveFile(entryFile, specifier) {
  const base = path.resolve(path.dirname(entryFile), specifier);
  for (const candidate of [base, `${base}.ts`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`无法解析模块:${specifier}(来自 ${entryFile})`);
}

/** 沿 export 链收集全部运行时导出名 */
function collectExports(entryFile, names = new Set(), visited = new Set()) {
  const file = path.normalize(entryFile);
  if (visited.has(file)) return names;
  visited.add(file);
  const content = fs.readFileSync(file, 'utf8');

  // export * from './xxx'
  for (const match of content.matchAll(/export\s+\*\s+from\s+['"]([^'"]+)['"]/g)) {
    if (match[1].startsWith('.')) {
      collectExports(resolveFile(file, match[1]), names, visited);
    }
  }
  // export function / export async function / export const
  for (const match of content.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(match[1]);
  }
  for (const match of content.matchAll(/export\s+const\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(match[1]);
  }
  // export { a, b as c }(可选 from)
  for (const match of content.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const item of match[1].split(',')) {
      const trimmed = item.trim();
      if (!trimmed || trimmed.startsWith('type ')) continue;
      const asParts = trimmed.split(/\s+as\s+/);
      names.add((asParts[1] ?? asParts[0]).trim());
    }
  }
  return names;
}

const exported = collectExports(path.join(SRC_DIR, 'index.ts'));

const missing = EXPECTED_EXPORTS.filter((name) => !exported.has(name));
const unexpected = [...exported].filter((name) => !EXPECTED_EXPORTS.includes(name));

if (missing.length > 0) {
  console.error(`导出核对失败,缺失 ${missing.length} 个导出:`);
  missing.forEach((name) => console.error(`  - ${name}`));
  process.exit(1);
}
if (unexpected.length > 0) {
  console.error(`导出核对失败,多出 ${unexpected.length} 个计划外导出:`);
  unexpected.forEach((name) => console.error(`  + ${name}`));
  process.exit(1);
}

console.log(`导出核对通过:${EXPECTED_EXPORTS.length} 个公开 API 与旧版 gmap-ol 完全一致`);
