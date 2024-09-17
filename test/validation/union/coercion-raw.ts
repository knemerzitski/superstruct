import { union, string, number, instance, coerce } from '../../../src'

class ClassA {
  value: string
  constructor(value: string) {
    this.value = value
  }
}

class ClassB {
  value: number
  constructor(value: number) {
    this.value = value
  }
}

const A = coerce(
  instance(ClassA),
  string(),
  (value) => new ClassA(value),
  (a) => a.value
)
const B = coerce(
  instance(ClassB),
  number(),
  (value) => new ClassB(value),
  (b) => b.value
)

export const Struct = union([A, B])

export const data = new ClassB(5)

export const output = 5

export const create = true

export const raw = true
