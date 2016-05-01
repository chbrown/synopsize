function count<T>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  values.forEach(value => {
    const previous = counts.has(value) ? counts.get(value) : 0;
    counts.set(value, previous + 1);
  });
  return counts;
}

function isEmpty(value: string): boolean {
  return (value === undefined) || /^\s*$/.test(value);
}

const knownTypes = [
  {
    id: 'DATETIME',
    // DATETIME: '2016-01-18T01:45:53Z', '2016-01-18 15:10:20'
    regExp: /^[12]\d{3}(-?)[01]\d\1[0123]\d[T ][012]?\d:[0-5]\d(:[0-5]\d)?Z?$/
  },
  {
    id: 'DATE',
    // DATE: '2016-01-18', '20160118' (but not '2016-01-40', '2016-0118', or '201601-18')
    regExp: /^[12]\d{3}(-?)[01]\d\1[0123]\d$/
  },
  {
    // INTEGER is a subset of some DATE formats, so it must come after
    id: 'INTEGER',
    // INTEGER: '-100', '0', '99' (but not '-' or '9223372036854775808')
    regExp: /^-?\d{1,10}$/
  },
  {
    // BIGINT is a superset of INTEGER, but we want to prefer INTEGER if possible
    id: 'BIGINT',
    // BIGINT: '-1000000000000000000', '0', or '9223372036854775808' (but not '-')
    regExp: /^-?\d{1,19}$/
  },
  {
    // REAL is a subset of INTEGER, so it must come after
    id: 'REAL',
    // REAL: '-100.05', '20', '99.004' (but not '.')
    regExp: /^-?(\d+|\.\d+|\d+\.\d*)$/
  },
  {
    id: 'TIME',
    // TIME: '23:54', '01:45', '4:90' (but not '2016-0118' or '201601-18')
    regExp: /^[012]?\d:[0-5]\d$/
  },
].map(({id, regExp}) => {
  const test = (values: any[]) => values.every(value => regExp.test(String(value)));
  return {id, regExp, test};
});

/**
Iterate through knownTypes, testing each one in turn on {values}, returning the
id (name) of the first one that matches. Thus, knownTypes should be ordered from
more- to less-specific types.
*/
function inferTypeName<T>(values: T[]): string {
  // knownType.test calls values.every(...), which is trivially true for the
  // empty array; so it's uninformative and we want to avoid that case.
  if (values.length > 0) {
    for (let knownType of knownTypes) {
      if (knownType.test(values)) {
        // return as soon as we find a match
        return knownType.id;
      }
    }
  }
  return 'TEXT';
}

export interface ColumnSynopsis<T> {
  /**
  The name of the datatype that can be used to hold all observed non-null values.
  */
  typeName: string;
  /**
  A copy of the input array.
  */
  values: T[];
  /**
  A subset of values for which isEmpty returns false.
  */
  nonEmptyValues: T[];
  /**
  The first value, after sorting using the default compareFunction definition
  (convert values to strings and sort lexicographically).
  */
  minimum: T;
  /**
  The last value, after sorting using the default compareFunction definition
  (convert values to strings and sort lexicographically).
  */
  maximum: T;
  /**
  Frequency tabulation mapping observed non-null values to the total number of
  observations. The number of null values can be derived as `total - totalNotNull`
  */
  counts: Map<T, number>;
}

/**
@param {string[]} values - A column of values that are similar in some way.
*/
export function synopsize<T>(values: T[]): ColumnSynopsis<T> {
  const total = values.length;
  const nonEmptyValues = values.filter(value => !isEmpty(String(value)));
  // TODO: maybe just extract the minimum / maximum, rather than sorting the whole thing?
  const sortedNonEmptyValues = nonEmptyValues.sort();
  return {
    typeName: inferTypeName(nonEmptyValues),
    values,
    nonEmptyValues,
    minimum: sortedNonEmptyValues[0],
    maximum: sortedNonEmptyValues[sortedNonEmptyValues.length - 1],
    counts: count(nonEmptyValues),
  };
}
