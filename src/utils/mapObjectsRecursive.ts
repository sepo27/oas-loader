export const mapObjectsRecursive = (input: any, mapper: (val: any, key: string) => any): any => {
  if (typeof input === 'object' && !Array.isArray(input)) {
    return Object.keys(input).reduce(
      (acc, key) => {
        const
          val = input[key],
          nextVal = mapper(val, key),
          retVal = nextVal === val
            ? mapObjectsRecursive(val, mapper)
            : nextVal;

        return Object.assign(acc, { [key]: retVal });
      },
      {},
    );
  }

  return input;
};
