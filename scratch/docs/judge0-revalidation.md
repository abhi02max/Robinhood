# Assumptions that must be revalidated against Judge0

Phase 2 builds and verifies the Java, C and C# pipelines against **Paiza**, because
waiting for a Judge0 VM would stall three phases behind an infrastructure task. The
harness layer is provider-independent by design — `runExecution` generates a program
from a signature and hands it to whichever provider `EXECUTION_PROVIDER` selects — so
none of that work has to be redone.

What is *not* provider-independent is recorded here. Every line is a thing that was
observed on Paiza and assumed on Judge0. When Judge0 comes up, this file is the test
plan; `node server/scripts/check-judge0.js` covers the first section automatically.

## 1. Language ids

`server/languages/registry.js` holds a Judge0 id per language. Only the first three
have ever been used, and none against a live host.

| Language | Judge0 id | Expected to report | Ever run on Judge0 |
| --- | --- | --- | --- |
| javascript | 63 | `JavaScript (Node.js 12.14.0)` | no |
| python | 71 | `Python (3.8.1)` | no |
| cpp | 54 | `C++ (GCC 9.2.0)` | no |
| java | 62 | `Java (OpenJDK 13.0.1)` | no |
| c | 50 | `C (GCC 9.2.0)` | no |
| csharp | 51 | `C# (Mono 6.6.0.161)` | no |

Two of these were wrong or missing before the registry: `c` was mapped to **54**, the
C++ id, so C was compiled as C++; and the two Judge0 tables in the codebase disagreed
— `execution-engine.js` had C# but no Java, `execution/judge0.js` had Java but no C#.

`check-judge0.js` verifies each id resolves to a language whose reported name matches
the expected pattern. **An id that resolves to a different language is the dangerous
failure**: it compiles the wrong thing and reports a syntax error in valid code.

## 2. Runtime versions — Judge0 CE is OLDER than Paiza

This is the largest revalidation risk. Judge0 CE 1.13.x ships materially older
compilers than Paiza, so code that compiles on Paiza can fail on Judge0.

| Language | Paiza (observed) | Judge0 CE 1.13.x (documented) | Consequence |
| --- | --- | --- | --- |
| JavaScript | Node 16.17.1 | Node 12.14.0 | `?.`, `??` and `String.matchAll` are syntax errors on Judge0 |
| Python | 3.11.13 | 3.8.1 | no walrus-adjacent issues expected, but `match` statements would fail |
| C++ | Clang 18, C++20 | GCC 9.2.0, C++17 | C++20 constructs in a harness or a user solution would fail |
| Java | OpenJDK 18 | OpenJDK 13 | records, sealed types, and `var` in lambda params would fail |
| C | Clang 14, C17 | GCC 9.2.0 | mostly compatible; check `<stdbool.h>` and designated initialisers |
| C# | Mono | Mono 6.6.0.161 | LINQ and modern C# syntax need checking |

**The generated harnesses must target the older dialect, not the newer one.** Any
harness written against Paiza's compiler and never checked against Judge0's is an
assumption. Where a harness uses a modern feature it should be noted here.

## 3. Behavioural differences already measured on Paiza

These are Paiza properties the code currently accommodates. Judge0 behaves differently
and the accommodations must be revisited, not just retested.

- **CPU limit is fixed at 1.00 s on Paiza and cannot be raised.** `EXECUTION_TIMEOUT_MS`
  is ignored. On Judge0 `cpu_time_limit` is ours to set, so a correct-but-slow solution
  that Paiza reports as Time Limit Exceeded may pass on Judge0 — and the reverse for
  problems tuned against a 1 s ceiling.
- **No batch endpoint on Paiza.** Every test case is its own create-then-poll, ~2
  requests, and C++ recompiles per case: measured 60 requests and ~14 s for a 12-case
  C++ problem. Judge0 has `/submissions/batch`, which the transport already implements
  and unit-tests against a fake. The batch path has never run against a real host.
- **Memory units differ.** Paiza reports memory in **bytes** (a Python hello-world is
  ~8,368,000); Judge0 reports **kilobytes**. Anything that displays or thresholds
  memory must be checked.
- **Compile-error shape differs.** Paiza signals a compile failure with
  `build_result: "failure"` and `build_stderr`; Judge0 uses `status.id === 6` and
  `compile_output`. Both are mapped, only Paiza's is verified.
- **Paiza ignores `longpoll=true`** and returns `status: "running"` immediately.

## 4. Per-language harness assumptions

Filled in as each language lands in Phase 2.

### Java (Phase 2B)

- Paiza compiles a single file containing a `public class Main`; Judge0 also expects
  the entry class to be `Main` for id 62. Assumed identical, unverified.
- Whether the compiler tolerates the user's `class Solution` in the same file without
  a `public` modifier — verified on Paiza, assumed on Judge0.

### C (Phase 2C)

- Assumes `<stdbool.h>` is available and that GCC 9 accepts the same array-decay
  conventions as Clang 14.

### C# (Phase 2D)

- Mono version parity between the two providers is assumed; C# is the language where
  Paiza's and Judge0's runtimes are most likely to be genuinely equivalent.

## 5. How to close this out

1. Bring up Judge0 (see `self-hosting-judge0.md` — needs a Linux VM with cgroup v1).
2. `node server/scripts/check-judge0.js` — auth, every registry id, one real batch.
3. `EXECUTION_PROVIDER=judge0 node server/scripts/check-all-starters.js` — every
   problem/language pair, the same gate Paiza passed.
4. `EXECUTION_PROVIDER=judge0 node server/scripts/check-authored-problems.js --all`.
5. Re-run the browser E2E suite against a backend configured for Judge0.
6. Update section 1's "Ever run on Judge0" column and delete whatever this file no
   longer needs to warn about.
