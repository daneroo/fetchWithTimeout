async function main() {
  const serverDelayInSecs = "1.0";
  const timeout = 500;
  const gracePeriod = 200;
  const url = `https://httpbin.org/delay/${serverDelayInSecs}`;

  const { verbosity, iterations } = universalParseArgs();

  const nameAndFunc = {
    usingRegularFetch,
    usingAbortController,
    usingPromiseRace,
  };

  if (verbosity > 0) {
    console.log(`Running fetch with ${iterations} iterations`);

    if (verbosity > 1) {
      console.log(` for each of the following methods:`);
      for (const name of Object.keys(nameAndFunc)) {
        console.log(`  - ${name}`);
      }
      console.log(
        `  The requests we are making are known to take at least ${serverDelayInSecs}s to complete`
      );
      console.log(
        `  We expect the fetch to throw an exception if it takes longer than ${timeout}ms`
      );
    }
    console.log("");
  }
  for (const [name, func] of Object.entries(nameAndFunc)) {
    console.log(`- ${name} x ${iterations} times`);
    for (let i = 0; i < iterations; i++) {
      if (verbosity > 2) {
        console.log(`  - ${name} iteration ${i + 1}`);
      }
      const invocation = async () => func(url, {}, timeout);
      const { elapsed, success, message } = await timeIt(name, invocation);
      if (verbosity > 2) {
        if (success) {
          console.log(`    fetch completed successfully in ${elapsed}ms`);
        } else {
          console.log(`    fetch threw an exception after ${elapsed}ms`);
          console.log(`      message: ${message}`);
          console.log(
            `    This was expected because the request took (>${serverDelayInSecs})s which is longer than our specified fetch timeout (${timeout}ms)`
          );
        }
      }
      if (elapsed > timeout + gracePeriod) {
        if (name === "usingRegularFetch") {
          if (verbosity > 1) {
            console.log(
              `    Took too long: ${elapsed}ms > timeout:${timeout}ms + gracePeriod:${gracePeriod}ms`
            );
            console.log(
              `    This was expected because regular fetch does not support timeout`
            );
          }
        } else {
          console.log(
            `    Took too long: ${elapsed}ms > timeout:${timeout}ms + gracePeriod:${gracePeriod}ms`
          );
          if (verbosity > 1) {
            console.log(
              `    The fetch should have thrown the exception in about timeout:${timeout}ms (plus gracePeriod:${gracePeriod}ms)`
            );
          }
        }
      }
    }
  }
}
await main();

/**
 * Measures the elapsed time of an asynchronous operation and determines its success.
 * @param {string} name - The name of the operation.
 * @param {function} operation - The asynchronous operation to be timed.
 * @returns {Promise<{ elapsed: number, success: boolean }>} - A promise that resolves to an object containing the elapsed time and success status.
 */
export async function timeIt(name, operation) {
  const start = Date.now();
  let success = true;
  let message = "";
  try {
    await operation();
  } catch (e) {
    success = false;
    const elapsed = Date.now() - start;
    if (e instanceof Error) {
      message = e.message;
    }
  } finally {
    const elapsed = Date.now() - start;
    return { elapsed, success, message };
  }
}

async function usingRegularFetch(url, options, timeout) {
  return await fetch(url, options);
}
/**
 * Fetches a resource with a timeout.
 * @param {string} url - The URL of the resource.
 * @param {RequestInit} options - The options for the fetch request.
 * @param {number} timeout - The timeout value in milliseconds.
 * @returns {Promise<Response>} - A promise that resolves to the fetch response.
 */
async function usingPromiseRace(url, options, timeout) {
  const timeoutPromise = new Promise((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(
        new Error(
          `Fetch(${url}) timed out in ${timeout}ms: : The operation was aborted`
        )
      );
    }, timeout);
  });

  const fetchPromise = fetch(url, options);
  return Promise.race([fetchPromise, timeoutPromise]);
}

/**
 * Fetches a resource with a timeout.
 * @param {string} url - The URL of the resource.
 * @param {RequestInit} options - The options for the fetch request.
 * @param {number} timeout - The timeout value in milliseconds.
 * @returns {Promise<Response>} - A promise that resolves to the fetch response.
 */
async function usingAbortController(url, options, timeout) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Fetch(${url}) timed out in ${timeout}ms: ${error.message}`
      );
    }
    throw error; // Re-throw if it's not an Error instance.
  }
}

/**
 * Parses command line arguments for iterations and verbosity level.
 * @returns {{verbosity: number, iterations: number}} Parsed command line arguments.
 */
function universalParseArgs() {
  const defaultIterations = 10;
  let args = [];
  let iterations = defaultIterations; // default value

  if (typeof process !== "undefined") {
    args = process.argv.slice(2);
  } else if (typeof Deno !== "undefined") {
    args = Deno.args;
  }

  const verbosityMatch = args.join(" ").match(/-v+/g) || [];
  let verbosity = verbosityMatch.reduce(
    (acc, match) => acc + match.length - 1,
    0
  );

  args.forEach((arg, index) => {
    if (arg === "-n" || arg === "--iterations") {
      const nextVal = parseInt(args[index + 1], 10);
      if (!isNaN(nextVal)) iterations = nextVal;
    } else if (arg === "-h" || arg === "--help") {
      console.log(`Usage:
      -n, --iterations  Number of fetch calls per method [default: ${defaultIterations}]
      -v, -vv, -vvv     Verbosity level (more 'v's for more verbose output)
      -h, --help        Show help information
    
    Examples:
      command -n 20 -vvv     Run 20 iterations with high verbosity
      command --help         Show usage information`);
      if (typeof Deno !== "undefined") {
        Deno.exit(0);
      } else {
        process.exit(0);
      }
    }
  });

  return { verbosity, iterations };
}
