import { string, coerce, object, optional } from '../../../src'

export const Struct = coerce(
  object({ a: string(), b: string() }),
  object({ a: string(), b: optional(string()) }),
  (value) => ({ a: value.a, b: value.a }),
  (value) => ({ a: value.a })
)

export const data = {
  a: 'foo',
  b: 'bar',
}

export const output = { a: 'foo' }

export const create = true

export const raw = true
