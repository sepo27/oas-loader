const fs = require('fs-extra');
const yaml = require('yaml');

/**
 * The file is used from doc webpack code.
 * Hence in JS.
 */

export const readYamlFile = (filename) => {
  if (!fs.existsSync(filename)) {
    throw new Error(`Yaml file '${filename}' is invalid`);
  }
  return yaml.parse(fs.readFileSync(filename).toString());
};
