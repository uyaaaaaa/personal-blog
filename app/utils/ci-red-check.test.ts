import { describe, expect, it } from 'vitest'

describe('CI red check', () => {
  it('わざと落とす（#123 の確認用。次のコミットで戻す）', () => {
    expect(1).toBe(2)
  })
})
