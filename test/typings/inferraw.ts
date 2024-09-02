import { expectTypeOf, it } from 'vitest'
import {
  array,
  assign,
  boolean,
  coerce,
  InferRaw,
  intersection,
  map,
  number,
  object,
  omit,
  partial,
  pick,
  record,
  string,
  union,
} from '../../src'

const numberToString = coerce(string(), number(), (val) => String(val))
const numberToBoolean = coerce(boolean(), number(), (val) => Boolean(val))
const stringToNumber = coerce(numberToBoolean, string(), (val) =>
  Number.parseInt(val)
)

it('number (number -> string)', () => {
  expectTypeOf<InferRaw<typeof numberToString>>().toEqualTypeOf<number>()
})

it('recursive coerce: string (string -> number -> boolean)', () => {
  expectTypeOf<InferRaw<typeof stringToNumber>>().toEqualTypeOf<string>()
})

it('object', () => {
  const obj = object({
    numberToString,
  })
  expectTypeOf<InferRaw<typeof obj>>().toEqualTypeOf<{
    numberToString: number
  }>()
})

it('array', () => {
  const arr = array(numberToString)
  expectTypeOf<InferRaw<typeof arr>>().toEqualTypeOf<number[]>()
})

it('record', () => {
  const rec = record(string(), numberToString)
  expectTypeOf<InferRaw<typeof rec>>().toEqualTypeOf<Record<string, number>>()
})

it('map', () => {
  const mymap = map(string(), numberToString)
  expectTypeOf<InferRaw<typeof mymap>>().toEqualTypeOf<Map<string, number>>()
})

it('intersection', () => {
  const obj = object({
    numberToString,
  })
  const obj2 = object({
    s: string(),
  })
  const inter = intersection([obj, obj2])
  expectTypeOf<InferRaw<typeof inter>>().toEqualTypeOf<
    { s: string } & {
      numberToString: number
    }
  >()
})

it('union', () => {
  const obj = object({
    numberToString,
  })
  const obj2 = object({
    s: string(),
  })
  const un = union([obj, obj2])
  expectTypeOf<InferRaw<typeof un>>().toEqualTypeOf<
    | { s: string }
    | {
        numberToString: number
      }
  >()
})

it('assign', () => {
  const obj = object({
    s: string(),
  })
  const obj2 = object({
    s: numberToString,
  })
  const un = assign(obj, obj2)
  expectTypeOf<InferRaw<typeof un>>().toEqualTypeOf<{
    s: number
  }>()
})

it('omit', () => {
  const obj = object({
    a: string(),
    s: numberToString,
  })
  const un = omit(obj, ['a'])
  expectTypeOf<InferRaw<typeof un>>().toEqualTypeOf<{
    s: number
  }>()
})

it('partial', () => {
  const obj = object({
    s: numberToString,
  })
  const un = partial(obj)
  expectTypeOf<InferRaw<typeof un>>().toEqualTypeOf<{
    s?: number | undefined
  }>()
})

it('pick', () => {
  const obj = object({
    a: string(),
    s: numberToString,
  })
  const un = pick(obj, ['s'])
  expectTypeOf<InferRaw<typeof un>>().toEqualTypeOf<{
    s: number
  }>()
})
