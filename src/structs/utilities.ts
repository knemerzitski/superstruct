import { Context, Struct, Validator } from '../struct.js'
import {
  Assign,
  ObjectTypeRaw,
  ObjectSchema,
  ObjectType,
  PartialObjectSchema,
} from '../utils.js'
import { object, optional, type } from './types.js'

/**
 * Create a new struct that combines the properties properties from multiple
 * object or type structs. Its return type will match the first parameter's type.
 *
 * Like JavaScript's `Object.assign` utility.
 */

export function assign<A extends ObjectSchema, B extends ObjectSchema>(
  A: Struct<ObjectType<A>, A, ObjectTypeRaw<A>>,
  B: Struct<ObjectType<B>, B, ObjectTypeRaw<B>>
): Struct<ObjectType<Assign<A, B>>, Assign<A, B>, ObjectTypeRaw<Assign<A, B>>>
export function assign<
  A extends ObjectSchema,
  B extends ObjectSchema,
  C extends ObjectSchema,
>(
  A: Struct<ObjectType<A>, A, ObjectTypeRaw<A>>,
  B: Struct<ObjectType<B>, B, ObjectTypeRaw<B>>,
  C: Struct<ObjectType<C>, C, ObjectTypeRaw<C>>
): Struct<
  ObjectType<Assign<Assign<A, B>, C>>,
  Assign<Assign<A, B>, C>,
  ObjectTypeRaw<Assign<Assign<A, B>, C>>
>
export function assign<
  A extends ObjectSchema,
  B extends ObjectSchema,
  C extends ObjectSchema,
  D extends ObjectSchema,
>(
  A: Struct<ObjectType<A>, A, ObjectTypeRaw<A>>,
  B: Struct<ObjectType<B>, B, ObjectTypeRaw<B>>,
  C: Struct<ObjectType<C>, C, ObjectTypeRaw<C>>,
  D: Struct<ObjectType<D>, D, ObjectTypeRaw<D>>
): Struct<
  ObjectType<Assign<Assign<Assign<A, B>, C>, D>>,
  Assign<Assign<Assign<A, B>, C>, D>,
  ObjectTypeRaw<Assign<Assign<Assign<A, B>, C>, D>>
>
export function assign<
  A extends ObjectSchema,
  B extends ObjectSchema,
  C extends ObjectSchema,
  D extends ObjectSchema,
  E extends ObjectSchema,
>(
  A: Struct<ObjectType<A>, A, ObjectTypeRaw<A>>,
  B: Struct<ObjectType<B>, B, ObjectTypeRaw<B>>,
  C: Struct<ObjectType<C>, C, ObjectTypeRaw<C>>,
  D: Struct<ObjectType<D>, D, ObjectTypeRaw<D>>,
  E: Struct<ObjectType<E>, E, ObjectTypeRaw<E>>
): Struct<
  ObjectType<Assign<Assign<Assign<Assign<A, B>, C>, D>, E>>,
  Assign<Assign<Assign<Assign<A, B>, C>, D>, E>,
  ObjectTypeRaw<Assign<Assign<Assign<Assign<A, B>, C>, D>, E>>
>
export function assign(...Structs: Struct<any>[]): any {
  const isType = Structs[0].type === 'type'
  const schemas = Structs.map((s) => s.schema)
  const schema = Object.assign({}, ...schemas)
  return isType ? type(schema) : object(schema)
}

/**
 * Define a new struct type with a custom validation function.
 */

export function define<T, R = T>(
  name: string,
  validator: Validator
): Struct<T, null, R> {
  return new Struct({ type: name, schema: null, validator })
}

/**
 * Create a new struct based on an existing struct, but the value is allowed to
 * be `undefined`. `log` will be called if the value is not `undefined`.
 */

export function deprecated<T, R>(
  struct: Struct<T, unknown, R>,
  log: (value: unknown, ctx: Context) => void
): Struct<T, unknown, R> {
  return new Struct({
    ...struct,
    refiner: (value, ctx) => value === undefined || struct.refiner(value, ctx),
    validator(value, ctx) {
      if (value === undefined) {
        return true
      } else {
        log(value, ctx)
        return struct.validator(value, ctx)
      }
    },
  })
}

