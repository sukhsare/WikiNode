// simple undo/redo manager
const undoStack = []
const redoStack = []

export function recordCommand(cmd) {
  undoStack.push(cmd)
  // whenever a new action happens, clear the redo stack
  redoStack.length = 0
}

export function undoAction() {
  if (!undoStack.length) return
  const cmd = undoStack.pop()
  cmd.undo()
  redoStack.push(cmd)
}

export function redoAction() {
  if (!redoStack.length) return
  const cmd = redoStack.pop()
  cmd.do()
  undoStack.push(cmd)
}

export function canUndo() {
  return undoStack.length > 0
}

export function canRedo() {
  return redoStack.length > 0
}