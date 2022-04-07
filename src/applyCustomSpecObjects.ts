import * as deepMerge from 'deepmerge';
import { LooseObject } from './types';
import { mapObjectsRecursive } from './utils/mapObjectsRecursive';
import { findSpecObjByRef } from './utils/findSpecObjByRef';

const appliers = [
  applyExcludePropertiesObject,
  applyMergeObject,
];

export const applyCustomSpecObjects = (spec: LooseObject): LooseObject =>
  mapObjectsRecursive(spec, obj => {
    for (let i = 0; i < appliers.length; i++) {
      const [applied, resObj] = appliers[i](spec, obj);

      if (applied) {
        return resObj;
      }
    }

    return obj;
  });

/*** Lib ***/

function applyExcludePropertiesObject(spec, obj) {
  if (obj.allOf) {
    const
      refObj = obj.allOf.find(o => o.$ref),
      excludePropsObj = obj.allOf.find(o => o.$excludeProperties);

    if (refObj && excludePropsObj) {
      const refSchema = findSpecObjByRef(spec, refObj.$ref);

      if (refSchema && refSchema.type === 'object' && refSchema.properties) {
        const nextSchemaProps = Object.keys(refSchema.properties).reduce(
          (acc, propName) => (
            excludePropsObj.$excludeProperties.indexOf(propName) > -1
              ? acc
              : Object.assign(acc, { [propName]: refSchema.properties[propName] })
          ),
          {},
        );

        return [true, {
          ...refSchema,
          properties: nextSchemaProps,
        }];
      }
    }
  }

  return [false, obj];
}

function applyMergeObject(spec, obj) {
  if (obj.$merge && obj.$merge.length === 2) { // For now works only with simple two object deep merge
    const
      refObj = obj.$merge.find(o => o.$ref),
      patchObject = obj.$merge.find(o => !o.$ref);

    if (refObj && patchObject) {
      const refObjSrc = findSpecObjByRef(spec, refObj.$ref);

      if (refObjSrc) {
        return [true, deepMerge(refObjSrc, patchObject)];
      }
    }
  }

  return [false, obj];
}
