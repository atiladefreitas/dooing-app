const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// lucide-react-native's `exports` map only exposes "." and "./icons", so with
// Metro's strict package-exports resolution the barrel's internal ./icons/*.mjs
// re-exports can't be resolved. Fall back to classic resolution.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './src/global.css' });
