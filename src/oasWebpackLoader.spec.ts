import * as sinonLib from 'sinon';
import { ModuleMock } from '@libj/tbench';
import * as deepMerge from 'deepmerge';
import * as path from 'path';
import * as ReadYamlFileModule from './lib/readYmlFile';
import { makeJsonModuleExports, parseJsonModuleExports } from './lib/moduleExports';
import { oasWebpackLoader } from './oasWebpackLoader';
import {
  OAS_PARAMETERS_DEFAULT_DIR_NAME,
  OAS_PATHS_DEFAULT_DIR_NAME,
  OAS_REQUESTS_DEFAULT_DIR_NAME,
  OAS_SCHEMAS_DEFAULT_DIR_NAME,
} from './constants';
import { makeOasDefaultGlob } from './makeOasDefaultGlob';

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

  it('exports spec source as is by default', () => {
    const spec = {
      openapi: '1.2.3',
    };

    const res = callLoader({ spec });

    expect(res).toBe(makeJsonModuleExports(spec));
  });

  it('loads paths from default folder', () => {
    const
      specPath = '/spec/spec.yml',
      pathsDir = path.join('/spec', OAS_PATHS_DEFAULT_DIR_NAME);

    mockSpecFiles(makeOasDefaultGlob(pathsDir), {
      [path.join(pathsDir, 'foo.yml')]: {
        '/foo': { get: 200 },
      },
      [path.join(pathsDir, 'bar.yml')]: {
        '/bar': { get: 200 },
      },
    });

    const res = callLoader({
      thisArg: { resourcePath: specPath },
      options: { paths: true },
    });

    expectSpec(res).toMatchObject({
      paths: {
        '/foo': { get: 200 },
        '/bar': { get: 200 },
      },
    });
  });

  it('loads paths with custom pathsGlob option', () => {
    const pathsGlob = '/paths/**/*.path.yml';

    mockSpecFiles(pathsGlob, {
      '/paths/foo.path.yml': {
        '/foo': { get: 333 },
      },
      '/paths/bar.path.yml': {
        '/bar': { get: 333 },
      },
    });

    const res = callLoader({
      options: {
        paths: true,
        pathsGlob,
      },
    });

    expectSpec(res).toMatchObject({
      paths: {
        '/foo': { get: 333 },
        '/bar': { get: 333 },
      },
    });
  });

  it('adds paths specs to watch list', () => {
    const
      specPath = '/spec/spec.yml',
      pathsDir = path.join('/spec', OAS_PATHS_DEFAULT_DIR_NAME);

    mockSpecFiles(makeOasDefaultGlob(pathsDir), {
      '/foo.yml': {},
      '/bar.yml': {},
    });

    const thisArg = {
      resourcePath: specPath,
      addDependency() {},
    };

    const addDepMock = sinon.stub(thisArg, 'addDependency');

    callLoader({ thisArg, options: { paths: true } });

    expect(addDepMock.callCount).toBe(2);
    expect(addDepMock.getCall(0).args).toEqual(['/foo.yml']);
    expect(addDepMock.getCall(1).args).toEqual(['/bar.yml']);
  });

  it('does not load paths if disabled', () => {
    const
      specPath = '/spec/spec.yml',
      pathsDir = path.join('/spec', OAS_PATHS_DEFAULT_DIR_NAME);

    mockSpecFiles(makeOasDefaultGlob(pathsDir), {
      '/spec/paths/foo.path.yml': {
        '/foo': { get: 400 },
      },
    });

    const res = callLoader({
      thisArg: { resourcePath: specPath },
      options: { paths: false },
    });

    expectSpec(res).not.toHaveProperty('paths');
  });

  it('merges paths deeply', () => {
    const
      specPath = '/spec/spec.yml',
      pathsDir = path.join('/spec', OAS_PATHS_DEFAULT_DIR_NAME);

    mockSpecFiles(makeOasDefaultGlob(pathsDir), {
      [path.join(pathsDir, 'foo.yml')]: {
        '/foo': { get: 200 },
      },
      [path.join(pathsDir, 'bar.yml')]: {
        '/foo': { post: 200 },
      },
    });

    const res = callLoader({
      thisArg: { resourcePath: specPath },
      options: { paths: true },
    });

    expectSpec(res).toMatchObject({
      paths: {
        '/foo': { get: 200, post: 200 },
      },
    });
  });

  it('loads schemas from default folder', () => {
    const
      specPath = '/spec/spec.yml',
      schemasDir = path.join('/spec', OAS_SCHEMAS_DEFAULT_DIR_NAME);

    mockSpecFiles(makeOasDefaultGlob(schemasDir), {
      '/spec/schemas/xyz.spec.yml': {
        Xyz: { type: 'integer' },
      },
      '/spec/schemas/abc.spec.yml': {
        Abc: { type: 'integer' },
      },
    });

    const res = callLoader({
      thisArg: { resourcePath: specPath },
      options: { schemas: true },
    });

    expectSpec(res).toMatchObject({
      components: {
        schemas: {
          Xyz: { type: 'integer' },
          Abc: { type: 'integer' },
        },
      },
    });
  });

  it('loads schemas with custom schemasGlob option', () => {
    const schemasGlob = '/schemas/*.spec.yml';

    mockSpecFiles(schemasGlob, {
      '/schemas/xyz.spec.yml': {
        Xyz: { type: 'string' },
      },
      '/schemas/abc.spec.yml': {
        Abc: { type: 'string' },
      },
    });

    const res = callLoader({
      options: {
        schemas: true,
        schemasGlob,
      },
    });

    expectSpec(res).toMatchObject({
      components: {
        schemas: {
          Xyz: { type: 'string' },
          Abc: { type: 'string' },
        },
      },
    });
  });

  it('adds schemas specs to watch list', () => {
    const schemasGlob = '/schemas/**/*.spec.yml';

    mockSpecFiles(schemasGlob, {
      '/schemas/abc.spec.yml': {},
      '/schemas/xyz.spec.yml': {},
      '/schemas/bcz.spec.yml': {},
    });

    const thisArg = {
      addDependency() {},
    };

    const addDepMock = sinon.stub(thisArg, 'addDependency');

    callLoader({
      thisArg,
      options: {
        schemas: true,
        schemasGlob,
      },
    });

    expect(addDepMock.calledThrice).toBeTruthy();
    expect(addDepMock.getCall(0).args).toEqual(['/schemas/abc.spec.yml']);
    expect(addDepMock.getCall(1).args).toEqual(['/schemas/xyz.spec.yml']);
    expect(addDepMock.getCall(2).args).toEqual(['/schemas/bcz.spec.yml']);
  });

  it('does not load schemas if disabled', () => {
    const
      specPath = '/spec/spec.yml',
      schemasDir = path.join('/spec', OAS_SCHEMAS_DEFAULT_DIR_NAME);

    mockSpecFiles(makeOasDefaultGlob(schemasDir), {
      '/spec/schemas/xyz.spec.yml': {
        Xyz: { type: 'integer' },
      },
    });

    const res = callLoader({
      thisArg: { resourcePath: specPath },
    });

    expectSpec(res).not.toHaveProperty('components');
  });

  it('loads parameters from default folder', () => {
    const
      specPath = '/spec/spec.yml',
      paramsDir = path.join('/spec', OAS_PARAMETERS_DEFAULT_DIR_NAME);

    mockSpecFiles(makeOasDefaultGlob(paramsDir), {
      '/spec/params/foo.spec.yml': {
        foo: { type: 'integer' },
      },
      '/spec/params/bar.spec.yml': {
        bar: { type: 'integer' },
      },
    });

    const res = callLoader({
      thisArg: { resourcePath: specPath },
      options: { params: true },
    });

    expectSpec(res).toMatchObject({
      components: {
        parameters: {
          foo: { type: 'integer' },
          bar: { type: 'integer' },
        },
      },
    });
  });

  it('load parameters with custom paramsGlob option', () => {
    const paramsGlob = '/params/*.spec.yml';

    mockSpecFiles(paramsGlob, {
      '/params/xyz.spec.yml': {
        xyz: { type: 'string' },
      },
      '/params/abc.spec.yml': {
        abc: { type: 'string' },
      },
    });

    const res = callLoader({
      options: {
        params: true,
        paramsGlob,
      },
    });

    expectSpec(res).toMatchObject({
      components: {
        parameters: {
          xyz: { type: 'string' },
          abc: { type: 'string' },
        },
      },
    });
  });

  it('adds parameters specs to watch list', () => {
    const paramsGlob = '/params/**/*.spec.yml';

    mockSpecFiles(paramsGlob, {
      '/schemas/abc.spec.yml': {},
      '/schemas/cba.spec.yml': {},
    });

    const thisArg = {
      addDependency() {},
    };

    const addDepMock = sinon.stub(thisArg, 'addDependency');

    callLoader({
      thisArg,
      options: {
        params: true,
        paramsGlob,
      },
    });

    expect(addDepMock.calledTwice).toBeTruthy();
    expect(addDepMock.getCall(0).args).toEqual(['/schemas/abc.spec.yml']);
    expect(addDepMock.getCall(1).args).toEqual(['/schemas/cba.spec.yml']);
  });

  it('does not add params if disabled', () => {
    const
      specPath = '/spec/spec.yml',
      paramsDir = path.join('/spec', OAS_PARAMETERS_DEFAULT_DIR_NAME);

    mockSpecFiles(makeOasDefaultGlob(paramsDir), {
      '/spec/params/xyz.spec.yml': {},
    });

    const res = callLoader({
      thisArg: { resourcePath: specPath },
    });

    expectSpec(res).not.toHaveProperty('components');
  });

  it('adds info version from package.json', () => {
    const
      version = '1.2.3',
      packageJsonPath = '/package.json';

    mock.fs.existsSync.withArgs(packageJsonPath).returns(true);
    mock.fs.readJsonSync.withArgs(packageJsonPath).returns({
      version,
    });

    const res = callLoader({
      options: {
        infoVersionFromPackageJson: packageJsonPath,
      },
    });

    expectSpec(res).toMatchObject({ info: { version } });
  });

  it('loads request bodies from default folder', () => {
    const
      specPath = '/spec/spec.yml',
      reqDirs = path.join('/spec', OAS_REQUESTS_DEFAULT_DIR_NAME);

    mockSpecFiles(makeOasDefaultGlob(reqDirs), {
      [path.join(reqDirs, 'foo.yml')]: {
        Foo: {
          description: 'Foo',
        },
      },
      [path.join(reqDirs, 'bar.yml')]: {
        Bar: {
          description: 'Bar',
        },
      },
    });

    const res = callLoader({
      thisArg: { resourcePath: specPath },
      options: { requests: true },
    });

    expectSpec(res).toMatchObject({
      components: {
        requestBodies: {
          Foo: { description: 'Foo' },
          Bar: { description: 'Bar' },
        },
      },
    });
  });

  it('loads request bodies with custom requestsGlob option', () => {
    const requestsGlob = '/requests/*.req.yml';

    mockSpecFiles(requestsGlob, {
      '/requests/xyz.req.yml': {
        Xyz: { description: 'Xyz' },
      },
      '/requests/abc.req.yml': {
        Abc: { description: 'Abc' },
      },
    });

    const res = callLoader({
      options: {
        requests: true,
        requestsGlob,
      },
    });

    expectSpec(res).toMatchObject({
      components: {
        requestBodies: {
          Xyz: { description: 'Xyz' },
          Abc: { description: 'Abc' },
        },
      },
    });
  });

  it('adds request bodies specs to watch list', () => {
    const requestsGlob = '/requests/**/*.req.yml';

    mockSpecFiles(requestsGlob, {
      '/requests/foo.req.yml': {},
      '/requests/bar.req.yml': {},
    });

    const thisArg = {
      addDependency() {},
    };

    const addDepMock = sinon.stub(thisArg, 'addDependency');

    callLoader({
      thisArg,
      options: {
        requests: true,
        requestsGlob,
      },
    });

    expect(addDepMock.callCount).toBe(2);
    expect(addDepMock.getCall(0).args).toEqual(['/requests/foo.req.yml']);
    expect(addDepMock.getCall(1).args).toEqual(['/requests/bar.req.yml']);
  });

  it('does not load request bodies if disabled', () => {
    const
      specPath = '/spec/spec.yml',
      reqDir = path.join('/spec', OAS_REQUESTS_DEFAULT_DIR_NAME);

    mockSpecFiles(makeOasDefaultGlob(reqDir), {
      '/spec/requests/xyz.spec.yml': {
        Xyz: { type: 'integer' },
      },
    });

    const res = callLoader({
      thisArg: { resourcePath: specPath },
    });

    expectSpec(res).not.toHaveProperty('components');
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

  const expectSpec = resSource => expect(parseJsonModuleExports(resSource));
});
