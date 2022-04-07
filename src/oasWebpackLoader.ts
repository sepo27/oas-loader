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
  OAS_SCHEMAS_DEFAULT_DIR_NAME,
} from './constants';
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

  // Load components

  const schemas = loadSchemas.call(this, specPath, options);
  if (schemas) {
    setSpecComponentsProp(spec, 'schemas', schemas);
  }

  const params = loadParams.call(this, specPath, options);
  if (params) {
    setSpecComponentsProp(spec, 'parameters', params);
  }

  const requests = loadRequests.call(this, specPath, options);
  if (requests) {
    setSpecComponentsProp(spec, 'requestBodies', requests);
  }

  // Load info version from package json

  if (options.infoVersionFromPackageJson) {
    loadInfoVersionFromPackageJson(spec, options.infoVersionFromPackageJson);
  }

  // Traverse spec to exclude some properties (if specified)

  excludePropertiesInPaths(spec);

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

function excludePropertiesInPaths(spec) {
  if (spec.paths) {
    // eslint-disable-next-line no-param-reassign
    spec.paths = mapObjectsRecursive(spec.paths, (key, obj) => {
      if (obj.allOf) {
        const
          refObj = obj.allOf.find(o => o.$ref),
          excludePropsObj = obj.allOf.find(o => o.$excludeProperties);

        if (refObj && excludePropsObj) {
          const refSchema = findSpecSchemaByRef(spec, refObj.$ref);

          if (refSchema && refSchema.type === 'object' && refSchema.properties) {
            const nextSchemaProps = Object.keys(refSchema.properties).reduce(
              (acc, propName) => (
                excludePropsObj.$excludeProperties.indexOf(propName) > -1
                  ? acc
                  : Object.assign(acc, { [propName]: refSchema.properties[propName] })
              ),
              {},
            );

            return {
              ...refSchema,
              properties: nextSchemaProps,
            };
          }
        }
      }

      return obj;
    });
  }
}

function mapObjectsRecursive(input, mapper) {
  if (typeof input === 'object' && !Array.isArray(input)) {
    return Object.keys(input).reduce(
      (acc, key) => {
        const
          val = input[key],
          nextVal = mapper(key, val),
          retVal = nextVal === val
            ? mapObjectsRecursive(val, mapper)
            : nextVal;

        return Object.assign(acc, { [key]: retVal });
      },
      {},
    );
  }

  return input;
}

function findSpecSchemaByRef(spec, ref) {
  if (ref.indexOf('#/components/schemas') === 0) {
    const schemaName = ref.split('/')[3];

    if (spec.components.schemas[schemaName]) {
      return spec.components.schemas[schemaName];
    }
  }
  return null;
}
