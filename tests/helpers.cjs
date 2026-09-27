const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
exports.load = function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const loaded = new Module(filename, module);
  loaded.filename = filename; loaded.paths = module.paths;
  loaded.require = specifier => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    if (specifier.startsWith('@/')) return load(specifier.slice(2) + '.ts', mocks);
    if (specifier.startsWith('.')) {
      const resolved = path.resolve(path.dirname(filename), specifier + '.ts');
      if (fs.existsSync(resolved)) return load(path.relative(path.resolve(__dirname, '..'), resolved), mocks);
    }
    return Module.prototype.require.call(loaded, specifier);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
  return loaded.exports;
};
