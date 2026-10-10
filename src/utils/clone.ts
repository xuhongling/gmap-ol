/**
 * 对象工具:深拷贝 / 深合并
 *
 * 约定:仅深拷贝 plain object、数组与 Date;类实例(如 ol 的 Fill/Stroke)
 * 保持原引用,避免旧版把实例拆成普通对象导致原型丢失的问题。
 */

/** 判断是否为 plain object(排除数组、null、类实例) */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

/** 深拷贝:plain object / 数组 / Date 递归拷贝,其余类型(含类实例)原样返回 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as T;
  if (Array.isArray(obj)) return obj.map((item) => deepClone(item)) as T;
  if (isPlainObject(obj)) {
    const copy: Record<string, unknown> = {};
    Object.keys(obj).forEach((key) => {
      copy[key] = deepClone(obj[key]);
    });
    return copy as T;
  }
  return obj;
}

/**
 * 深合并:后面的 source 覆盖前面的 target(原地修改 target 并返回)。
 * plain object 递归合并;数组与其它类型整体覆盖。
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, ...sources: Array<Record<string, unknown> | undefined>): T {
  for (const source of sources) {
    if (!isPlainObject(source)) continue;
    Object.keys(source).forEach((key) => {
      const sourceValue = source[key];
      const targetValue = (target as Record<string, unknown>)[key];
      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        deepMerge(targetValue, sourceValue);
      } else if (isPlainObject(sourceValue)) {
        (target as Record<string, unknown>)[key] = deepMerge({}, sourceValue);
      } else {
        (target as Record<string, unknown>)[key] = sourceValue;
      }
    });
  }
  return target;
}
