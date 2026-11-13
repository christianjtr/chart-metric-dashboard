import { describe, it, expect } from 'vitest'
import { extractCollection, extractPath } from './extract.js'

describe('extractPath', () => {
  const payload = {
    createdAt: '2026-01-01',
    meta: { count: 7, nested: { kind: 'a' } },
    items: [
      { kind: 'a', count: 1 },
      { kind: 'b', count: 2 }
    ]
  }

  it('resolves simple dot paths', () => {
    expect(extractPath(payload, 'createdAt')).toBe('2026-01-01')
    expect(extractPath(payload, 'meta.count')).toBe(7)
    expect(extractPath(payload, 'meta.nested.kind')).toBe('a')
  })

  it('resolves array wildcard paths flattening per element', () => {
    expect(extractPath(payload, 'items[].kind')).toEqual(['a', 'b'])
    expect(extractPath(payload, 'items[].count')).toEqual([1, 2])
    expect(extractPath(payload, 'items[].meta.missing')).toEqual([])
  })

  it('returns undefined for missing paths', () => {
    expect(extractPath(payload, 'nope')).toBeUndefined()
    expect(extractPath(payload, 'meta.nope')).toBeUndefined()
  })
})

describe('extractCollection', () => {
  it('extracts the referenced collection', () => {
    const payload = { data: { items: [1, 2, 3] } }
    expect(extractCollection(payload, 'data.items')).toEqual([1, 2, 3])
  })

  it('treats the root payload as a collection when path is empty', () => {
    expect(extractCollection([1, 2], '')).toEqual([1, 2])
  })

  it('returns empty array when the path misses', () => {
    expect(extractCollection({}, 'nope')).toEqual([])
  })
})
