# Fetch with timeout

This is an isolated experiment to test the behavior of the `fetch` function with a timeout.

It was meant to reproduce a bug in [bun's](https://bun.sh/) `fetch` implementation, when using an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).

- Compare behavior with node,deno, and bun
- Compare behavior of `fetch`
  - without timeout
  - with a timeout based on Promise.race
  - with a timeout based on AbortController

## Demonstration

We see here that the `fetch` with `AbortController` is not working as expected in `bun`.
It is however working as expected in `node` and `deno`.

```bash
 ./runAll.sh -n 10 -v
---------------------------------
Running with node...
---------------------------------
Running fetch with 10 iterations

- usingRegularFetch x 10 times
- usingAbortController x 10 times
- usingPromiseRace x 10 times
---------------------------------
Running with bun...
---------------------------------
Running fetch with 10 iterations

- usingRegularFetch x 10 times
- usingAbortController x 10 times
    Took too long: 1170ms > timeout:500ms + gracePeriod:200ms
    Took too long: 1530ms > timeout:500ms + gracePeriod:200ms
    Took too long: 1375ms > timeout:500ms + gracePeriod:200ms
    Took too long: 1574ms > timeout:500ms + gracePeriod:200ms
    Took too long: 1349ms > timeout:500ms + gracePeriod:200ms
    Took too long: 1082ms > timeout:500ms + gracePeriod:200ms
    Took too long: 1369ms > timeout:500ms + gracePeriod:200ms
    Took too long: 1086ms > timeout:500ms + gracePeriod:200ms
    Took too long: 1086ms > timeout:500ms + gracePeriod:200ms
    Took too long: 1354ms > timeout:500ms + gracePeriod:200ms
- usingPromiseRace x 10 times
---------------------------------
Running with deno...
---------------------------------
Running fetch with 10 iterations

- usingRegularFetch x 10 times
- usingAbortController x 10 times
- usingPromiseRace x 10 times
```

## AbortController and `fetch`

This is the basic idea:

```javascript
async function usingAbortController(url, timeout) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });
    clearTimeout(id); // clear the timer if we are successful before the timeout
    return response;
  } catch (error) {
    // we expect to get an exception here if the request takes longer than `timeout`
    throw error;
  }
}
```

## Usage

```txt
Usage:
      -n, --iterations  Number of fetch calls per method [default: 10]
      -v, -vv, -vvv     Verbosity level (more 'v's for more verbose output)
      -h, --help        Show help information

    Examples:
      command -n 20 -vvv     Run 20 iterations with high verbosity
      command --help         Show usage information
```

```bash
 ./runAll.sh
 ./runAll.sh -h

# or
bun main.mjs                  # -h for help
deno run --allow-net main.mjs # -h for help
node main.mjs                 # -h for help
```

## Test Endpoint

The purpose of this endpoint is that we know the response will be delayed, this permitting us to exercise out _Timeout_ functionality.

We are using <https://httpbin.org/delay/${serverDelayInSecs}>
which causes a delay of `serverDelayInSecs` seconds before responding.

We can see the response time histogram using the [`hey`](https://github.com/rakyll/hey) tool, from my current location

```bash
$ hey https://httpbin.org/delay/1.0

Summary:
  Total:   6.1025 secs
  Slowest: 2.4395 secs
  Fastest: 1.0189 secs
  Average: 1.1650 secs
  Requests/sec: 32.7735

  Total data: 69600 bytes
  Size/request: 348 bytes

Response time histogram:
  1.019 [1]   |
  1.161 [133] |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
  1.303 [30]  |■■■■■■■■■
  1.445 [13]  |■■■■
  1.587 [17]  |■■■■■
  1.729 [1]   |
  1.871 [2]   |■
  2.013 [1]   |
  2.155 [0]   |
  2.297 [1]   |
  2.439 [1]   |


Latency distribution:
  10% in 1.0204 secs
  25% in 1.0220 secs
  50% in 1.0921 secs
  75% in 1.2448 secs
  90% in 1.5065 secs
  95% in 1.5534 secs
  99% in 2.1715 secs
```
