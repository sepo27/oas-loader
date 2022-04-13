import * as deepMerge from 'deepmerge';
import { LooseObject } from './types';
import { mapReduceObjectRecursive } from './utils/mapReduceObjectRecursive';
import { findSpecObjByRef } from './utils/findSpecObjByRef';

const appliers = [
  applyExcludePropertiesObject,
  applyMergeObject,
];

export const applyCustomSpecObjects = (spec: LooseObject): LooseObject =>
  mapReduceObjectRecursive(spec, obj => {
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
        const
          restSchemas = obj.allOf.filter(o => !o.$ref && !o.$excludeProperties),
          finalMergedSchema = restSchemas.reduce((acc, schema) => Object.assign(acc, schema), { ...refSchema }),
          excludeList = excludePropsObj.$excludeProperties,
          finalSchemaProps = mapReduceObjectRecursive(refSchema.properties, (val, _, valPath) => {
            const propPath = valPath.filter(p => p !== 'properties').join('.');
            return excludeList.indexOf(propPath) === -1 ? val : undefined;
          });

        return [true, {
          ...finalMergedSchema,
          properties: finalSchemaProps,
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
