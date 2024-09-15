import { toFailures, shiftIterator, StructSchema, run } from './utils.js'
import { StructError, Failure } from './error.js'

/**
 * `Struct` objects encapsulate the validation logic for a specific type of
 * values. Once constructed, you use the `assert`, `is` or `validate` helpers to
 * validate unknown input data against the struct.
 */

export class Struct<T = unknown, S = unknown, R = T> {
  readonly TYPE!: T
  /**
   * Type without coercions
   */
  readonly TYPE_RAW!: R
  type: string
  schema: S
  raw?: Struct<R>
  coercer: (value: unknown, context: Context) => unknown
  validator: (value: unknown, context: Context) => Iterable<Failure>
  refiner: (value: T, context: Context) => Iterable<Failure>
  entries: (
    value: unknown,
    context: Context
  ) => Iterable<[string | number, unknown, Struct<any> | Struct<never>]>

  constructor(props: {
    type: string
    schema: S
    raw?: Struct<R>
    coercer?: Coercer
    validator?: Validator
    refiner?: Refiner<T>
    entries?: Struct<T, S, R>['entries']
  }) {
    const {
      type,
      schema,
      raw,
      validator,
      refiner,
      coercer = (value: unknown) => value,
      entries = function* () {},
    } = props

    this.type = type
    this.schema = schema
    this.raw = raw
    this.entries = entries
    this.coercer = coercer

    if (validator) {
      this.validator = (value, context) => {
        const result = validator(value, context)
        return toFailures(result, context, this, value)
      }
    } else {
      this.validator = () => []
    }

    if (refiner) {
      this.refiner = (value, context) => {
        const result = refiner(value, context)
        return toFailures(result, context, this, value)
      }
    } else {
      this.refiner = () => []
    }
  }

  /**
   * Assert that a value passes the struct's validation, throwing if it doesn't.
   */

  assert(value: unknown, message?: string): asserts value is T {
    return assert(value, this, message)
  }

  assertRaw(value: unknown, message?: string): asserts value is R {
    return assertRaw(value, this, message)
  }

  /**
   * Create a value with the struct's coercion logic, then validate it.
   */

  create(value: unknown, message?: string): T {
    return create(value, this, message)
  }

  createRaw(value: unknown, message?: string): R {
    return createRaw(value, this, message)
  }

  /**
   * Check if a value passes the struct's validation.
   */

  is(value: unknown): value is T {
    return is(value, this)
  }

  isRaw(value: unknown): value is R {
    return isRaw(value, this)
  }

  /**
   * Mask a value, coercing and validating it, but returning only the subset of
   * properties defined by the struct's schema. Masking applies recursively to
   * props of `object` structs only.
   */

  mask(value: unknown, message?: string): T {
    return mask(value, this, message)
  }

  maskRaw(value: unknown, message?: string): R {
    return maskRaw(value, this, message)
  }

  /**
   * Validate a value with the struct's validation logic, returning a tuple
   * representing the result.
   *
   * You may optionally pass `true` for the `coerce` argument to coerce
   * the value before attempting to validate it. If you do, the result will
   * contain the coerced result when successful. Also, `mask` will turn on
   * masking of the unknown `object` props recursively if passed.
   */

  validate<B extends boolean = false>(
    value: unknown,
    options: {
      validation?: any
      raw?: B
      coerce?: boolean
      mask?: boolean
      message?: string
    } = {}
  ): [StructError, undefined] | [undefined, B extends true ? R : T] {
    return validate(value, this, options)
  }
}

/**
 * Assert that a value passes a struct, throwing if it doesn't.
 */

export function assert<T, S, R>(
  value: unknown,
  struct: Struct<T, S, R>,
  message?: string
): asserts value is T {
  const result = validate(value, struct, { message })

  if (result[0]) {
    throw result[0]
  }
}

export function assertRaw<T, S, R>(
  value: unknown,
  struct: Struct<T, S, R>,
  message?: string
): asserts value is R {
  const result = validate(value, struct, { raw: true, message })

  if (result[0]) {
    throw result[0]
  }
}

