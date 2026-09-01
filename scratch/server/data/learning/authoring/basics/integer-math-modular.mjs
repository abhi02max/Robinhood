/**
 * Basics -> Integer Math & Modular Arithmetic.
 *
 * Three problems that all replace "compute the thing" with "reason about the thing", which is the
 * habit this pattern exists to build:
 *
 *   gcd              stop searching, use a recurrence on remainders
 *   trailing zeroes  count prime factors instead of evaluating a factorial
 *   power            halve the exponent instead of multiplying n times
 *
 * A NOTE ON WHAT IS DELIBERATELY ABSENT
 * -------------------------------------
 * Canonical modular exponentiation with a modulus of 10^9+7 is NOT here, and its absence is a
 * decision rather than an oversight. Two reasons, recorded in the 3A.1 slot review:
 *
 *   - a product of two residues near 10^9 reaches ~10^18, which is outside the exact-integer
 *     range the expected-output format can represent;
 *   - the authoring pipeline derives every expected output from a JavaScript reference, and JS
 *     numbers are doubles, so a JS reference cannot compute (a*b) % 1000000007 exactly at all.
 *
 * Shrinking the modulus until the products fit would remove the overflow reasoning that is the
 * whole point of the canonical problem. So the power problem here is over doubles, which teaches
 * the identical halving recurrence honestly, and modular exponentiation waits for the typed
 * expected-output architecture.
 */
