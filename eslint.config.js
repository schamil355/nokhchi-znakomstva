// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    settings: {
      // Treat these native modules as resolvable core modules for linting.
      "import/core-modules": ["react-native-purchases", "react-native-purchases-ui"],
      "import/resolver": {
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"]
        },
        typescript: {}
      }
    }
  }
]);
