import * as sinonLib from 'sinon';
import { ModuleMock } from '@libj/tbench';
import { readYamlFile } from './readYmlFile';

describe('readYamlFile()', () => {
  let sinon, mock;

  beforeEach(() => {
    sinon = sinonLib.createSandbox();
    mock = {
      fs: ModuleMock('fs-extra', sinon),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('reads simple YAML file', () => {
    const filename = '/foo/bar.yml';

    mock.fs.existsSync.withArgs(filename).returns(true);
    mock.fs.readFileSync
      .withArgs(filename)
      .returns(Buffer.from(`
foo:
  bar: "bar"
  baz:
    - baz1
    - baz2
    - baz3
      `));

    expect(readYamlFile(filename)).toEqual({
      foo: {
        bar: 'bar',
        baz: ['baz1', 'baz2', 'baz3'],
      },
    });
  });

  it('errors out for invalid filename', () => {
    const filename = '/dummy.yml';

    mock.fs.existsSync.withArgs(filename).returns(false);

    expect(
      () => readYamlFile(filename),
    ).toThrow(new Error(`Yaml file '${filename}' is invalid`));
  });
});
