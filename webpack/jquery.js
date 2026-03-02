const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');

const rootExport = require.resolve('jquery');
const root = path.resolve(rootExport, '..');
const javascript = path.resolve(root, 'jquery.min.js');

const copyJquery = new CopyWebpackPlugin({
  patterns: [
    {
      from: path.resolve(__dirname, javascript),
      to: 'assets/js/jquery.min.js',
    },
  ],
});

module.exports = {
  paths: { template: root, javascript },
  plugins: [copyJquery],
};
