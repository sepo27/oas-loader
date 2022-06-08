## Rationale

Open API spec is (as of writing) still missing some key features:
- excluding properties when inheriting schemes
- merging (i.e. `allOf`) response schemes

The loader attempts to solve those problems while keeping the final spec valid.  
See the full list of features below.

### Features
- exclude properties when merging schemes (nested properties exclusion not supported)
- merging response schemes
- assembles final spec from scattered files across the project

## Usage

### Loader

```bash
npm i oas-loader -D
```

```javascript
// webspack.config.js

module.exports = {
    // ...
  
    module: {
        rules: [
          {
            test: /oas-spec.yml$/,
            use: [
              {
                loader: 'oas-loader',
                options: {/*...*/}, // See below
              },
              'json-loader',
              'yaml-loader',
            ],
          },
        ],
    }
  
    // ...
}
```

_(i) NOTE: Here implied that `yml` files are used for OAS. To use `json` files simply drop `yaml-loader`_

### Swagger setup

The example below relies on `swagger-ui`.

```typescript
// src/index.ts

import * as SwaggerUI from 'swagger-ui';
import * as spec from 'oas-spec.yml';

SwaggerUI({
  spec,
  dom_id: '#doc-app',
});
```

_(i) NOTE: Import of `oas-spec.yml` is resolved via webpack loader (see above)_  
_(i) NOTE2: The swagger setup here isn't complete. Refer to the docs_

### Spec files

Now spec files can be placed everywhere in the project.  
This come in handy when e.g. developing REST API where spec files are more conveniently reside along the handlers.  
(See options description and examples below).

### Options

```
{
  loader: 'oas-loader',
  options: {
    // Scrape and include 'paths' into the final spec
    paths: true,

    // Glob to filter out paths files (default: '<path-to-oas-spec.yml>/**/*.spec.yml')
    pathsGlob: '<path-to-src>/**/*.endp.yml',
    
    // Scrape and include 'components.schemes' into the final spec
    schemas: true,
    
    // Glob to filter out schemes files (default: '<path-to-oas-spec.yml>/**/*.spec.yml')
    schemasGlob: '<path-to-src>/types/**/*.type.yml',
  
    // Scrape and include 'components.parameters' into the final spec
    params: true,
    
    // Glob to filter out params files (default: '<path-to-oas-spec.yml>/**/*.spec.yml')
    paramsGlob: '<path-to-src>/params/**/*.param.yml',
  
    // Scrape and include 'components.responses' into the final spec
    responses: true,
    
    // Glob to filter out responses files (default: '<path-to-oas-spec.yml>/**/*.spec.yml')
    responsesGlob: '<path-to-src>/responses/**/*.resp.yml',

    // Whether to set the 'info.version' from package.json version
    infoVersionFromPackageJson: '<path-to-package.json>',
  },
}
```

### Examples

#### Typical REST API codebase
```
/src
  /handlers
    /fooHandler.ts
    /fooHandler.endp.yml

/doc
  /spec
    /types
    /params
    /responses
    /oas-spec.yml
  /src
    /index.ts
  /webpack
    webpack.config.js
    
/package.json
```

```yaml
# fooHandler.endp.yml

/foo
  get:
    operationId: "GetFoo"
    summary: "..."

    # ...
```

Webpack config
```javascript
// /doc/webpack/webspack.config.js

module.exports = {
    module: {
        rules: [
          {
            test: /oas-spec.yml$/,
            use: [
              {
                loader: 'oas-loader',
                options: {
                  paths: true,
                  pathsGlob: '/src/**/*.endp.yml',

                  schemas: true,
                  schemasGlob: '/doc/spec/types/**/*.type.yml',

                  params: true,
                  paramsGlob: '/doc/spec/params/**/*.param.yml',

                  responses: true,
                  responsesGlob: '/doc/spec/responses/**/*.resp.yml',

                  infoVersionFromPackageJson: '/package.json',
                },
              },
              'json-loader',
              'yaml-loader',
            ],
          },
        ],
    }
}
```

#### Excluding properties when merging schemes (`$excludeProperties`)

```yaml
# ...
requestBody:
  content:
    application/json:
      schema:
        allOf:
          - $ref: "#/components/schemas/FooScheme"
          - $excludeProperties: # NOTE: oas-loader feature
              - bar
```

This will produce a scheme with request body being a result of merging `FooScheme` but excluding `bar` property out of it.

#### Merging response schemes (`$merge`)
```yaml
# ...
responses:
  200:
    $merge:
      - $ref: "#/components/responses/CommonResponse"
      - description: "Non custom description"
```

Here the `200` response will be a result of merging `CommonResponse` with overriding `description` field

## Status

The lib is in active development and might emit unexpected results for complex cases !

## Publish
- `npm run version <version>` (See [npm version](https://docs.npmjs.com/cli/v8/commands/npm-version/) command)
