import { string, coerce, Struct as SrcStruct, number } from '../../../src'

function strToInt<T, S, R>(struct: SrcStruct<T, S, R>) {
  return coerce(
    struct,
    string(),
    (x) => Number.parseInt(x),
    (x) => String(x)
  )
}

function add<S, R>(value: number, struct: SrcStruct<number, S, R>) {
  return coerce(
    struct,
    number(),
    (x) => x + value,
    (x) => x - value
  )
}

function multiply<S, R>(value: number, struct: SrcStruct<number, S, R>) {
  return coerce(
    struct,
    number(),
    (x) => x * value,
    (x) => x / value
  )
}

export const Struct = strToInt(multiply(2, add(1, number())))

export const data = 11

export const output = '5'

export const create = true

export const raw = true
