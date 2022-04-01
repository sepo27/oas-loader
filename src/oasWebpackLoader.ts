import * as path from 'path';
import * as fs from 'fs-extra';
import * as glob from 'glob';
import * as deepMerge from 'deepmerge';
import { getOptions } from 'loader-utils';
import { makeJsonModuleExports, parseJsonModuleExports } from './lib/moduleExports';
import { OAS_PARAMETERS_DEFAULT_DIR_NAME, OAS_PATHS_DEFAULT_DIR_NAME, OAS_SCHEMAS_DEFAULT_DIR_NAME } from './constants';
import { makeOasDefaultGlob } from './makeOasDefaultGlob';
import { readYamlFile } from './lib/readYmlFile';

export function oasWebpackLoader(source) {
  // Input

  const
    spec = parseJsonModuleExports(source),
    specPath = this.resourcePath,
    options = getOptions(this);

  // Load paths

  const paths = loadPaths.call(this, specPath, options);
  if (paths) {
    spec.paths = paths;
  }

  // Load components schemas

  const schemas = loadSchemas.call(this, specPath, options);
  if (schemas) {
    setSpecComponentsProp(spec, 'schemas', schemas);
  }

  const params = loadParams.call(this, specPath, options);
  if (params) {
    setSpecComponentsProp(spec, 'parameters', params);
  }

  // Load info version from package json

  if (options.infoVersionFromPackageJson) {
    loadInfoVersionFromPackageJson(spec, options.infoVersionFromPackageJson);
  }

  return makeJsonModuleExports(spec);
}

/*** Lib ***/

function loadPaths(specPath, options) {
  if (!options.paths) {
    return null;
  }

  return loadSpecFiles.call(this, specPath, {
    defaultDirname: OAS_PATHS_DEFAULT_DIR_NAME,
    customGlob: options.pathsGlob,
    watch: true,
  });
}

function loadSchemas(specPath, options) {
  if (!options.schemas) {
    return null;
  }

  return loadSpecFiles.call(this, specPath, {
    defaultDirname: OAS_SCHEMAS_DEFAULT_DIR_NAME,
    customGlob: options.schemasGlob,
    watch: true,
  });
}

function loadParams(specPath, options) {
  if (!options.params) {
    return null;
  }

  return loadSpecFiles.call(this, specPath, {
    defaultDirname: OAS_PARAMETERS_DEFAULT_DIR_NAME,
    customGlob: options.paramsGlob,
    watch: true,
  });
}

function loadSpecFiles(specPath, options = {} as any) {
  const {
      defaultDirname = '',
      customGlob = null,
      watch = false,
    } = options,
    globPattern = customGlob || makeOasDefaultGlob(path.join(path.dirname(specPath), defaultDirname)),
    files = glob.sync(globPattern);

  if (!files.length) {
    return null;
  }

  if (watch) {
    files.forEach(fp => { this.addDependency(fp); });
  }

  return files.reduce(
    (acc, fp) => deepMerge(acc, readYamlFile(fp)),
    // (acc, fp) => mergeDeep(acc, ReadYamlFileModule.readYamlFile(fp)),
    {},
  );
}

function setSpecComponentsProp(spec, prop, val) {
  if (!spec.components) {
    // eslint-disable-next-line no-param-reassign
    spec.components = {};
  }
  // eslint-disable-next-line no-param-reassign
  spec.components[prop] = val;
}

function loadInfoVersionFromPackageJson(spec, packageJsonPath) {
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = fs.readJsonSync(packageJsonPath);
    if (packageJson.version) {
      if (!spec.info) {
        // eslint-disable-next-line no-param-reassign
        spec.info = {};
      }
      // eslint-disable-next-line no-param-reassign
      spec.info.version = packageJson.version;
    }
  }
}
