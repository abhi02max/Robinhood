/**
 * Basics -> Simulation.
 *
 * `basics` is the declared prerequisite of all sixteen other topics and held zero problems, so
 * this pattern is the very first thing a learner meets. That constrains it in a way later
 * patterns are not: the three problems here have to teach loop discipline without needing any
 * technique from a topic that comes later, and all three must be reachable in every one of the
 * six languages. A C learner walled off on the third problem of the introduction would have no
 * way forward.
 *
 * The progression is deliberate. Carry propagation over a digit array is pure state-update.
 * Reversing an integer adds the discipline of checking a bound BEFORE crossing it. Roman
 * numerals adds a lookup table driving the loop, which is the first time the data decides the
 * control flow rather than the other way round.
 *
 * Problem statements, scenarios, examples and hints are written for Robinhood. The underlying
 * algorithmic concepts are canonical and long-standing.
 */
export default {
  topic: 'basics',
  pattern: 'simulation',
  problems: [
    // =======================================================================
    {
      slug: 'increment-digit-array',
      title: 'Increment a Digit Array',
      difficulty: 'Easy',
      tags: ['simulation', 'array-traversal', 'carry-propagation'],
      description:
        'A non-negative whole number is stored as an array of decimal digits, most significant digit first, with no leading zeros. Return the array of digits representing that number plus one.\n\nThe number may be longer than any fixed-width integer type your language offers, so you cannot convert the whole thing to an `int`, add, and convert back. Work on the digits directly.\n\nAdding one only ever affects a suffix of the array: the run of trailing nines, plus the digit just before it. Everything to the left of that is untouched.',
      analogy:
        'A mechanical odometer in a car. Rolling 0999 forward by one kilometre does not recompute every wheel — the last wheel ticks past nine and nudges its neighbour, which ticks past nine and nudges its own neighbour, and the chain stops at the first wheel that had room to move.',
      constraints: [
        '1 <= digits.length <= 100',
        '0 <= digits[i] <= 9',
        'digits represents a number with no leading zeros, except the single-element array [0]',
      ],
      edgeCases: [
        'No carry at all, when the last digit is less than nine',
        'A single trailing nine, so exactly one carry happens',
        'Every digit is nine, which makes the answer one digit LONGER than the input',
        'The input is [0], whose successor is [1]',
        'Interior nines that must NOT be touched because the carry stops before reaching them',
      ],
      hints: [
        'Start at the last digit. If it is less than nine you can add one and stop immediately — nothing else in the array changes.',
        'A digit of nine becomes zero and passes a carry left. Keep walking left while you are still carrying.',
        'If you walk off the left end still carrying, every digit was a nine. The answer is a leading 1 followed by all zeros, and it is one element longer than the input.',
      ],
      brute: {
        name: 'Convert, Add, Convert Back',
        summary: 'Join the digits into one number, add one, then split the result back into digits.',
        intuition:
          'The most direct reading of the problem: the array denotes a number, so turn it into that number, increment it, and turn it back. It is obviously correct, which makes it a useful reference to check the digit-level version against.\n\nWhat it costs is the thing the constraints are chosen to expose. With up to 100 digits the value has no chance of fitting a 64-bit integer, so this only works in a language with arbitrary-precision integers, and even there it allocates a number hundreds of bits wide to answer a question about at most a handful of trailing digits.',
        steps: [
          'Concatenate the digits into a single numeric value using arbitrary-precision arithmetic.',
          'Add one to that value.',
          'Convert the result back into a list of decimal digits.',
          'Return the list.',
        ],
        js: 'function plusOne(digits) {\n  let value = 0n;\n  for (const d of digits) value = value * 10n + BigInt(d);\n  value += 1n;\n  return String(value).split("").map(Number);\n}',
        py: 'def plus_one(digits):\n    value = 0\n    for d in digits:\n        value = value * 10 + d\n    return [int(ch) for ch in str(value + 1)]',
        time: 'O(N)',
        space: 'O(N)',
      },
      optimal: {
        name: 'Right-to-Left Carry',
        summary: 'Walk from the last digit leftwards while a carry is still outstanding.',
        intuition:
          'Adding one propagates a carry only through trailing nines. The first digit from the right that is not a nine absorbs the carry and the process stops, so most of the array is never examined.\n\nThe one case that changes the array LENGTH is an input of all nines: the carry survives past the leftmost digit, so the result is a 1 followed by that many zeros. Handling it by prepending a 1 after the loop is cleaner than special-casing it up front, because the loop has already turned every nine into a zero by that point.',
        steps: [
          'Copy the digits so the input is not modified in place.',
          'Walk the index from the last position towards the first.',
          'If the digit is less than nine, add one to it and return immediately.',
          'Otherwise set it to zero and continue left, since the carry is still outstanding.',
          'If the loop finishes, every digit was nine: return a 1 followed by all the zeros.',
        ],
        js: 'function plusOne(digits) {\n  const out = digits.slice();\n  for (let i = out.length - 1; i >= 0; i--) {\n    if (out[i] < 9) {\n      out[i] += 1;\n      return out;\n    }\n    out[i] = 0;\n  }\n  return [1, ...out];\n}',
        py: 'def plus_one(digits):\n    out = list(digits)\n    i = len(out) - 1\n    while i >= 0:\n        if out[i] < 9:\n            out[i] += 1\n            return out\n        out[i] = 0\n        i -= 1\n    return [1] + out',
        time: 'O(N)',
        space: 'O(N)',
      },
      examples: [
        { payload: { digits: [1, 2, 3] }, expect: [1, 2, 4], explanation: 'The last digit is below nine, so it absorbs the carry and the first two digits are never examined.' },
        { payload: { digits: [1, 2, 9] }, expect: [1, 3, 0], explanation: 'The trailing nine becomes zero and passes a carry to the 2, which becomes 3 and stops the chain.' },
        { payload: { digits: [9, 9, 9] }, expect: [1, 0, 0, 0], explanation: 'Every digit is nine, so the carry escapes the left end and the answer is one digit longer than the input.' },
        { payload: { digits: [0] }, expect: [1], explanation: 'The smallest valid input. Zero plus one is one.' },
      ],
      cases: [
        { payload: { digits: [8] }, label: 'single digit, no carry' },
        { payload: { digits: [9] }, label: 'single nine, so the result grows to two digits' },
        { payload: { digits: [1, 9, 9] }, label: 'a run of two trailing nines' },
        { payload: { digits: [9, 8, 9] }, label: 'an interior nine that the carry must NOT reach' },
        { payload: { digits: [4, 3, 2, 1] }, label: 'no carry, four digits' },
        { payload: { digits: [1, 0, 0, 0, 0, 0, 0, 0, 0, 9] }, label: 'carry stops at a zero, not at a nine' },
        { payload: { digits: [2, 9, 9, 9, 9, 9, 9, 9, 9, 9] }, label: 'nine trailing nines, carry stops at the leading digit' },
        {
          payload: { digits: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9] },
          label: 'twenty-five nines — far past what a 64-bit integer can hold, so a convert-and-add solution in a fixed-width language fails here',
        },
      ],
    },

    // =======================================================================
    {
      slug: 'reverse-signed-integer-digits',
      title: 'Reverse the Digits of a Signed Integer',
      difficulty: 'Easy',
      tags: ['simulation', 'integer-math', 'overflow-safety'],
      description:
        'Given a signed integer `n`, return the value obtained by reversing the order of its decimal digits. The sign is preserved: reversing a negative number gives a negative number.\n\nThe answer must fit in a signed 32-bit integer, meaning the inclusive range -2147483648 to 2147483647. If the reversed value would fall outside that range, return `0` instead.\n\nThe interesting part is that last rule. You have to decide that the result will not fit *before* you compute it, because in a fixed-width type the moment you compute it the evidence is gone.',
      analogy:
        'Pouring liquid between measuring jugs. You check whether the next pour will overflow the jug while it is still in your hand — once it has spilled, measuring what is left in the jug tells you nothing about how much you lost.',
      constraints: [
        '-2147483648 <= n <= 2147483647',
        'The returned value must lie in the same range, or be 0 to signal that it does not',
      ],
      edgeCases: [
        'Zero, which reverses to itself',
        'Trailing zeros, which disappear because 120 reverses to 21 rather than 021',
        'A negative value, where the sign survives the reversal',
        'A value whose reversal overflows and must return 0',
        'The extreme inputs -2147483648 and 2147483647, whose reversals both overflow',
      ],
      hints: [
        'Peel digits off the right with remainder by ten, and build the answer by multiplying it by ten and adding the digit.',
        'Trailing zeros need no special handling. Multiplying an accumulator that is still zero by ten leaves it at zero.',
        'Before doing result = result * 10 + digit, ask whether result is already too large for that step to stay in range. Comparing result against 214748364 answers it without ever leaving the range.',
      ],
      brute: {
        name: 'Reverse as Text, Then Range-Check',
        summary: 'Turn the digits into a string, reverse it, parse it back, and reject the result if it is out of range.',
        intuition:
          'String reversal is the most obvious way to reverse anything, and it sidesteps digit arithmetic entirely. Handle the sign separately, reverse the digit characters, parse, and compare against the 32-bit bounds.\n\nIt is correct here only because the parse happens in a type wide enough to hold the out-of-range value long enough to notice. That is a property of the language, not of the algorithm, and it is exactly the crutch a fixed-width type takes away: in a language where the parse itself would wrap, the check comes too late. Writing it makes the difference concrete.',
        steps: [
          'Record whether the input is negative, then take its absolute value.',
          'Convert the magnitude to a string and reverse the characters.',
          'Parse the reversed string back into a number and reapply the sign.',
          'Return 0 if the value falls outside the signed 32-bit range, otherwise return it.',
        ],
        js: 'function reverseDigits(n) {\n  const negative = n < 0;\n  const reversed = Number(String(Math.abs(n)).split("").reverse().join(""));\n  const signed = negative ? -reversed : reversed;\n  if (signed < -2147483648 || signed > 2147483647) return 0;\n  return signed;\n}',
        py: 'def reverse_digits(n):\n    negative = n < 0\n    reversed_value = int(str(abs(n))[::-1])\n    signed = -reversed_value if negative else reversed_value\n    if signed < -2147483648 or signed > 2147483647:\n        return 0\n    return signed',
        time: 'O(D)',
        space: 'O(D)',
      },
      optimal: {
        name: 'Digit Arithmetic With a Pre-Check',
        summary: 'Build the result digit by digit, testing before each step whether that step can stay in range.',
        intuition:
          'Work on the magnitude and rebuild it in reverse: take the last digit with a remainder, append it to an accumulator, and drop it from the input. No strings, no allocation.\n\nThe guard is the point. The largest 32-bit magnitude is 2147483648, so if the accumulator already exceeds 214748364 then multiplying it by ten must leave the range whatever digit comes next. If it equals 214748364 exactly, only the final digit decides. Checking that first means the accumulator is never allowed to hold an invalid value at all, which is what makes the approach work in a language where overflow wraps silently rather than growing.',
        steps: [
          'Record the sign and work with the magnitude of the input.',
          'While the magnitude is non-zero, take its last digit with a remainder by ten.',
          'Before extending the accumulator, check whether accumulator * 10 + digit could exceed the 32-bit magnitude limit; if so return 0.',
          'Otherwise extend the accumulator and remove the digit from the magnitude.',
          'Reapply the sign and return the accumulator.',
        ],
        js: 'function reverseDigits(n) {\n  const negative = n < 0;\n  let rest = Math.abs(n);\n  const limit = negative ? 2147483648 : 2147483647;\n  let result = 0;\n  while (rest > 0) {\n    const digit = rest % 10;\n    if (result > Math.floor((limit - digit) / 10)) return 0;\n    result = result * 10 + digit;\n    rest = Math.floor(rest / 10);\n  }\n  return negative ? -result : result;\n}',
        py: 'def reverse_digits(n):\n    negative = n < 0\n    rest = abs(n)\n    limit = 2147483648 if negative else 2147483647\n    result = 0\n    while rest:\n        rest, digit = divmod(rest, 10)\n        if result > (limit - digit) // 10:\n            return 0\n        result = result * 10 + digit\n    return -result if negative else result',
        time: 'O(D)',
        space: 'O(1)',
      },
      examples: [
        { payload: { n: 123 }, expect: 321, explanation: 'Digits peel off as 3, 2, 1 and rebuild in that order.' },
        { payload: { n: -456 }, expect: -654, explanation: 'The sign is kept and only the magnitude is reversed.' },
        { payload: { n: 120 }, expect: 21, explanation: 'The trailing zero vanishes: multiplying a still-zero accumulator by ten leaves it zero, so 021 is simply 21.' },
        { payload: { n: 1563847412 }, expect: 0, explanation: 'The reversal would be 2147483651, which is above 2147483647, so the answer is 0. The pre-check catches this before the accumulator ever holds an invalid value.' },
      ],
      cases: [
        { payload: { n: 0 }, label: 'zero reverses to itself' },
        { payload: { n: 7 }, label: 'single digit' },
        { payload: { n: -7 }, label: 'single negative digit' },
        { payload: { n: 100 }, label: 'multiple trailing zeros collapse' },
        { payload: { n: 2147483647 }, label: 'largest 32-bit input; its reversal overflows, so 0' },
        { payload: { n: -2147483648 }, label: 'smallest 32-bit input; its reversal overflows, so 0' },
        { payload: { n: 1463847412 }, label: 'reverses to exactly 2147483641, which just fits' },
        { payload: { n: -1563847412 }, label: 'negative overflow case, must also return 0' },
        { payload: { n: 1010 }, label: 'alternating zeros' },
        { payload: { n: -120 }, label: 'negative with a trailing zero' },
      ],
    },

    // =======================================================================
    {
      slug: 'integer-to-roman-numeral',
      title: 'Integer to Roman Numeral',
      difficulty: 'Medium',
      tags: ['simulation', 'greedy-decomposition', 'lookup-table'],
      description:
        'Roman numerals are written from the largest value to the smallest, using the symbols `I` (1), `V` (5), `X` (10), `L` (50), `C` (100), `D` (500) and `M` (1000).\n\nFour values are written by subtraction rather than repetition: 4 is `IV`, 9 is `IX`, 40 is `XL`, 90 is `XC`, 400 is `CD` and 900 is `CM`. Outside those six cases a symbol is simply repeated, and no symbol is ever repeated more than three times in a row.\n\nGiven an integer `n` between 1 and 3999, return its Roman numeral form as a string.',
      analogy:
        'Paying an exact amount with the fewest notes and coins. You reach for the largest denomination that does not exceed what is left, hand it over, subtract, and repeat. The six subtractive pairs are simply extra denominations that happen to be written as two symbols.',
      constraints: ['1 <= n <= 3999'],
      edgeCases: [
        'The smallest input, 1, which is a single symbol',
        'The largest input, 3999, which needs the maximum three repetitions at several places',
        'Every subtractive pair: 4, 9, 40, 90, 400 and 900',
        'A value that needs exactly three repeats, such as 3 or 300, sitting right at the repetition limit',
        'A value with a zero in the middle, such as 1004, where a whole denomination is skipped',
      ],
      hints: [
        'Treat the six subtractive pairs as denominations in their own right, alongside the seven single symbols. That gives thirteen values and removes every special case.',
        'Keep the thirteen denominations in descending order with their symbols. Repeatedly take the largest one that does not exceed the remainder.',
        'Because 4 and 9 are denominations too, you can never need a fourth repetition of any symbol — the greedy choice handles the repetition limit for free.',
      ],
      brute: {
        name: 'Per-Place Digit Lookup',
        summary: 'Split the number into thousands, hundreds, tens and units, then look each digit up in a table for its place.',
        intuition:
          'Roman numerals are positional in practice: the hundreds digit only ever produces C, D and M symbols, the tens digit only X, L and C, and so on. So write out all ten spellings for each of the four places and concatenate the four lookups.\n\nIt is correct and fast, and it is a reasonable thing to reach for. The reason it is the brute force here is that it needs forty hand-written table entries, and every subtractive pair has to be spelled correctly in each of them. The greedy version encodes the same knowledge in thirteen entries and derives the repetitions instead of listing them, so there is far less to get wrong.',
        steps: [
          'Build four tables of ten strings each, one table per decimal place.',
          'Extract the thousands, hundreds, tens and units digits of the input.',
          'Look each digit up in its own table.',
          'Concatenate the four results in order from thousands to units.',
        ],
        js: 'function intToRoman(n) {\n  const thousands = ["", "M", "MM", "MMM"];\n  const hundreds = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM"];\n  const tens = ["", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC"];\n  const units = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];\n  return thousands[Math.floor(n / 1000)]\n    + hundreds[Math.floor(n / 100) % 10]\n    + tens[Math.floor(n / 10) % 10]\n    + units[n % 10];\n}',
        py: 'def int_to_roman(n):\n    thousands = ["", "M", "MM", "MMM"]\n    hundreds = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM"]\n    tens = ["", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC"]\n    units = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"]\n    return thousands[n // 1000] + hundreds[n // 100 % 10] + tens[n // 10 % 10] + units[n % 10]',
        time: 'O(1)',
        space: 'O(1)',
      },
      optimal: {
        name: 'Greedy Over Thirteen Denominations',
        summary: 'Walk a descending table of thirteen values, subtracting each as many times as it fits.',
        intuition:
          'Include the six subtractive pairs as values of their own — 900, 400, 90, 40, 9 and 4 — alongside the seven plain symbols. Sorted descending, that is a set of denominations where always taking the largest that fits produces the correct numeral.\n\nWhy greedy is safe here is worth stating: the denominations are arranged so that no value can be reached more than three times before a larger one becomes available. Taking IIII is impossible because by the fourth I the remainder would have been at least 4, and 4 is itself a denomination that would have been taken first. The repetition rule is a consequence of the table, not a check to apply.\n\nThis is the same shape as making change with the fewest coins, which is the reason the pattern belongs in Basics: recognising a decomposition problem is a more transferable skill than remembering forty spellings.',
        steps: [
          'List the thirteen values in descending order, each with its symbol.',
          'Walk the list, and while the current value does not exceed the remainder, append its symbol and subtract it.',
          'Move to the next smaller value and continue.',
          'Return the accumulated string once the remainder reaches zero.',
        ],
        js: 'function intToRoman(n) {\n  const table = [\n    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],\n    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],\n    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],\n  ];\n  let rest = n;\n  let out = "";\n  for (const [value, symbol] of table) {\n    while (rest >= value) {\n      out += symbol;\n      rest -= value;\n    }\n  }\n  return out;\n}',
        py: 'def int_to_roman(n):\n    table = (\n        (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),\n        (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),\n        (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"),\n    )\n    rest = n\n    pieces = []\n    for value, symbol in table:\n        count, rest = divmod(rest, value)\n        pieces.append(symbol * count)\n    return "".join(pieces)',
        // At most fifteen symbols are ever emitted, so the work is bounded regardless of n.
        time: 'O(1)',
        space: 'O(1)',
      },
      examples: [
        { payload: { n: 3 }, expect: 'III', explanation: 'Three repetitions of I, which is the maximum any symbol is allowed.' },
        { payload: { n: 58 }, expect: 'LVIII', explanation: '50 gives L, then 5 gives V, then three units give III.' },
        { payload: { n: 1994 }, expect: 'MCMXCIV', explanation: 'M for 1000, CM for 900, XC for 90 and IV for 4 — three subtractive pairs in one numeral.' },
        { payload: { n: 3999 }, expect: 'MMMCMXCIX', explanation: 'The largest input: MMM for 3000, then CM, XC and IX.' },
      ],
      cases: [
        { payload: { n: 1 }, label: 'smallest input' },
        { payload: { n: 4 }, label: 'subtractive pair IV' },
        { payload: { n: 9 }, label: 'subtractive pair IX' },
        { payload: { n: 40 }, label: 'subtractive pair XL' },
        { payload: { n: 90 }, label: 'subtractive pair XC' },
        { payload: { n: 400 }, label: 'subtractive pair CD' },
        { payload: { n: 900 }, label: 'subtractive pair CM' },
        { payload: { n: 300 }, label: 'exactly three repetitions of C' },
        { payload: { n: 1004 }, label: 'a zero in the middle, so the hundreds and tens are skipped' },
        { payload: { n: 2421 }, label: 'mixed places with a subtractive pair in the middle' },
        { payload: { n: 1666 }, label: 'every descending symbol appears once' },
      ],
      assume: (p) => (Number.isInteger(p.n) && p.n >= 1 && p.n <= 3999 ? true : 'n must be an integer in 1..3999'),
    },
  ],
};
