const path = require('path');

export const makeOasDefaultGlob = prefix => path.join(prefix, '**/*.spec.yml');
