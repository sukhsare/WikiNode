// src/js/modules/undoManager.js

const undoStack = [];
const redoStack = [];

export function recordCommand(command) {
  undoStack.push(command);
  redoStack.length = 0; // Clear redo stack on new action
}

export function undoAction() {
  if (undoStack.length === 0) return;
  const command = undoStack.pop();
  command.undo();
  redoStack.push(command);
}

export function redoAction() {
  if (redoStack.length === 0) return;
  const command = redoStack.pop();
  command.do();
  undoStack.push(command);
}

export function canUndo() {
  return undoStack.length > 0;
}

export function canRedo() {
  return redoStack.length > 0;
}
