// this function runs tasks in parallel, but only allows a limited number at once

export async function asyncPool(limit, array, iteratorFn, onProgress) {
    const ret = []      // all our task promises
    const executing = [] // tasks that are currently running
  
    for (const item of array) {
      // run the task for this item
      const p = Promise.resolve().then(() => iteratorFn(item)).then(result => {
        if (onProgress) onProgress()
        return result
      })
      ret.push(p)
  
      // if we have a limit, manage our running tasks
      if (limit <= array.length) {
        // when p finishes, remove it from executing
        const e = p.then(() => executing.splice(executing.indexOf(e), 1))
        executing.push(e)
        // if we have too many running tasks, wait for one to finish
        if (executing.length >= limit) {
          await Promise.race(executing)
        }
      }
    }
    // wait for all tasks to finish and return their results
    return Promise.all(ret)
  }
  