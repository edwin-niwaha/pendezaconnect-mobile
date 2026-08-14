const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    languageOptions: {
      globals: {
        __dirname: "readonly",
        module: "readonly",
        require: "readonly"
      }
    },
    ignores: ["android/**", "node_modules/**"]
  }
];
