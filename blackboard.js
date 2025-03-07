document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("blackboard");
  const ctx = canvas.getContext("2d");
  const cursorOverlay = document.getElementById("cursor-overlay");

  let isDrawing = false;
  let currentColor = "white";
  let drawingActions = []; // Store all drawing actions instead of just the image data
  let currentTool = "pen"; // "pen" or "eraser"

  // Fixed default tool sizes
  const DEFAULT_PEN_SIZE = 4;
  const DEFAULT_ERASER_SIZE = 12;

  // Current sizes - start with defaults
  let penSize = DEFAULT_PEN_SIZE;
  let eraserSize = DEFAULT_ERASER_SIZE;
  let lineSize = penSize; // Default starts with pen size

  let lastX, lastY;

  // Get UI elements
  const penButton = document.getElementById("pen");
  const eraserButton = document.getElementById("eraser");
  const sizeSlider = document.getElementById("size-slider");
  const sizeValue = document.getElementById("size-value");
  const resetSizeButton = document.getElementById("reset-size");

  // Drawing action types
  const ACTION_TYPES = {
    DRAW_LINE: "drawLine",
    DRAW_DOT: "drawDot",
    CLEAR: "clear",
  };

  // Function to resize the canvas
  function resizeCanvas() {
    // Get container dimensions
    const container = document.querySelector(".canvas-container");
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Save current canvas dimensions
    const prevWidth = canvas.width;
    const prevHeight = canvas.height;

    // Set new canvas dimensions
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Reset drawing state
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Restore drawing by replaying all actions
    redrawCanvas();

    // Set drawing properties
    updateDrawingSettings();
  }

  // Redraw the entire canvas by replaying all stored actions
  function redrawCanvas() {
    // Clear canvas
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Replay all drawing actions
    drawingActions.forEach((action) => {
      switch (action.type) {
        case ACTION_TYPES.DRAW_LINE:
          drawLineFromAction(action);
          break;
        case ACTION_TYPES.DRAW_DOT:
          drawDotFromAction(action);
          break;
        case ACTION_TYPES.CLEAR:
          // Clear was already done at the beginning of this function
          break;
      }
    });
  }

  function drawLineFromAction(action) {
    ctx.globalCompositeOperation = action.isEraser
      ? "destination-out"
      : "source-over";
    ctx.strokeStyle = action.isEraser ? "#222" : action.color;
    ctx.lineWidth = action.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(
      (action.startX * canvas.width) / action.canvasWidth,
      (action.startY * canvas.height) / action.canvasHeight,
    );
    ctx.lineTo(
      (action.endX * canvas.width) / action.canvasWidth,
      (action.endY * canvas.height) / action.canvasHeight,
    );
    ctx.stroke();
  }

  function drawDotFromAction(action) {
    ctx.globalCompositeOperation = action.isEraser
      ? "destination-out"
      : "source-over";
    ctx.fillStyle = action.isEraser ? "#222" : action.color;

    ctx.beginPath();
    ctx.arc(
      (action.x * canvas.width) / action.canvasWidth,
      (action.y * canvas.height) / action.canvasHeight,
      action.radius *
        Math.min(
          canvas.width / action.canvasWidth,
          canvas.height / action.canvasHeight,
        ),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Custom cursor instead of CSS cursor
  function updateCursor(e) {
    if (currentTool === "eraser") {
      cursorOverlay.style.display = "block";
      cursorOverlay.style.width = lineSize + "px";
      cursorOverlay.style.height = lineSize + "px";
      cursorOverlay.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
      cursorOverlay.style.left = e.clientX - lineSize / 2 + "px";
      cursorOverlay.style.top = e.clientY - lineSize / 2 + "px";
      canvas.style.cursor = "none";
    } else {
      cursorOverlay.style.display = "none";
      canvas.style.cursor = "crosshair";
    }
  }

  // Update the drawing settings based on current tool
  function updateDrawingSettings() {
    if (currentTool === "pen") {
      lineSize = penSize;
      ctx.strokeStyle = currentColor;
      ctx.globalCompositeOperation = "source-over";
    } else if (currentTool === "eraser") {
      lineSize = eraserSize;
      ctx.strokeStyle = "#222"; // Same as background
      ctx.globalCompositeOperation = "destination-out";
    }

    // Update UI
    sizeSlider.value = lineSize;
    sizeValue.textContent = lineSize;

    ctx.lineWidth = lineSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  // Function to switch tools
  function setTool(tool) {
    currentTool = tool;

    // Update button states
    penButton.classList.toggle("active", tool === "pen");
    eraserButton.classList.toggle("active", tool === "eraser");

    // Update drawing settings
    updateDrawingSettings();

    // Initial cursor update
    if (tool === "eraser" && lastMouseX && lastMouseY) {
      updateCursor({ clientX: lastMouseX, clientY: lastMouseY });
    } else {
      cursorOverlay.style.display = "none";
      canvas.style.cursor = "crosshair";
    }
  }

  // Function to reset to default sizes
  function resetToDefaultSizes() {
    penSize = DEFAULT_PEN_SIZE;
    eraserSize = DEFAULT_ERASER_SIZE;
    updateDrawingSettings();

    // Update cursor if needed
    if (currentTool === "eraser" && lastMouseX && lastMouseY) {
      updateCursor({ clientX: lastMouseX, clientY: lastMouseY });
    }
  }

  // Initialize canvas size
  resizeCanvas();
  setTool("pen");

  // Track mouse position
  let lastMouseX, lastMouseY;
  canvas.addEventListener("mousemove", function (e) {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    updateCursor(e);
  });

  // Set up resize observer
  const resizeObserver = new ResizeObserver(() => {
    resizeCanvas();
  });
  resizeObserver.observe(document.querySelector(".canvas-container"));

  // Drawing handlers
  function startDrawing(e) {
    isDrawing = true;

    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;

    // For single click dots
    ctx.beginPath();
    ctx.arc(lastX, lastY, lineSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Record the dot action
    drawingActions.push({
      type: ACTION_TYPES.DRAW_DOT,
      x: lastX,
      y: lastY,
      radius: lineSize / 2,
      color: currentColor,
      isEraser: currentTool === "eraser",
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    });
  }

  function stopDrawing() {
    isDrawing = false;
  }

  function draw(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    // Record the line action
    drawingActions.push({
      type: ACTION_TYPES.DRAW_LINE,
      startX: lastX,
      startY: lastY,
      endX: currentX,
      endY: currentY,
      lineWidth: lineSize,
      color: currentColor,
      isEraser: currentTool === "eraser",
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    });

    lastX = currentX;
    lastY = currentY;
  }

  // Set up event listeners for drawing
  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseout", stopDrawing);

  // Tool buttons listeners
  penButton.addEventListener("click", () => setTool("pen"));
  eraserButton.addEventListener("click", () => setTool("eraser"));

  // Size slider listener
  sizeSlider.addEventListener("input", function () {
    const newSize = parseInt(this.value);

    // Store the size for the current tool
    if (currentTool === "pen") {
      penSize = newSize;
    } else {
      eraserSize = newSize;
    }

    lineSize = newSize;
    sizeValue.textContent = newSize;

    // Update drawing settings
    ctx.lineWidth = lineSize;

    // Update cursor if using eraser
    if (currentTool === "eraser" && lastMouseX && lastMouseY) {
      updateCursor({ clientX: lastMouseX, clientY: lastMouseY });
    }
  });

  // Reset size button listener
  resetSizeButton.addEventListener("click", resetToDefaultSizes);

  // Clear button
  document.getElementById("clear").addEventListener("click", function () {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    updateDrawingSettings();

    // Clear the drawing actions and add a clear action
    drawingActions = [
      {
        type: ACTION_TYPES.CLEAR,
      },
    ];
  });

  // Handle ESC key to close the window
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.close();
    }
  });

  // Handle window resize
  window.addEventListener("resize", resizeCanvas);

  // Ensure cursor overlay follows mouse even when not over canvas
  document.addEventListener("mousemove", function (e) {
    if (currentTool === "eraser") {
      updateCursor(e);
    }
  });

  // Hide cursor overlay when leaving window
  document.addEventListener("mouseout", function () {
    cursorOverlay.style.display = "none";
  });
});
