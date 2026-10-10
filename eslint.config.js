import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // 要素属性包、ol 构造参数边界等处有意使用 any(与 ol 自身的类型风格一致)
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettier,
];