/**
 * Create a value with the coercion logic of struct and validate it.
 */

export function create<T, S, R>(
  value: unknown,
  struct: Struct<T, S, R>,
  message?: string
): T {
  const result = validate(value, struct, { coerce: true, message })

  if (result[0]) {
    throw result[0]
  } else {
    return result[1]
  }
}

export function createRaw<T, S, R>(
  value: unknown,
  struct: Struct<T, S, R>,
  message?: string
): R {
  const result = validate(value, struct, { raw: true, coerce: true, message })

  if (result[0]) {
    throw result[0]
  } else {
    return result[1]
  }
}

/**
 * Mask a value, returning only the subset of properties defined by a struct.
 */

export function mask<T, S, R>(
  value: unknown,
  struct: Struct<T, S, R>,
  message?: string
): T {
  const result = validate(value, struct, {
    coerce: true,
    mask: true,
    message,
  })

  if (result[0]) {
    throw result[0]
  } else {
    return result[1]
  }
}

export function maskRaw<T, S, R>(
  value: unknown,
  struct: Struct<T, S, R>,
  message?: string
): R {
  const result = validate(value, struct, {
    raw: true,
    coerce: true,
    mask: true,
    message,
  })

  if (result[0]) {
    throw result[0]
  } else {
    return result[1]
  }
}

/**
 * Check if a value passes a struct.
 */

export function is<T, S, R>(
  value: unknown,
  struct: Struct<T, S, R>
): value is T {
  const result = validate(value, struct)
  return !result[0]
}

export function isRaw<T, S, R>(
  value: unknown,
  struct: Struct<T, S, R>
): value is R {
  const result = validate(value, struct, { raw: true })
  return !result[0]
}

/**
 * Validate a value against a struct, returning an error if invalid, or the
 * value (with potential coercion) if valid.
 */

export function validate<T, S, R, B extends boolean = false>(
  value: unknown,
  struct: Struct<T, S, R>,
  options: {
    validation?: any
    raw?: B
    coerce?: boolean
    mask?: boolean
    message?: string
  } = {}
): [StructError, undefined] | [undefined, B extends true ? R : T] {
  const tuples = run(value, struct, options)
  const tuple = shiftIterator(tuples)!

  if (tuple[0]) {
    const error = new StructError(tuple[0], function* () {
      for (const t of tuples) {
        if (t[0]) {
          yield t[0]
        }
      }
    })

    return [error, undefined]
  } else {
    const v = tuple[1]
    return [undefined, v]
  }
}

/**
 * A `Context` contains information about the current location of the
 * validation inside the initial input value. It also carries `mask`
 * since it's a run-time flag determining how the validation was invoked
 * (via `mask()` or via `validate()`), plus it applies recursively
 * to all of the nested structs.
 */

export type Context = {
  branch: Array<any>
  path: Array<any>
  mask?: boolean
}

/**
 * A type utility to extract the type from a `Struct` class.
 */

export type Infer<T extends Struct<any, any, any>> = T['TYPE']

/**
 * A type utility to extract the 'raw' type without any coerce from `Struct` class
 */
export type InferRaw<T extends Struct<any, any, any>> = T['TYPE_RAW']

/**
 * A type utility to describe that a struct represents a TypeScript type.
 */

export type Describe<T> = Struct<T, StructSchema<T>>

/**
 * A `Result` is returned from validation functions.
 */

export type Result =
  | boolean
  | string
  | Partial<Failure>
  | Iterable<boolean | string | Partial<Failure>>

/**
 * A `Coercer` takes an unknown value and optionally coerces it.
 */

export type Coercer<T = unknown> = (value: T, context: Context) => unknown

/**
 * A `Validator` takes an unknown value and validates it.
 */

export type Validator = (value: unknown, context: Context) => Result

/**
 * A `Refiner` takes a value of a known type and validates it against a further
 * constraint.
 */

export type Refiner<T> = (value: T, context: Context) => Result
