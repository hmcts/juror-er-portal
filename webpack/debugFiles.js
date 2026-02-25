const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');

const views = path.resolve(__dirname, '../src/main/views');
const viewsDist = path.resolve(__dirname, '../dist/main/views');
const resources = path.resolve(__dirname, '../src/main/resources');
const resourcesDist = path.resolve(__dirname, '../dist/main/resources');

const copyDebugFiles = new CopyWebpackPlugin({
  patterns: [
    { from: views, to: viewsDist },
    { from: resources, to: resourcesDist },
  ],
});

module.exports = {
  paths: { views, viewsDist, resources, resourcesDist },
  plugins: [copyDebugFiles],
};
