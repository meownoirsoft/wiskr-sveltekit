// Utility for handling modal backdrop clicks that don't interfere with text selection
// Only closes modal on proper clicks (mousedown + mouseup), not just mouseup events

export function createModalClickHandler(closeFunction) {
  let mouseDownTarget = null;
  
  function handleMouseDown(event) {
    // Store the target of mousedown
    mouseDownTarget = event.target;
  }
  
  function handleClick(event) {
    // Only close if:
    // 1. The mousedown and mouseup happened on the same element (backdrop)
    // 2. The click target is the backdrop itself (not a child element)
    if (mouseDownTarget === event.target && event.target === event.currentTarget) {
      closeFunction();
    }
    // Reset for next interaction
    mouseDownTarget = null;
  }
  
  return {
    handleMouseDown,
    handleClick
  };
}
