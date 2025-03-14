export async function asyncPool(limit, array, iteratorFn, onProgress) {
  // this will hold all our promise results
  const results = []
  // these are the tasks that are running right now
  const running = []

  // loop through every item in the array
  for (const item of array) {
    // run the function for this item; call onProgress if it's given
    const p = Promise.resolve()
      .then(() => iteratorFn(item))
      .then(result => {
        if (onProgress) onProgress()
        return result
      })
    results.push(p)

    // if the limit is reached, manage the concurrent tasks
    if (limit <= array.length) {
      // when p is done, remove it from the running list
      const e = p.then(() => running.splice(running.indexOf(e), 1))
      running.push(e)
      // if we have too many running, wait for one to finish
      if (running.length >= limit) {
        await Promise.race(running)
      }
    }
  }
  // wait for everything to finish and then return all results
  return Promise.all(results)
}