export default {
  topic: 'basics',
  pattern: 'integer-math-modular',
  problems: [
    // =======================================================================
    {
      slug: 'greatest-common-divisor-euclid',
      title: 'Greatest Common Divisor',
      difficulty: 'Easy',
      tags: ['integer-math', 'euclidean-algorithm', 'recurrence'],
      description:
        'Given two positive integers `a` and `b`, return their greatest common divisor: the largest positive integer that divides both of them exactly.\n\nThe obvious approach is to try every candidate downwards until one divides both. There is a far better one, and it comes from a single observation: any number that divides both `a` and `b` also divides their remainder `a mod b`. That turns a search into a recurrence.',
      analogy:
        'Tiling a rectangular floor with identical square tiles and no cutting. Lay the largest squares that fit along the short side, and you are left with a smaller rectangle; the biggest tile that works for the original floor is exactly the biggest tile that works for the leftover strip. Repeat until the leftover is itself a perfect square of tiles.',
      constraints: ['1 <= a <= 10^9', '1 <= b <= 10^9'],
      edgeCases: [
        'The two values are equal, so the answer is the value itself',
        'One value divides the other exactly, so the answer is the smaller one',
        'The values are coprime, so the answer is 1',
        'a is smaller than b, which the recurrence must handle without a special case',
        'A pair where the answer is large relative to the inputs, such as two multiples of a big prime',
      ],
      hints: [
        'If d divides both a and b, then d also divides a - b, and more usefully it divides a mod b. What does that let you replace the pair with?',
        'gcd(a, b) = gcd(b, a mod b), and gcd(a, 0) = a. Two lines, and no searching.',
        'The order of the arguments takes care of itself. If a is smaller than b, then a mod b is just a, and the first step swaps them.',
      ],
      brute: {
        name: 'Search Downwards for a Common Divisor',
        summary: 'Try every candidate from the smaller input down to one, and return the first that divides both.',
        intuition:
          'The definition is a search: the greatest common divisor is the largest number dividing both, so test candidates from largest to smallest and stop at the first success. It is correct by construction and needs no insight at all, which is what makes it the right thing to compare against.\n\nThe cost is the problem. With inputs up to 10^9 and a coprime pair, this walks nearly a billion candidates to return 1. It is a good demonstration that "obviously correct" and "usable" are different properties.',
        steps: [
          'Let candidate start at the smaller of the two inputs.',
          'While candidate is at least one, test whether it divides both a and b exactly.',
          'Return candidate at the first success.',
          'Otherwise decrease candidate by one and continue.',
        ],
        js: 'function gcd(a, b) {\n  let candidate = Math.min(a, b);\n  while (candidate >= 1) {\n    if (a % candidate === 0 && b % candidate === 0) return candidate;\n    candidate -= 1;\n  }\n  return 1;\n}',
        py: 'def gcd(a, b):\n    candidate = min(a, b)\n    while candidate >= 1:\n        if a % candidate == 0 and b % candidate == 0:\n            return candidate\n        candidate -= 1\n    return 1',
        time: 'O(min(a, b))',
        space: 'O(1)',
      },
      optimal: {
        name: 'Euclidean Algorithm',
        summary: 'Replace the pair with (b, a mod b) until the second value reaches zero.',
        intuition:
          'Every common divisor of `a` and `b` is also a common divisor of `b` and `a mod b`, and the reverse holds too, so the two pairs have exactly the same set of common divisors — and therefore the same greatest one. That licenses replacing the problem with a strictly smaller one.\n\nIt shrinks fast. Each step replaces `a` with a remainder, which is smaller than `b`, so the pair at least halves every two steps; a pair near 10^9 finishes in a few dozen iterations rather than a billion. When the second value hits zero the first value divides both and is the answer.\n\nThis is the pattern in miniature: not a cleverer search, but a rule that makes the search unnecessary.',
        steps: [
          'While b is non-zero, compute the remainder of a divided by b.',
          'Replace a with b and b with that remainder.',
          'When b reaches zero, a holds the greatest common divisor.',
          'Return a.',
        ],
        js: 'function gcd(a, b) {\n  let x = a;\n  let y = b;\n  while (y !== 0) {\n    const remainder = x % y;\n    x = y;\n    y = remainder;\n  }\n  return x;\n}',
        py: 'def gcd(a, b):\n    x, y = a, b\n    while y:\n        x, y = y, x % y\n    return x',
        time: 'O(log(min(a, b)))',
        space: 'O(1)',
      },
      examples: [
        { payload: { a: 12, b: 18 }, expect: 6, explanation: '18 mod 12 is 6, then 12 mod 6 is 0, so the answer is 6.' },
        { payload: { a: 7, b: 13 }, expect: 1, explanation: 'Coprime inputs. The brute force would test thirteen candidates to learn this; the recurrence takes three steps.' },
        { payload: { a: 100, b: 25 }, expect: 25, explanation: '25 divides 100 exactly, so the first remainder is already zero.' },
        { payload: { a: 8, b: 20 }, expect: 4, explanation: 'The smaller value comes first, and the recurrence handles it without a swap: 8 mod 20 is 8, which swaps the pair on the next step.' },
      ],
      cases: [
        { payload: { a: 1, b: 1 }, label: 'smallest valid input' },
        { payload: { a: 1, b: 1000000000 }, label: 'one is 1, so the answer is 1' },
        { payload: { a: 17, b: 17 }, label: 'equal values, answer is the value' },
        { payload: { a: 1000000000, b: 1000000000 }, label: 'both at the constraint ceiling' },
        { payload: { a: 999999937, b: 999999937 }, label: 'a large prime paired with itself' },
        { payload: { a: 999999937, b: 2 }, label: 'a large prime and 2 are coprime' },
        { payload: { a: 462, b: 1071 }, label: 'the classic worked pair, answer 21' },
        { payload: { a: 270, b: 192 }, label: 'answer 6 after several remainder steps' },
        { payload: { a: 610, b: 377 }, label: 'consecutive Fibonacci numbers, the worst case for the number of steps' },
        { payload: { a: 123456789, b: 987654321 }, label: 'large pair with a small answer' },
      ],
      assume: (p) => (p.a >= 1 && p.b >= 1 ? true : 'both inputs must be at least 1'),
    },

    // =======================================================================
    {
      slug: 'trailing-zeroes-in-factorial',
      title: 'Trailing Zeroes in a Factorial',
      difficulty: 'Easy',
      tags: ['integer-math', 'prime-factorisation', 'counting'],
      description:
        'For a non-negative integer `n`, return the number of trailing zeroes in `n` factorial — the product of every integer from 1 to `n`.\n\nYou must not compute the factorial. Even a modest `n` produces a number with thousands of digits, and the question does not need it: a trailing zero is a factor of ten, a factor of ten is a two paired with a five, and in a factorial the twos always outnumber the fives. So the answer is simply how many times five divides into the product.',
      analogy:
        'Counting how many complete gift boxes you can pack when each box needs one lid and one base. You have far more bases than lids, so you never need to count the bases at all — the number of lids decides it. Fives are the lids.',
      constraints: ['0 <= n <= 10000'],
      edgeCases: [
        'n = 0, whose factorial is 1 and has no trailing zeroes',
        'n below five, where no factor of five exists yet so the answer is 0',
        'n = 25, where 25 contributes TWO fives rather than one',
        'n = 125, which contributes three fives, so counting multiples of five once is not enough',
        'A value just below a power of five, where the count does not yet increase',
      ],
      hints: [
        'A trailing zero comes from a factor of ten, and a factor of ten is a two times a five. Which of the two is scarcer in a factorial?',
        'Count how many numbers from 1 to n are multiples of five. Then remember that 25 contributes two fives, 125 contributes three, and so on.',
        'Add n/5, then n/25, then n/125, using integer division, until the term becomes zero. Each pass counts one more five from the numbers that have several.',
      ],
      brute: {
        name: 'Multiply Out and Count',
        summary: 'Build the factorial with arbitrary-precision arithmetic, then strip zeroes off the end.',
        intuition:
          'The literal reading: form the product, look at it, count the zeroes at the end. Obviously correct, and useful precisely because it is the thing the optimal approach claims to make unnecessary.\n\nIt also shows why the constraint on `n` matters. The factorial of 10000 has more than 35,000 digits; computing it takes real time and memory in a language with big integers, and is simply impossible in a fixed-width type. The answer, meanwhile, is a number below 2500.',
        steps: [
          'Set an accumulator to one.',
          'Multiply it by every integer from two to n using arbitrary-precision arithmetic.',
          'Repeatedly divide out factors of ten while the accumulator ends in a zero, counting as you go.',
          'Return the count.',
        ],
        js: 'function trailingZeroes(n) {\n  let product = 1n;\n  for (let i = 2n; i <= BigInt(n); i++) product *= i;\n  let count = 0;\n  while (product > 0n && product % 10n === 0n) {\n    count += 1;\n    product /= 10n;\n  }\n  return count;\n}',
        py: 'def trailing_zeroes(n):\n    product = 1\n    for i in range(2, n + 1):\n        product *= i\n    count = 0\n    while product and product % 10 == 0:\n        count += 1\n        product //= 10\n    return count',
        time: 'O(N^2)',
        space: 'O(N)',
      },
      optimal: {
        name: 'Count Factors of Five',
        summary: 'Sum n/5 + n/25 + n/125 + ... with integer division, stopping when the term is zero.',
        intuition:
          'Every trailing zero needs a five and a two. Between 1 and n the multiples of two are more than twice as many as the multiples of five, so twos are never the limiting factor and the answer is exactly the number of fives in the prime factorisation of the product.\n\nCounting them takes one subtlety. Adding n/5 counts one five for each multiple of five, but 25 contains two fives, 125 contains three, and each of those has only been counted once so far. Adding n/25 gives every multiple of 25 its second five, adding n/125 gives every multiple of 125 its third, and so on. The terms shrink by a factor of five each time, so the loop runs about log base five of n times — five or six iterations for any n in range.',
        steps: [
          'Set count to zero and power to five.',
          'While power does not exceed n, add the integer division of n by power to count.',
          'Multiply power by five.',
          'Return count.',
        ],
        js: 'function trailingZeroes(n) {\n  let count = 0;\n  let power = 5;\n  while (power <= n) {\n    count += Math.floor(n / power);\n    power *= 5;\n  }\n  return count;\n}',
        py: 'def trailing_zeroes(n):\n    count = 0\n    power = 5\n    while power <= n:\n        count += n // power\n        power *= 5\n    return count',
        time: 'O(log N)',
        space: 'O(1)',
      },
      examples: [
        { payload: { n: 3 }, expect: 0, explanation: '3 factorial is 6. There is no factor of five yet, so no trailing zero.' },
        { payload: { n: 5 }, expect: 1, explanation: '5 factorial is 120. One five appears, giving one trailing zero.' },
        { payload: { n: 25 }, expect: 6, explanation: 'Five multiples of five give five, and 25 itself contributes a second five, so 25/5 + 25/25 = 5 + 1 = 6.' },
        { payload: { n: 0 }, expect: 0, explanation: 'Zero factorial is 1, which has no trailing zeroes.' },
      ],
      cases: [
        { payload: { n: 1 }, label: 'smallest positive input' },
        { payload: { n: 4 }, label: 'just below the first multiple of five' },
        { payload: { n: 10 }, label: 'two multiples of five' },
        { payload: { n: 24 }, label: 'just below 25, so the second five has not appeared yet' },
        { payload: { n: 26 }, label: 'just above 25' },
        { payload: { n: 124 }, label: 'just below 125, where a naive n/5 + n/25 is still correct' },
        { payload: { n: 125 }, label: 'a third power of five, so a two-term sum is now wrong' },
        { payload: { n: 626 }, label: 'past the fourth power of five' },
        { payload: { n: 3125 }, label: 'a fifth power of five' },
        { payload: { n: 10000 }, label: 'constraint ceiling; the brute force would build a 35000-digit number' },
      ],
      assume: (p) => (Number.isInteger(p.n) && p.n >= 0 && p.n <= 10000 ? true : 'n must be an integer in 0..10000'),
    },

    // =======================================================================
    {
      slug: 'power-by-squaring',
      title: 'Power by Squaring',
      difficulty: 'Medium',
      tags: ['integer-math', 'divide-and-conquer', 'exponentiation'],
      description:
        'Given a value `x` and an integer exponent `n`, return `x` raised to the power `n`. The exponent may be negative, in which case the answer is the reciprocal of the positive power.\n\nMultiplying `x` by itself `n` times is the obvious method and it is too slow for a large exponent. There is a much better one built on a single identity: `x^n` is `(x^(n/2))^2` when `n` is even. Each step halves the exponent instead of decreasing it by one.\n\nCompare answers with a small tolerance rather than exact equality, since the result is a floating-point value.',
      analogy:
        'Folding a sheet of paper to get 1024 layers. You do not stack sheets one at a time; you fold ten times, and each fold squares the layer count you already have. Ten operations instead of a thousand.',
      constraints: [
        '-100.0 < x < 100.0',
        '-1000 <= n <= 1000',
        'x is not zero when n is negative',
        'The answer fits comfortably within double precision',
      ],
      edgeCases: [
        'An exponent of zero, whose answer is 1 for any base',
        'An exponent of one, whose answer is the base',
        'A negative exponent, which inverts the result',
        'A negative base with an odd exponent, so the sign survives, and with an even exponent, so it does not',
        'A base of 1 or -1 with a large exponent, where the answer stays bounded',
      ],
      hints: [
        'If n is even then x^n equals (x*x)^(n/2). That single rewrite halves the exponent for the cost of one multiplication.',
        'If n is odd, peel one factor off: x^n = x * x^(n-1), and now the exponent is even.',
        'Handle a negative exponent once, at the start, by taking the reciprocal of the base and negating the exponent. Do not scatter the sign check through the loop.',
      ],
      brute: {
        name: 'Repeated Multiplication',
        summary: 'Multiply the base by itself as many times as the exponent says.',
        intuition:
          'The definition of a power is repeated multiplication, so do exactly that in a loop and invert at the end if the exponent was negative. It is correct and completely transparent.\n\nIt is also linear in the exponent, which is the wrong shape: doubling the exponent doubles the work. That matters less at n = 1000 than it would at n = 10^9, and the reason to write it anyway is that it makes the accumulated floating-point error visible — a thousand successive multiplications drift further from the true value than ten squarings do.',
        steps: [
          'Take the absolute value of the exponent and remember whether it was negative.',
          'Set an accumulator to one and multiply it by the base that many times.',
          'If the exponent was negative, return the reciprocal of the accumulator.',
          'Otherwise return the accumulator.',
        ],
        js: 'function myPow(x, n) {\n  const negative = n < 0;\n  let times = Math.abs(n);\n  let result = 1;\n  for (let i = 0; i < times; i++) result *= x;\n  return negative ? 1 / result : result;\n}',
        py: 'def my_pow(x, n):\n    negative = n < 0\n    result = 1.0\n    for _ in range(abs(n)):\n        result *= x\n    return 1 / result if negative else result',
        time: 'O(N)',
        space: 'O(1)',
      },
      optimal: {
        name: 'Exponentiation by Squaring',
        summary: 'Square the base and halve the exponent, multiplying the answer in whenever the exponent is odd.',
        intuition:
          'Write the exponent in binary. Then `x^n` is the product of `x^(2^k)` over exactly the bit positions k where the exponent has a one. Squaring the base repeatedly walks through `x`, `x^2`, `x^4`, `x^8` and so on, so a single pass over the bits of the exponent is enough.\n\nMechanically: while the exponent is non-zero, if it is odd multiply the accumulator by the current base, then square the base and halve the exponent. The number of iterations is the number of bits in the exponent, so an exponent of 1000 takes ten steps rather than a thousand.\n\nThe negative exponent is handled once, before the loop, by replacing the base with its reciprocal. Doing it up front rather than inside the loop is what keeps the loop free of special cases — the same instinct as peeling the sign off before reversing digits.',
        steps: [
          'If the exponent is negative, replace the base with its reciprocal and negate the exponent.',
          'Set the accumulator to one.',
          'While the exponent is non-zero, multiply the accumulator by the base if the exponent is odd.',
          'Square the base and halve the exponent using integer division.',
          'Return the accumulator.',
        ],
        js: 'function myPow(x, n) {\n  let base = n < 0 ? 1 / x : x;\n  let exponent = Math.abs(n);\n  let result = 1;\n  while (exponent > 0) {\n    if (exponent % 2 === 1) result *= base;\n    base *= base;\n    exponent = Math.floor(exponent / 2);\n  }\n  return result;\n}',
        py: 'def my_pow(x, n):\n    base = 1 / x if n < 0 else x\n    exponent = abs(n)\n    result = 1.0\n    while exponent:\n        if exponent & 1:\n            result *= base\n        base *= base\n        exponent >>= 1\n    return result',
        time: 'O(log N)',
        space: 'O(1)',
      },
      examples: [
        { payload: { x: 2.0, n: 10 }, expect: 1024.0, explanation: 'Ten squarings-and-halvings rather than ten multiplications; the binary form of 10 is 1010, so two of the four steps contribute.' },
        { payload: { x: 2.1, n: 3 }, expect: 9.261000000000001, explanation: 'An odd exponent peels one factor off, leaving an even exponent to halve.' },
        { payload: { x: 2.0, n: -2 }, expect: 0.25, explanation: 'The negative exponent is handled once at the start by replacing the base with 0.5.' },
        { payload: { x: -2.0, n: 3 }, expect: -8.0, explanation: 'A negative base with an odd exponent keeps the sign.' },
      ],
      cases: [
        { payload: { x: 5.0, n: 0 }, label: 'exponent zero, answer 1' },
        { payload: { x: 0.0, n: 0 }, label: 'zero to the zero, taken as 1 here' },
        { payload: { x: 7.5, n: 1 }, label: 'exponent one returns the base' },
        { payload: { x: -3.0, n: 4 }, label: 'negative base, even exponent, so the sign cancels' },
        { payload: { x: 1.0, n: 1000 }, label: 'base one with the largest exponent stays bounded' },
        { payload: { x: -1.0, n: 999 }, label: 'base minus one with a large odd exponent' },
        { payload: { x: -1.0, n: 1000 }, label: 'base minus one with a large even exponent' },
        { payload: { x: 2.0, n: -10 }, label: 'reciprocal of 1024' },
        { payload: { x: 0.5, n: 20 }, label: 'a base below one shrinks fast' },
        { payload: { x: 1.0001, n: 1000 }, label: 'many steps where repeated multiplication drifts further than squaring' },
        { payload: { x: 3.0, n: 13 }, label: 'exponent 1101 in binary, so three of the four steps contribute' },
      ],
      assume: (p) => {
        if (!(p.x > -100 && p.x < 100)) return 'x must lie strictly between -100 and 100';
        if (!(Number.isInteger(p.n) && p.n >= -1000 && p.n <= 1000)) return 'n must be an integer in -1000..1000';
        if (p.n < 0 && p.x === 0) return 'x must be non-zero when n is negative';
        return true;
      },
    },
  ],
};
