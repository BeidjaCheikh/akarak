const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

function withAndroidRTL(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];

    if (application && application.$) {
      application.$['android:supportsRtl'] = 'true';
    }

    return config;
  });
}

function withIOSRTL(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.CFBundleDevelopmentRegion = 'ar';
    config.modResults.CFBundleLocalizations = ['ar'];
    return config;
  });
}

module.exports = function withRTL(config) {
  config = withAndroidRTL(config);
  config = withIOSRTL(config);

  return config;
};