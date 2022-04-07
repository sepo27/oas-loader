import * as path from 'path';
import * as fs from 'fs-extra';
import * as glob from 'glob';
import * as deepMerge from 'deepmerge';
import { getOptions } from 'loader-utils';
import { makeJsonModuleExports, parseJsonModuleExports } from './lib/moduleExports';
import {
  OAS_PARAMETERS_DEFAULT_DIR_NAME,
  OAS_PATHS_DEFAULT_DIR_NAME,
  OAS_REQUESTS_DEFAULT_DIR_NAME,
  OAS_RESPONSES_DEFAULT_DIR_NAME,
  OAS_SCHEMAS_DEFAULT_DIR_NAME,
} from './constants';
import { makeOasDefaultGlob } from './makeOasDefaultGlob';
import { readYamlFile } from './lib/readYmlFile';
import { applyCustomSpecObjects } from './applyCustomSpecObjects';
import { LooseObject, OasLoaderOptions } from './types';

export function oasWebpackLoader(source) {
  let spec = parseJsonModuleExports(source);

  const
    specPath = this.resourcePath,
    options = getOptions(this);

  spec = buildOasSpec.call(this, { spec, specPath, options });

  return makeJsonModuleExports(spec);
}

interface BuildOasSpecParams {
  spec: LooseObject,
  specPath: string,
  options: OasLoaderOptions,
}

export function buildOasSpec({ spec, specPath, options }: BuildOasSpecParams) {
  const nextSpec = { ...spec };

  // Load paths

  const paths = loadPaths.call(this, specPath, options);
  if (paths) {
    nextSpec.paths = paths;
  }

  // Load components

  const schemas = loadSchemas.call(this, specPath, options);
  if (schemas) {
    setSpecComponentsProp(nextSpec, 'schemas', schemas);
  }

  const params = loadParams.call(this, specPath, options);
  if (params) {
    setSpecComponentsProp(nextSpec, 'parameters', params);
  }

  const requests = loadRequests.call(this, specPath, options);
  if (requests) {
    setSpecComponentsProp(nextSpec, 'requestBodies', requests);
  }

  const responses = loadResponses.call(this, specPath, options);
  if (responses) {
    setSpecComponentsProp(nextSpec, 'responses', responses);
  }

  // Load info version from package json

  if (options.infoVersionFromPackageJson) {
    loadInfoVersionFromPackageJson(nextSpec, options.infoVersionFromPackageJson);
  }

  // Traverse spec recursively to apply custom objects

  return applyCustomSpecObjects(nextSpec);
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

function loadRequests(specPath, options) {
  if (!options.requests) {
    return null;
  }

  return loadSpecFiles.call(this, specPath, {
    defaultDirname: OAS_REQUESTS_DEFAULT_DIR_NAME,
    customGlob: options.requestsGlob,
    watch: true,
  });
}

function loadResponses(specPath, options) {
  if (!options.responses) {
    return null;
  }

  return loadSpecFiles.call(this, specPath, {
    defaultDirname: OAS_RESPONSES_DEFAULT_DIR_NAME,
    customGlob: options.responsesGlob,
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
