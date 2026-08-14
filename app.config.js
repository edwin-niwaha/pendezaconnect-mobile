const fs = require("node:fs");
const path = require("node:path");

module.exports = ({ config }) => {
  const googleServicesPath = path.join(__dirname, "google-services.json");

  if (!fs.existsSync(googleServicesPath)) {
    delete config.android?.googleServicesFile;
  }

  return config;
};
