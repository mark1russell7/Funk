# Roadmap

This file is the plan of Funk. The Status page of the site reads it.

| ID | Item | Status | Summary |
| --- | --- | --- | --- |
| F1 | The site with a live demo | in progress | The site runs the real source in the browser: a railway of Either and Optional steps, arrays against sets, and a sponge that you feed. |
| F2 | A license file | waiting | The repository has no license file. The owner chooses the license. |
| F3 | A cache with a lazy value | not started | The function `aside` gets its value before it examines the store. The specification proposes `cacheBy`, which calls a function only on a miss. |
| F4 | Collections that keep an array | not started | The functions `map` and `filter` always give a Set. The specification proposes `toArray`, `mapToArray` and `filterToArray`. |
| F5 | The function `memoize` | later | The file `memo.ts` holds only comments. It has no export. |
| F6 | The removal of NaN from an array | not started | The function `has` finds NaN in an array, and the function `delete` does not remove it, because `delete` uses `indexOf`. |
