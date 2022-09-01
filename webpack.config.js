/*
 * @Author: xuhongling
 * @Date:   2022-08-12 10:50:06
 * @Last Modified by:   xuhongling
 * @Last Modified time: 2022-08-23 11:04:31
 */
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const resolve = (dir) => {
  return path.join(__dirname, dir);
};

module.exports = {
  mode: 'production',
  entry: './src/main.js',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd', // 打包方式
    globalObject: 'this', // 全局对象
    library: 'olMap', // 类库名称
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.css', '.less'],
    alias: {
      '@': resolve('src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-env', { targets: { chrome: '58' } }]],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
  ],
};
