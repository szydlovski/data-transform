# data-transform
 Transform data from objects in an organized manner.

# Usage

```
npm install @szydlovski/data-transform
```
```javascript
const { transformData } = require('@szydlovski/data-transform');

const sourceObject = {
  firstName: 'Jane',
  address: {
    streetName: 'Harrison Avenue',
    province: {
      name: 'Arizona'
    }
  }
}

const resultObject = transformData(sourceObject, [
  {
    from: 'firstName',
    to: 'name'
  },
  {
    // supports dot paths
    from: 'address.streetName',
    to: 'street'
  },
  {
    // supports array paths
    from: ['address', 'province', 'name'],
    to: 'province',
    // transform the extracted property
    transform: str => str.toUpperCase()
  },
  {
    from: ['address', 'country', 'name'],
    to: 'country',
    // use default is path doesn't exist
    default: 'United States'
  }
])

// resultObject will be

{
  name: 'Jane',
  street: 'Harrison Avenue',
  province: 'ARIZONA',
  country: 'United States'
}
```
For more see [Examples](#examples).

# API

## transformData(sourceObject, instructions[, options])

Transforms the properies of an object and returns a new object with the transformed properties. Does not mutate the original object. If provided with an array as the source, the transformation will be applied to each element and an array will be returned.

Arguments:
- `sourceObject` - can be an `object` or an `array`
- `instructions` - see [instructions](#instructions)
- `options` - optional, an `object` with the following properties:
  - `warn` - if `true` warnings will be logged if the extracted property does not exist, defaults to `false`

Returns: `object` or `array` with the transformed properties

Throws: `DataTransformError`

### Instructions

Instructions may be provided as an array of instruction objects, or a single instruction object (if you only need one transformation). An instruction object may have the following properties:
- `from` - required, specifies the properties to be extracted from the source object. Can take the form of:
  - a `string` dot path (e.g. `"foo.bar.baz"`) or an `array` path (e.g. `['foo', 'bar', 'baz']`) to extract a single property
  - `null` to extract the entire root source object (see [Accessing the source's root](#accessing-the-sources-root))
  - an `object` to extract multiple properties (see [Extracting multiple values](#extracting-multiple-values)), with the following properties:
    - `paths` - required, specifies the properties to be extracted, must be an `array` containing string dot paths, array paths, or a mix of the two (e.g. `['foo.bar', ['foo', 'baz']]`)
    - `combine` - optional, a `function` used to combine the multiple extracted properties. Will be called with the extracted properties as arguments, in the order in which they appear in the `paths` array. If not provided, the values will be returned as an array.
- `to` - required, specifies the location at which to save the extracted values. Can take the form of:
  - a `string` dot path (e.g. `"foo.bar.baz"`) or an `array` path (e.g. `['foo', 'bar', 'baz']`) save the extracted value to a specific property
  - `null`, in which case the extracted value's properties will be assigned to the result object. The extracted value must be an object.
- `instructions` - optional, `transformData` will be called on the extracted value with the provided instructions (see [Nested instructions](#nested-instructions))
- `transform` - optional, a `function` that will called with a single argument containing the extracted value (after applying nested instructions)
- `default` - optional, a default value to use if the extraction path does not exist on the source object. Will not be used if the property is explicitly set to `undefined` (see [Default vs. `undefined`](#default-vs-undefined)).

### Order of operations in instructions

Nested instructions are applied before transforms. Neither nested instructions nor transforms are applied if the extracted value does not exist.

## transformDataFactory(instructions)

Creates a new function that performs the predetermined transformation from provided instructions. See [Factory example](#factory-example).

Arguments:

- `instructions` - see [instructions](#instructions)

Returns: `function`

# Examples

## Arrays
```javascript

const sourceObject = [
  {
    name: 'Felix',
    location: {
      city: 'London'
    }
  },
  {
    name: 'Jessica',
    location: {
      city: 'Amsterdam'
    }
  }
];

// if the source object is an array, the transformation will
// be applied to each element
const resultObject = transformData(sourceObject, [
  {
    from: 'name',
    to: 'name'
  },
  {
    from: 'location.city',
    to: 'where'
  }
]);

// resultObject will be

[
  {
    name: 'Felix',
    where: 'London'
  },
  {
    name: 'Jessica',
    where: 'Amsterdam'
  }
]
```
## Accessing the source's root
```javascript
const sourceObject = {
  name: 'Jonas',
  job: {
    title: 'Senior Engineer',
    salaryAmount: 4500,
    salaryCurrency: 'EUR'
  }
}

const resultObject = transformData(sourceObject, [
  {
    from: 'name',
    to: 'firstName'
  },
  {
    from: 'job.title',
    to: 'jobTitle'
  },
  {
    // if from === null, the root source object is used
    from: null,
    to: 'sourceCopy',
    transform: JSON.stringify
  }
])

{
  firstName: 'Jonas',
  jobTitle: 'Senior Engineer',
  sourceCopy: '{"name":"Jonas","job":{"title":"Senior Engineer","salaryAmount":4500,"salaryCurrency":"EUR"}}'
}
```

## Extracting multiple values

```javascript
const sourceObject = {
  firstName: 'Jane',
  lastName: 'Doe',
  favoriteThings: {
    food: 'Pizza',
    music: 'Jazz'
  }
}

const resultObject = transformData(sourceObject, [
  {
    from: {
      // provide an array of paths
      paths: ['firstName', 'lastName'],
      // if a combine function is provided, it will be called
      // with the extracted values as arguments
      combine: (fName, lName) => `${fName} ${lName}`
    },
    to: 'fullName'
  },
  {
    from: {
      // paths may also be arrays, or a mix of dotpaths and arrays
      paths: [['favoriteThings', 'food'], 'favoriteThings.music']
      // if no combine function is given, an array containing
      // the extracted values will be returned
    },
    to: 'favorites'
  }
])

// resultObject will be

{
  fullName: 'Jane Doe',
  favorites: ['Pizza', 'Jazz']
}
```
## Nested instructions
```javascript
const sourceObject = {
  deeply: {
    nested: {
      property: {
        valueA: 12,
        valueB: 92,
        valueC: 33
      }
    }
  }
}

const resultObject = transformData(sourceObject, [
  {
    from: 'deeply.nested.property',
    instructions: [
      {
        from: 'valueA',
        to: 'a'
      },
      {
        from: 'valueB',
        to: 'b'
      },
      {
        from: 'valueC',
        to: 'c'
      },
    ],
    to: 'values'
  }
])

// resultObject will be

{
  values: {
    a: 12,
    b: 92,
    c: 33
  }
}

// you can also set the "to" path to null to assign
// the properties to the root result object

const resultObject = transformData(sourceObject, [
  {
    from: 'deeply.nested.property',
    instructions: [
      ...
    ],
    to: null
  }
])

// resultObject will be

{
  a: 12,
  b: 92,
  c: 33
}
```

## Default vs. `undefined`

```javascript
transformData({}, {
  from: 'foo',
  to: 'bar',
  default: 'this is a default value'
})

// will result in

{
  bar: 'this is a default value'
}

// but...

transformData({ foo: undefined }, {
  from: 'foo',
  to: 'bar',
  default: 'this is a default value'
})

// will result in

{
  bar: undefined
}
```

## Factory example

```javascript
const transformAddress = dataTransformFactory([
  {
    from: 'streetName',
    to: 'street'
  }
])

const resultObject = transformAddress({ streetName: 'Longview Road' });

// resultObject will be

{
  street: 'Longview Road'
}
```