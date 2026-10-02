/**
 * Subsequence fuzzy match with a small score for command-palette filtering.
 * Consecutive matches and word-start matches score higher; non-subsequences
 * score 0 (no match).
 */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim()
  const t = target.toLowerCase()
  if (!q) return 1
  if (t.includes(q)) return 100 + (t.startsWith(q) ? 50 : 0)

  let qi = 0
  let score = 0
  let streak = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++
      streak++
      const wordStart = ti === 0 || /[\s\-_\/]/.test(t[ti - 1])
      score += 2 + streak * 1.5 + (wordStart ? 4 : 0)
    } else {
      streak = 0
    }
  }
  return qi === q.length ? score : 0
}