/**
 * Create a struct with dynamic validation logic.
 *
 * The callback will receive the value currently being validated, and must
 * return a struct object to validate it with. This can be useful to model
 * validation logic that changes based on its input.
 */

export function dynamic<T, R>(
  fn: (value: unknown, ctx: Context) => Struct<T, any, R>
): Struct<T, null, R> {
  return new Struct({
    type: 'dynamic',
    schema: null,
    *entries(value, ctx) {
      const struct = fn(value, ctx)
      yield* struct.entries(value, ctx)
    },
    validator(value, ctx) {
      const struct = fn(value, ctx)
      return struct.validator(value, ctx)
    },
    coercer(value, ctx) {
      const struct = fn(value, ctx)
      return struct.coercer(value, ctx)
    },
    refiner(value, ctx) {
      const struct = fn(value, ctx)
      return struct.refiner(value, ctx)
    },
  })
}

/**
 * Create a struct with lazily evaluated validation logic.
 *
 * The first time validation is run with the struct, the callback will be called
 * and must return a struct object to use. This is useful for cases where you
 * want to have self-referential structs for nested data structures to avoid a
 * circular definition problem.
 */

export function lazy<T, R>(fn: () => Struct<T, any, R>): Struct<T, null, R> {
  let struct: Struct<T, any, R> | undefined
  return new Struct({
    type: 'lazy',
    schema: null,
    *entries(value, ctx) {
      struct ??= fn()
      yield* struct.entries(value, ctx)
    },
    validator(value, ctx) {
      struct ??= fn()
      return struct.validator(value, ctx)
    },
    coercer(value, ctx) {
      struct ??= fn()
      return struct.coercer(value, ctx)
    },
    refiner(value, ctx) {
      struct ??= fn()
      return struct.refiner(value, ctx)
    },
  })
}

/**
 * Create a new struct based on an existing object struct, but excluding
 * specific properties.
 *
 * Like TypeScript's `Omit` utility.
 */

export function omit<S extends ObjectSchema, K extends keyof S>(
  struct: Struct<ObjectType<S>, S, ObjectTypeRaw<S>>,
  keys: K[]
): Struct<ObjectType<Omit<S, K>>, Omit<S, K>, ObjectTypeRaw<Omit<S, K>>> {
  const { schema } = struct
  const subschema: any = { ...schema }

  for (const key of keys) {
    delete subschema[key]
  }

  switch (struct.type) {
    case 'type':
      return type(subschema as Omit<S, K>)
    default:
      return object(subschema as Omit<S, K>)
  }
}

/**
 * Create a new struct based on an existing object struct, but with all of its
 * properties allowed to be `undefined`.
 *
 * Like TypeScript's `Partial` utility.
 */

export function partial<S extends ObjectSchema>(
  struct: Struct<ObjectType<S>, S, ObjectTypeRaw<S>> | S
): Struct<
  ObjectType<PartialObjectSchema<S>>,
  PartialObjectSchema<S>,
  ObjectTypeRaw<PartialObjectSchema<S>>
> {
  const isStruct = struct instanceof Struct
  const schema: any = isStruct ? { ...struct.schema } : { ...struct }

  for (const key in schema) {
    schema[key] = optional(schema[key])
  }

  if (isStruct && struct.type === 'type') {
    return type(schema) as any
  }

  return object(schema) as any
}

/**
 * Create a new struct based on an existing object struct, but only including
 * specific properties.
 *
 * Like TypeScript's `Pick` utility.
 */

export function pick<S extends ObjectSchema, K extends keyof S>(
  struct: Struct<ObjectType<S>, S, ObjectTypeRaw<S>>,
  keys: K[]
): Struct<ObjectType<Pick<S, K>>, Pick<S, K>, ObjectTypeRaw<Pick<S, K>>> {
  const { schema } = struct
  const subschema: any = {}

  for (const key of keys) {
    subschema[key] = schema[key]
  }

  switch (struct.type) {
    case 'type':
      return type(subschema) as any

    default:
      return object(subschema) as any
  }
}

/**
 * Define a new struct type with a custom validation function.
 *
 * @deprecated This function has been renamed to `define`.
 */

export function struct<T, R>(
  name: string,
  validator: Validator
): Struct<T, null, R> {
  console.warn(
    'superstruct@0.11 - The `struct` helper has been renamed to `define`.'
  )

  return define(name, validator)
}
