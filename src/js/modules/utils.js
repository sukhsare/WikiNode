export async function asyncPool(limit, array, iteratorFn, onProgress) {
  const ret = [] // array to hold all task promises
  const executing = [] // tasks that are currently running

  // loop through each item in the array
  for (const item of array) {
    // run iterator function for this item and call onProgress if provided
    const p = Promise.resolve()
      .then(() => iteratorFn(item))
      .then(result => {
        if (onProgress) onProgress()
        return result
      })
    ret.push(p)

    // if we have a limit manage running tasks
    if (limit <= array.length) {
      // when promise p finishes remove it from executing
      const e = p.then(() => executing.splice(executing.indexOf(e), 1))
      executing.push(e)
      // if executing tasks reached the limit wait for one to finish
      if (executing.length >= limit) {
        await Promise.race(executing)
      }
    }
  }
  // wait for all tasks to finish and return the results
  return Promise.all(ret)
}
