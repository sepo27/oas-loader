const
  makeModuleExports = exports => `module.exports = ${exports}`,
  makeJsonModuleExports = exports => makeModuleExports(JSON.stringify(exports)),
  parseModuleExports = source => source.replace(/\s*module\.exports\s*=\s*/, '').trim(),
  parseJsonModuleExports = source => JSON.parse(parseModuleExports(source));

export { makeModuleExports, makeJsonModuleExports, parseModuleExports, parseJsonModuleExports };
