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

  it('$merge object merges response into path', () => {
    const
      specPath = '/spec/spec.yml',
      respDir = path.join('/spec', OAS_RESPONSES_DEFAULT_DIR_NAME),
      pathsDir = path.join('/spec', OAS_PATHS_DEFAULT_DIR_NAME);

    mockSpecFiles(makeOasDefaultGlob(respDir), {
      '/spec/responses/FooResp.resp.yml': {
        FooResp: {
          description: 'Foo Response',
          content: {
            'application/json': {
              schema: {
                type: 'string',
              },
            },
          },
        },
      },
    });

    mockSpecFiles(makeOasDefaultGlob(pathsDir), {
      [path.join(pathsDir, 'bar.yml')]: {
        '/bar': {
          get: {
            responses: {
              200: {
                $merge: [
                  { $ref: '#/components/responses/FooResp' },
                  {
                    description: 'Bar custom description',
                    content: {
                      'application/json': {
                        schema: {
                          example: 'The String',
                        },
                      },
                    },
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
      options: { responses: true, paths: true },
    });

    expectSpecAtPath(res, ['paths']).toEqual({
      '/bar': {
        get: {
          responses: {
            200: {
              description: 'Bar custom description',
              content: {
                'application/json': {
                  schema: {
                    type: 'string',
                    example: 'The String',
                  },
                },
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
