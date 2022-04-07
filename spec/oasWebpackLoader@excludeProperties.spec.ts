import * as sinonLib from 'sinon';
import { ModuleMock } from '@libj/tbench';
import * as deepMerge from 'deepmerge';
import * as path from 'path';
import * as ReadYamlFileModule from '../src/lib/readYmlFile';
import { makeJsonModuleExports, parseJsonModuleExports } from '../src/lib/moduleExports';
import { oasWebpackLoader } from '../src/oasWebpackLoader';
import {
  OAS_PATHS_DEFAULT_DIR_NAME,
  OAS_RESPONSES_DEFAULT_DIR_NAME,
  OAS_SCHEMAS_DEFAULT_DIR_NAME,
} from '../src/constants';
import { makeOasDefaultGlob } from '../src/makeOasDefaultGlob';

describe('oasWebpackLoader()', () => {
  let
    sinon,
    mock;

  beforeEach(() => {
    sinon = sinonLib.createSandbox();
    mock = {
      glob: ModuleMock('glob', sinon),
      fs: ModuleMock('fs-extra', sinon),
      readYamlFile: sinon.stub(ReadYamlFileModule, 'readYamlFile').returns(''),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('ables to exclude properties from re-used object schema in paths with allOf', () => {
    const
      specPath = '/spec/spec.yml',
      schemasDir = path.join('/spec', OAS_SCHEMAS_DEFAULT_DIR_NAME),
      pathsDir = path.join('/spec', OAS_PATHS_DEFAULT_DIR_NAME);

    mockSpecFiles(makeOasDefaultGlob(schemasDir), {
      '/spec/schemas/foo.spec.yml': {
        Foo: {
          type: 'object',
          properties: {
            bar: 'string',
            baz: 'string',
          },
        },
      },
    });

    mockSpecFiles(makeOasDefaultGlob(pathsDir), {
      [path.join(pathsDir, 'foo.yml')]: {
        '/foo': {
          get: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    properties: {
                      bar: {
                        allOf: [
                          { $ref: '#/components/schemas/Foo' },
                          {
                            $excludeProperties: ['baz'],
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const res = callLoader({
      thisArg: { resourcePath: specPath },
      options: { schemas: true, paths: true },
    });

    expectSpecAtPath(res, ['paths']).toEqual({
      '/foo': {
        get: {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    bar: {
                      type: 'object',
                      properties: {
                        bar: 'string',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  it('ables to exclude properties from re-used object schema in responses with allOf', () => {
    const
      specPath = '/spec/spec.yml',
      schemasDir = path.join('/spec', OAS_SCHEMAS_DEFAULT_DIR_NAME),
      respDir = path.join('/spec', OAS_RESPONSES_DEFAULT_DIR_NAME);

    mockSpecFiles(makeOasDefaultGlob(schemasDir), {
      '/spec/schemas/foo.spec.yml': {
        Foo: {
          type: 'object',
          properties: {
            abc: 'string',
            xyz: 'string',
          },
        },
      },
    });

    mockSpecFiles(makeOasDefaultGlob(respDir), {
      [path.join(respDir, 'MyResp.yml')]: {
        MyResp: {
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Foo' },
                  {
                    $excludeProperties: ['abc'],
                  },
                ],
              },
            },
          },
        },
      },
    });

    const res = callLoader({
      thisArg: { resourcePath: specPath },
      options: { schemas: true, responses: true },
    });

    expectSpecAtPath(res, ['components', 'responses']).toEqual({
      MyResp: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                xyz: 'string',
              },
            },
          },
        },
      },
    });
  });

  /*** Lib ***/

  const
    LoaderDefatuls = {
      spec: {
        openapi: '0.0.0',
      },
      options: {},
    },
    LoaderDefaultThisArg = {
      resourcePath: '/spec/spec.yml',
      addDependency() {},
    };

  const callLoader = (input = {} as any) => {
    const
      { thisArg: inputThisArg, ...otherInput } = input,
      { spec, options } = deepMerge(LoaderDefatuls, otherInput),
      thisArg = inputThisArg || LoaderDefaultThisArg;

    if (!thisArg.resourcePath) {
      thisArg.resourcePath = LoaderDefaultThisArg.resourcePath;
    }

    if (!thisArg.addDependency) {
      thisArg.addDependency = LoaderDefaultThisArg.addDependency;
    }

    thisArg.query = options;

    return oasWebpackLoader.call(thisArg, makeJsonModuleExports(spec));
  };

  const mockSpecFiles = (globPattern, fileMap) => {
    const filePaths = Object.keys(fileMap);

    mock.glob.sync.withArgs(globPattern).returns(filePaths);

    filePaths.forEach(f => {
      mock.readYamlFile.withArgs(f).returns(fileMap[f]);
    });
  };

  // const expectSpec = resSource => expect(parseJsonModuleExports(resSource));

  function expectSpecAtPath(resSource, specPath) {
    let spec = parseJsonModuleExports(resSource);
    specPath.forEach(key => {
      spec = spec[key];
    });
    return expect(spec);
  }
});
