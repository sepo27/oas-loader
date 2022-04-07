import { LooseObject } from '../types';

type Mapper = (val: any, key: string, valPath: string[]) => any;

export const mapReduceObjectRecursive = (input: LooseObject, mapper: Mapper, valPath = []): any => {
  if (typeof input === 'object' && !Array.isArray(input)) {
    return Object.keys(input).reduce(
      (acc, key) => {
        const
          val = input[key],
          nextValPath = valPath.concat(key),
          nextVal = mapper(val, key, nextValPath);

        if (nextVal === undefined) {
          return acc;
        }

        const retVal = nextVal === val
          ? mapReduceObjectRecursive(val, mapper, nextValPath)
          : nextVal;

        return Object.assign(acc, { [key]: retVal });
      },
      {},
    );
  }

  return input;
};
