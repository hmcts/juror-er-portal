const WebpackShellPluginNext = require('webpack-shell-plugin-next');

const envDest = (process.env.NODE_ENV !== 'production') ? 'development' : 'production';
const translationScripts = [('echo "Generating i18n translations - "' + envDest), ('NODE_ENV=' + envDest + ' node ./compilelanguage.js')];

// Generate i18n content files
const contentTranslation = new WebpackShellPluginNext({
  onBuildEnd:{
    scripts: translationScripts,
    blocking: false,
    parallel: true
  },
});

module.exports = {
  plugins: [contentTranslation],
};
