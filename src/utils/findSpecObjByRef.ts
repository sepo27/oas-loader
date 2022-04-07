import { LooseObject } from '../types';

export const findSpecObjByRef = (spec: LooseObject, ref: string): LooseObject | null => {
  const specPath = ref.split('/').slice(1);

  let resObj = spec;

  for (let i = 0; i < specPath.length; i++) {
    const part = specPath[i];

    if (resObj[part] !== undefined) {
      resObj = resObj[part];
    } else {
      return null;
    }
  }

  return resObj;
};
