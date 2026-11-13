import { describe, it, expect, afterEach } from 'vitest'
import { resolveEnvRefs } from './env.js'

const ORIGINAL_ENV = process.env

afterEach(() => {
  process.env = ORIGINAL_ENV
})

describe('resolveEnvRefs', () => {
  it('resolves env: references in strings', () => {
    process.env.MY_API_KEY = 'secret-value'
    expect(resolveEnvRefs('env:MY_API_KEY')).toBe('secret-value')
  })

  it('replaces missing env vars with empty string', () => {
    delete process.env.MISSING_VAR
    expect(resolveEnvRefs('env:MISSING_VAR')).toBe('')
  })

  it('leaves plain strings untouched', () => {
    expect(resolveEnvRefs('Bearer token')).toBe('Bearer token')
    expect(resolveEnvRefs('environment')).toBe('environment')
  })

  it('resolves nested values inside objects and arrays', () => {
    process.env.MY_API_KEY = 'secret-value'
    const input = {
      headers: { Authorization: 'env:MY_API_KEY', 'X-Plain': 'plain' },
      urls: ['env:MY_API_KEY', 'literal']
    }
    expect(resolveEnvRefs(input)).toEqual({
      headers: { Authorization: 'secret-value', 'X-Plain': 'plain' },
      urls: ['secret-value', 'literal']
    })
  })

  it('passes through non-string primitives', () => {
    expect(resolveEnvRefs(42)).toBe(42)
    expect(resolveEnvRefs(null)).toBe(null)
    expect(resolveEnvRefs(undefined)).toBe(undefined)
  })
})
