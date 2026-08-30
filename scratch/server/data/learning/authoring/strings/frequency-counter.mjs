/**
 * Strings -> Character Frequency Counter.
 *
 * The pattern: replace "compare two strings" or "find the odd character out" with
 * "compare two tallies". Four problems covering the three shapes the tally takes —
 * equality of two multisets, containment of one in another, a first-index question
 * the tally alone cannot answer, and an ordering driven by the tally's values.
 */
export default {
  topic: 'strings',
  pattern: 'frequency-counter',
  problems: [
    // -----------------------------------------------------------------------
    {
      slug: 'valid-anagram',
      title: 'Valid Anagram',
      difficulty: 'Easy',
      tags: ['frequency-counter', 'hash-map', 'strings'],
      companies: ['Amazon', 'Facebook', 'Bloomberg'],
      description:
        'Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.\n\nAn anagram uses exactly the same characters with exactly the same multiplicities, in any order. So this is a question about *multisets*, not about strings: `"aab"` and `"aba"` match, but `"aab"` and `"abb"` do not, even though both have three characters and the same character set.',
      analogy:
        'Two bags of Scrabble tiles. They are anagrams if you can pour both out and pair every tile in one with an identical tile in the other, with nothing left over on either side. Order in the bag is irrelevant; counts are everything.',
      constraints: ['1 <= s.length, t.length <= 5 * 10^4', 's and t consist of lowercase English letters'],
      edgeCases: [
        'Different lengths — can be rejected immediately',
        'Same character set but different counts, such as aab against abb',
        'Identical strings, which are trivially anagrams',
        'Single characters, matching and not matching',
        'One character repeated many times',
      ],
      hints: [
        'Sorting both strings and comparing is a correct one-liner. What does it cost, and can you avoid the sort?',
        'Count how often each character appears in s, then walk t decrementing those counts. If a count ever goes negative, or any count is left over, they are not anagrams.',
        'Check the lengths first. If they differ you can stop, and it also means "no leftovers in s" follows from "nothing went negative in t" — one loop instead of two.',
      ],
      brute: {
        name: 'Sort and Compare',
        summary: 'Sort the characters of both strings and check whether the results are identical.',
        intuition:
          'Two multisets are equal exactly when their sorted sequences are equal, so sorting normalises away the ordering that the problem says to ignore. It is three lines and hard to get wrong, which makes it a good oracle.\n\nThe cost is the sort: O(N log N) time, plus whatever the language spends building character arrays. For lowercase letters that is strictly more work than counting needs to do.',
        steps: [
          'If the lengths differ, return false.',
          'Split both strings into characters and sort each.',
          'Join and compare the two sorted sequences.',
        ],
        js: 'function isAnagram(s, t) {\n  if (s.length !== t.length) return false;\n  const a = s.split("").sort().join("");\n  const b = t.split("").sort().join("");\n  return a === b;\n}',
        py: 'def is_anagram(s, t):\n    if len(s) != len(t):\n        return False\n    return sorted(s) == sorted(t)',
        time: 'O(N log N)',
        space: 'O(N)',
      },
      optimal: {
        name: 'Single Frequency Table',
        summary: 'Tally s, then spend the tally on t; any shortfall means they are not anagrams.',
        intuition:
          'Build a count of each character in s. Then walk t and decrement. Two things can go wrong, and between them they cover every failure: a character in t that has no count left (it appears more often in t than in s), or a count still positive at the end (it appears more often in s).\n\nThe length check collapses those two cases into one. If the lengths are equal and nothing ever goes negative, then the total decrements equal the total increments, so no count can be left over. That means a single pass over t with an early return is enough — no second sweep of the table.\n\nO(N) time. Space is O(1) in the real sense: the alphabet is fixed at 26 lowercase letters, so the table never grows with the input.',
        steps: [
          'If the lengths differ, return false.',
          'Count each character of s into a map.',
          'For each character of t, decrement its count.',
          'If a count is missing or drops below zero, return false.',
          'Return true once t is exhausted.',
        ],
        js: 'function isAnagram(s, t) {\n  if (s.length !== t.length) return false;\n  const counts = new Map();\n  for (const ch of s) counts.set(ch, (counts.get(ch) || 0) + 1);\n  for (const ch of t) {\n    const left = counts.get(ch) || 0;\n    if (left === 0) return false;\n    counts.set(ch, left - 1);\n  }\n  return true;\n}',
        py: 'def is_anagram(s, t):\n    if len(s) != len(t):\n        return False\n    counts = {}\n    for ch in s:\n        counts[ch] = counts.get(ch, 0) + 1\n    for ch in t:\n        left = counts.get(ch, 0)\n        if left == 0:\n            return False\n        counts[ch] = left - 1\n    return True',
        time: 'O(N)',
        space: 'O(1)',
      },
      examples: [
        { payload: { s: 'anagram', t: 'nagaram' }, expect: true, explanation: 'Both hold three a, one n, one g, one r, one m.' },
        { payload: { s: 'rat', t: 'car' }, expect: false, explanation: 'Same length, but r/a/t and c/a/r differ in two characters.' },
        { payload: { s: 'aab', t: 'abb' }, expect: false, explanation: 'Same length and same character set, different counts. This is the case a set-based solution gets wrong.' },
        { payload: { s: 'a', t: 'ab' }, expect: false, explanation: 'Lengths differ, so the answer is false before any counting happens.' },
      ],
      cases: [
        { payload: { s: 'a', t: 'a' }, label: 'identical single characters' },
        { payload: { s: 'a', t: 'b' }, label: 'single characters, no match' },
        { payload: { s: 'ab', t: 'ba' }, label: 'minimal true case' },
        { payload: { s: 'aaaaa', t: 'aaaaa' }, label: 'one character repeated' },
        { payload: { s: 'aaaaa', t: 'aaaab' }, label: 'one character differs deep in the string' },
        { payload: { s: 'abcdefghij', t: 'jihgfedcba' }, label: 'full reversal' },
        { payload: { s: 'listen', t: 'silent' }, label: 'classic anagram pair' },
        { payload: { s: 'aacc', t: 'ccac' }, label: 'same set, counts off by one in two places' },
      ],
    },

    // -----------------------------------------------------------------------
    {
      slug: 'ransom-note',
      title: 'Ransom Note',
      difficulty: 'Easy',
      tags: ['frequency-counter', 'hash-map', 'strings'],
      companies: ['Amazon', 'Apple'],
      description:
        'Given two strings `ransomNote` and `magazine`, return `true` if `ransomNote` can be constructed using only the letters of `magazine`.\n\nEach letter of `magazine` may be used **at most once**. This is the containment version of the anagram question: the note does not have to use every letter, but it can never use a letter more times than the magazine supplies it.',
      analogy:
        'Cutting letters out of a newspaper to assemble a message. Once you cut out a letter it is gone, so having one letter e in the paper does not let you spell "keeper". Leftover letters in the newspaper are fine.',
      constraints: [
        '1 <= ransomNote.length, magazine.length <= 10^5',
        'ransomNote and magazine consist of lowercase English letters',
      ],
      edgeCases: [
        'Note longer than the magazine — impossible regardless of letters',
        'Note needs two of a letter the magazine supplies once',
        'Magazine has plenty of surplus letters, which must not cause a failure',
        'Note and magazine identical',
        'Single-character note and magazine',
      ],
      hints: [
        'This is not symmetric. Which of the two strings should you tally first?',
        'Tally the magazine, since it is the supply. Then walk the note and spend from that supply, failing the moment a letter runs out.',
        'Do not compare totals or sets — a set says "the magazine has an e" without saying how many, and the counts are the whole problem.',
      ],
      brute: {
        name: 'Consume From a Mutable Copy',
        summary: 'For each letter of the note, find it in a working copy of the magazine and remove that occurrence.',
        intuition:
          'Model the physical act: keep the magazine as a list of letters, and for each letter the note needs, search for it and cut it out. Removing it is what enforces "at most once", and it is why a plain "does the magazine contain this letter" check is wrong.\n\nEach search is O(M), so the total is O(N*M). Slow at these constraints, but it is the most literal reading of the problem and therefore the easiest to trust.',
        steps: [
          'Copy the magazine into a list of characters.',
          'For each character of the note, look for it in the list.',
          'If it is absent, return false.',
          'Otherwise remove that single occurrence and continue.',
          'Return true once every character of the note is placed.',
        ],
        js: 'function canConstruct(ransomNote, magazine) {\n  const supply = magazine.split("");\n  for (const ch of ransomNote) {\n    const at = supply.indexOf(ch);\n    if (at === -1) return false;\n    supply.splice(at, 1);\n  }\n  return true;\n}',
        py: 'def can_construct(ransomNote, magazine):\n    supply = list(magazine)\n    for ch in ransomNote:\n        if ch not in supply:\n            return False\n        supply.remove(ch)\n    return True',
        time: 'O(N*M)',
        space: 'O(M)',
      },
      optimal: {
        name: 'Tally the Supply, Spend It Once',
        summary: 'Count the magazine, then decrement per note character and fail on the first shortfall.',
        intuition:
          'The magazine is a supply of letters and the note is a demand on it. Counting the supply once turns each demand into an O(1) lookup, so one pass over each string is enough.\n\nUnlike the anagram problem, there is no length shortcut worth taking on both sides — surplus in the magazine is allowed, so a leftover count is not a failure. Only a shortfall is. That means the check is strictly "did any letter run out", and the loop can return the moment it does.\n\nA length check is still a valid fast path in one direction: a note longer than the magazine can never be satisfiable. It is an optimisation, not part of the correctness argument.\n\nO(N + M) time, O(1) space for a fixed 26-letter alphabet.',
        steps: [
          'Count each character of the magazine into a map.',
          'For each character of the note, read its remaining count.',
          'If the count is zero or absent, return false.',
          'Otherwise decrement it.',
          'Return true after the whole note is covered.',
        ],
        js: 'function canConstruct(ransomNote, magazine) {\n  const supply = new Map();\n  for (const ch of magazine) supply.set(ch, (supply.get(ch) || 0) + 1);\n  for (const ch of ransomNote) {\n    const left = supply.get(ch) || 0;\n    if (left === 0) return false;\n    supply.set(ch, left - 1);\n  }\n  return true;\n}',
        py: 'def can_construct(ransomNote, magazine):\n    supply = {}\n    for ch in magazine:\n        supply[ch] = supply.get(ch, 0) + 1\n    for ch in ransomNote:\n        left = supply.get(ch, 0)\n        if left == 0:\n            return False\n        supply[ch] = left - 1\n    return True',
        time: 'O(N + M)',
        space: 'O(1)',
      },
      examples: [
        { payload: { ransomNote: 'a', magazine: 'b' }, expect: false, explanation: 'The magazine has no a at all.' },
        { payload: { ransomNote: 'aa', magazine: 'ab' }, expect: false, explanation: 'The note needs two a but the magazine supplies one. A set-membership check wrongly accepts this.' },
        { payload: { ransomNote: 'aa', magazine: 'aab' }, expect: true, explanation: 'Two a are available and the leftover b is simply unused.' },
        { payload: { ransomNote: 'abc', magazine: 'cba' }, expect: true, explanation: 'Order never matters, only the counts.' },
      ],
      cases: [
        { payload: { ransomNote: 'a', magazine: 'a' }, label: 'exact single-character match' },
        { payload: { ransomNote: 'ab', magazine: 'a' }, label: 'note longer than the magazine' },
        { payload: { ransomNote: 'aaa', magazine: 'aaaaaa' }, label: 'large surplus of the needed letter' },
        { payload: { ransomNote: 'abcdef', magazine: 'fedcba' }, label: 'full permutation, exact fit' },
        { payload: { ransomNote: 'aabbcc', magazine: 'abcabc' }, label: 'interleaved supply, exact fit' },
        { payload: { ransomNote: 'aabbccd', magazine: 'abcabc' }, label: 'one extra letter the magazine lacks' },
        { payload: { ransomNote: 'zzz', magazine: 'zzyy' }, label: 'shortfall of one on the last needed letter' },
        { payload: { ransomNote: 'q', magazine: 'abcdefghijklmnopqrstuvwxyz' }, label: 'single letter from a full alphabet' },
      ],
    },

    // -----------------------------------------------------------------------
    {
      slug: 'first-unique-character-in-a-string',
      title: 'First Unique Character in a String',
      difficulty: 'Easy',
      tags: ['frequency-counter', 'hash-map', 'strings'],
      companies: ['Amazon', 'Bloomberg', 'Microsoft'],
      description:
        'Given a string `s`, return the index of the **first non-repeating character**. If every character repeats, return `-1`.\n\nA tally alone cannot answer this — it tells you which characters are unique but not which comes first. The shape of the solution is therefore two passes: one to learn the counts, one to walk the original string in order and report the first index whose count is 1.',
      analogy:
        'Reading down a guest list to find the first person who came alone. You cannot tell whether someone is alone until you have read the entire list, but the answer has to be reported in list order — so you read once to learn, and once to answer.',
      constraints: ['1 <= s.length <= 10^5', 's consists of lowercase English letters'],
      edgeCases: [
        'Every character repeats — the answer is -1',
        'The unique character is first',
        'The unique character is last',
        'Single character, which is trivially unique',
        'All characters identical',
        'Several unique characters, where the earliest must win',
      ],
      hints: [
        'Why can a single left-to-right pass not answer this?',
        'Because a character seen once so far might repeat later. Count everything first, then scan the string again in order and return the first index with a count of 1.',
        'The second pass must walk the original string, not the count table — a map gives you characters, and you need positions.',
      ],
      brute: {
        name: 'Re-Scan for Each Character',
        summary: 'For each index, scan the whole string to see whether that character appears anywhere else.',
        intuition:
          'Take each position in turn and ask whether its character occurs at any other position. The first index for which the answer is no is the result. It reads exactly like the problem statement and needs no auxiliary structure.\n\nThe cost is O(N^2) because each index triggers a full scan. At N = 10^5 that is 10^10 comparisons, far too slow, but the correctness is immediate and it establishes the ordering requirement precisely.',
        steps: [
          'For each index i:',
          'Scan every index j other than i.',
          'If no j holds the same character, return i.',
          'Return -1 if every index had a duplicate.',
        ],
        js: 'function firstUniqChar(s) {\n  for (let i = 0; i < s.length; i++) {\n    let duplicated = false;\n    for (let j = 0; j < s.length; j++) {\n      if (j !== i && s[j] === s[i]) { duplicated = true; break; }\n    }\n    if (!duplicated) return i;\n  }\n  return -1;\n}',
        py: 'def first_uniq_char(s):\n    n = len(s)\n    for i in range(n):\n        duplicated = False\n        for j in range(n):\n            if j != i and s[j] == s[i]:\n                duplicated = True\n                break\n        if not duplicated:\n            return i\n    return -1',
        time: 'O(N^2)',
        space: 'O(1)',
      },
      optimal: {
        name: 'Count, Then Scan in Order',
        summary: 'One pass to build the frequency table, a second pass over the string to find the first count of 1.',
        intuition:
          'Split the two questions the problem asks. "Which characters are unique?" is answered by a tally. "Which of them comes first?" is answered by position, which the tally has thrown away. So you need both, in that order: you cannot decide uniqueness until the whole string has been read, and you cannot decide order except by walking the string.\n\nThe second pass is the part worth being deliberate about. Iterating the map instead of the string gives a unique character, but in whatever order the map happens to hold — which is not the answer to the question. Walking indices 0, 1, 2, ... and returning the first whose count is 1 is what makes it "first".\n\nTwo passes, O(N) total, and O(1) space for the fixed 26-letter alphabet.',
        steps: [
          'Count every character of s into a map.',
          'Walk s again from index 0.',
          'Return the first index whose character has a count of exactly 1.',
          'Return -1 if the second pass finds none.',
        ],
        js: 'function firstUniqChar(s) {\n  const counts = new Map();\n  for (const ch of s) counts.set(ch, (counts.get(ch) || 0) + 1);\n  for (let i = 0; i < s.length; i++) {\n    if (counts.get(s[i]) === 1) return i;\n  }\n  return -1;\n}',
        py: 'def first_uniq_char(s):\n    counts = {}\n    for ch in s:\n        counts[ch] = counts.get(ch, 0) + 1\n    for i, ch in enumerate(s):\n        if counts[ch] == 1:\n            return i\n    return -1',
        time: 'O(N)',
        space: 'O(1)',
      },
      examples: [
        { payload: { s: 'leetcode' }, expect: 0, explanation: 'l appears once and is at index 0.' },
        { payload: { s: 'loveleetcode' }, expect: 2, explanation: 'l and o both repeat; v at index 2 is the first that does not.' },
        { payload: { s: 'aabb' }, expect: -1, explanation: 'Every character repeats, so there is no answer.' },
        { payload: { s: 'aabbc' }, expect: 4, explanation: 'The only unique character is last, so the scan has to run to the end.' },
      ],
      cases: [
        { payload: { s: 'z' }, label: 'single character' },
        { payload: { s: 'zz' }, label: 'single repeated character' },
        { payload: { s: 'abcdef' }, label: 'every character unique — answer is 0' },
        { payload: { s: 'aabbccddeeffg' }, label: 'unique character last after many pairs' },
        { payload: { s: 'dddccbba' }, label: 'unique character last, decreasing run lengths' },
        { payload: { s: 'abacabad' }, label: 'multiple uniques, earliest must win' },
        { payload: { s: 'aaaaaaaaab' }, label: 'long run then a single unique' },
        { payload: { s: 'xxyyzzxxyyzz' }, label: 'all characters repeat in blocks' },
      ],
    },

    // -----------------------------------------------------------------------
    {
      slug: 'sort-characters-by-frequency',
      title: 'Sort Characters by Frequency',
      difficulty: 'Medium',
      tags: ['frequency-counter', 'hash-map', 'sorting'],
      companies: ['Amazon', 'Google'],
      description:
        'Given a string `s`, return a string with the same characters sorted in **decreasing order of frequency**: all occurrences of the most frequent character first, then all occurrences of the next most frequent, and so on.\n\nCharacters with the same frequency are ordered by the character itself, ascending. That tie-break is part of this problem\'s specification so that there is exactly one correct answer — the original LeetCode version accepts any ordering of ties, which is not something a grader can check.',
      analogy:
        'A histogram redrawn as text: tallest bar first, and when two bars are the same height the one whose label comes first alphabetically goes on the left. Every character in the output appears exactly as many times as it did in the input.',
      constraints: [
        '1 <= s.length <= 5 * 10^5',
        's consists of uppercase and lowercase English letters and digits',
        'Ties in frequency are broken by the character in ascending order',
      ],
      edgeCases: [
        'All characters identical — the output equals the input',
        'Every character unique, so the tie-break alone decides the whole order',
        'Two characters with equal counts, exercising the tie-break directly',
        'Mixed case, where uppercase letters sort before lowercase in character order',
        'Digits mixed with letters, where digits sort before letters',
      ],
      hints: [
        'Build the tally first. What do you actually need to sort — the characters, or the string?',
        'Sort the distinct characters by count descending, then by character ascending, and expand each one into count copies.',
        'Sort the distinct characters, not the input string: there are at most 62 of them regardless of how long the input is, so the sort is effectively free and the total work is dominated by building the output.',
      ],
      brute: {
        name: 'Repeatedly Take the Current Maximum',
        summary: 'Scan the tally for the best remaining character, append its run, remove it, and repeat.',
        intuition:
          'A selection sort over the tally. Each round walks every distinct character to find the highest count, breaking ties by the smaller character, appends that many copies to the output, and drops it from consideration.\n\nWith K distinct characters this is O(K^2) comparisons plus the output building. K is bounded at 62 here, so it is not actually slow — but it makes the ordering rule explicit, and it is the version that shows the tie-break has to be applied at selection time, not afterwards.',
        steps: [
          'Count every character.',
          'While any character remains, scan for the one with the largest count, preferring the smaller character on a tie.',
          'Append that character repeated count times to the output.',
          'Remove it from the tally and repeat.',
        ],
        js: 'function frequencySort(s) {\n  const counts = new Map();\n  for (const ch of s) counts.set(ch, (counts.get(ch) || 0) + 1);\n  let out = "";\n  while (counts.size > 0) {\n    let bestChar = null;\n    let bestCount = -1;\n    for (const [ch, n] of counts) {\n      if (n > bestCount || (n === bestCount && ch < bestChar)) {\n        bestChar = ch;\n        bestCount = n;\n      }\n    }\n    out += bestChar.repeat(bestCount);\n    counts.delete(bestChar);\n  }\n  return out;\n}',
        py: 'def frequency_sort(s):\n    counts = {}\n    for ch in s:\n        counts[ch] = counts.get(ch, 0) + 1\n    out = []\n    while counts:\n        best_char = None\n        best_count = -1\n        for ch, n in counts.items():\n            if n > best_count or (n == best_count and ch < best_char):\n                best_char = ch\n                best_count = n\n        out.append(best_char * best_count)\n        del counts[best_char]\n    return "".join(out)',
        time: 'O(N + K^2)',
        space: 'O(N)',
      },
      optimal: {
        name: 'Sort the Distinct Characters by Count',
        summary: 'Tally, sort the distinct characters by count descending then character ascending, and expand.',
        intuition:
          'The output is fully determined by the tally: for each distinct character you know how many copies to emit, and the ordering rule tells you in what order to emit the runs. So the only thing that needs sorting is the list of distinct characters — never the string itself.\n\nThat distinction is the whole optimisation. The input can be half a million characters, but there are at most 62 distinct ones, so the comparison sort runs over a list of at most 62 entries. The remaining cost is building an output of length N, which is unavoidable.\n\nThe comparator has two keys in a fixed priority: count descending first, then the character ascending. Applying them in the other order gives alphabetical output, and applying only the first leaves ties resolved by whatever order the map iterates in — which is exactly the non-determinism this problem statement removes.',
        steps: [
          'Count every character into a map.',
          'Take the distinct characters as a list.',
          'Sort by count descending, breaking ties by character ascending.',
          'Concatenate each character repeated its count of times.',
        ],
        js: 'function frequencySort(s) {\n  const counts = new Map();\n  for (const ch of s) counts.set(ch, (counts.get(ch) || 0) + 1);\n  const distinct = [...counts.keys()];\n  distinct.sort((a, b) => {\n    const diff = counts.get(b) - counts.get(a);\n    if (diff !== 0) return diff;\n    return a < b ? -1 : a > b ? 1 : 0;\n  });\n  let out = "";\n  for (const ch of distinct) out += ch.repeat(counts.get(ch));\n  return out;\n}',
        py: 'def frequency_sort(s):\n    counts = {}\n    for ch in s:\n        counts[ch] = counts.get(ch, 0) + 1\n    distinct = sorted(counts.keys(), key=lambda ch: (-counts[ch], ch))\n    return "".join(ch * counts[ch] for ch in distinct)',
        time: 'O(N + K log K)',
        space: 'O(N)',
      },
      examples: [
        { payload: { s: 'tree' }, expect: 'eert', explanation: 'e appears twice so its run comes first; r and t both appear once and are ordered r then t by the tie-break.' },
        { payload: { s: 'cccaaa' }, expect: 'aaaccc', explanation: 'Both characters appear three times, so the tie-break puts a before c.' },
        { payload: { s: 'Aabb' }, expect: 'bbAa', explanation: 'b appears twice and leads. A and a both appear once, and uppercase A sorts before lowercase a in character order.' },
        { payload: { s: 'abcdef' }, expect: 'abcdef', explanation: 'All counts are 1, so the tie-break alone decides and the output is alphabetical.' },
      ],
      cases: [
        { payload: { s: 'a' }, label: 'single character' },
        { payload: { s: 'aaaa' }, label: 'one character repeated' },
        { payload: { s: '2a2b2' }, label: 'digits mixed with letters' },
        { payload: { s: 'zyxzyx' }, label: 'three characters all tied at two' },
        { payload: { s: 'aaabbc' }, label: 'strictly decreasing counts' },
        { payload: { s: 'abbcccdddd' }, label: 'strictly increasing counts, output fully reversed' },
        { payload: { s: 'ZzAa' }, label: 'all unique, mixed case ordering' },
        { payload: { s: 'mississippi' }, label: 'repeated letters with several tie groups' },
      ],
    },
  ],
};
