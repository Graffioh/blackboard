// background.js
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: injectBlackboardComplete,
  });
});

function injectBlackboardComplete() {
  // If blackboard already exists, toggle its visibility
  const existing = document.getElementById("embedded-blackboard");
  if (existing) {
    existing.style.display =
      existing.style.display === "none" ? "block" : "none";
    return;
  }

  // Create blackboard container
  const blackboardContainer = document.createElement("div");
  blackboardContainer.id = "embedded-blackboard";

  // Add blackboard HTML content
  blackboardContainer.innerHTML = `
    <div class="embedded-blackboard-header">
      <span>Blackboard</span>
      <button id="close-blackboard">×</button>
    </div>
    <div class="canvas-container">
      <canvas id="blackboard"></canvas>
    </div>
    <div id="cursor-overlay"></div>
    <div class="controls">
      <div class="tool-controls">
        <button id="pen" class="active">Pen</button>
        <button id="eraser">Eraser</button>
        <button id="clear">Clear</button>
      </div>
      <div class="size-control">
        <span class="size-label">Size: <span id="size-value">4</span>px</span>
        <input type="range" id="size-slider" min="1" max="30" value="4">
        <button class="reset-size" id="reset-size">Reset</button>
      </div>
    </div>
    <div class="resize-handle"></div>
  `;

  // Add styles
  const styles = document.createElement("style");
  styles.textContent = `
    #embedded-blackboard {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 400px;
      height: 300px;
      z-index: 9999;
      background-color: #333;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      font-family: Arial, sans-serif;
      color: white;
      overflow: hidden;
      resize: both; /* Enable native resize, but we'll use our custom handle too */
    }

    .embedded-blackboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 10px;
      background-color: #444;
      cursor: move;
    }

    #close-blackboard {
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0 5px;
    }

    #embedded-blackboard .canvas-container {
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    #embedded-blackboard canvas {
      background-color: #222;
      cursor: crosshair;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    #embedded-blackboard .controls {
      padding: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    #embedded-blackboard .tool-controls {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    #embedded-blackboard button {
      padding: 5px 10px;
      background-color: #444;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    #embedded-blackboard button:hover {
      background-color: #555;
    }

    #embedded-blackboard button.active {
      background-color: #666;
      box-shadow: 0 0 0 2px #888;
    }

    #embedded-blackboard .size-control {
      display: flex;
      align-items: center;
      gap: 5px;
      min-width: 160px;
    }

    #embedded-blackboard .size-label {
      font-size: 12px;
      width: 60px;
    }

    #embedded-blackboard input[type="range"] {
      width: 100px;
      accent-color: #666;
    }

    #embedded-blackboard #cursor-overlay {
      position: fixed;
      pointer-events: none;
      z-index: 10000;
      display: none;
      border-radius: 50%;
      border: 1px solid white;
      box-sizing: border-box;
    }

    #embedded-blackboard .reset-size {
      padding: 3px 6px;
      font-size: 11px;
      margin-left: 5px;
    }

    #embedded-blackboard .resize-handle {
      position: absolute;
      width: 16px;
      height: 16px;
      bottom: 0;
      right: 0;
      cursor: nwse-resize;
      background: linear-gradient(135deg, transparent 50%, rgba(255, 255, 255, 0.5) 50%);
      z-index: 10001;
      border-bottom-right-radius: 8px;
    }
  `;

  document.head.appendChild(styles);
  document.body.appendChild(blackboardContainer);

  // Define the makeDraggable function inside the injected function
  function makeDraggable(element) {
    let pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0;
    const header = element.querySelector(".embedded-blackboard-header");

    header.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = element.offsetTop - pos2 + "px";
      element.style.left = element.offsetLeft - pos1 + "px";
      element.style.right = "auto"; // Clear right position when dragging
      element.style.bottom = "auto"; // Clear bottom position when dragging
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  // Add resize functionality
  function makeResizable(element) {
    const resizeHandle = element.querySelector(".resize-handle");
    let originalWidth, originalHeight, originalX, originalY;

    resizeHandle.addEventListener("mousedown", function (e) {
      e.preventDefault();
      originalWidth = element.offsetWidth;
      originalHeight = element.offsetHeight;
      originalX = e.clientX;
      originalY = e.clientY;

      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResize);
    });

    function resize(e) {
      const width = originalWidth + (e.clientX - originalX);
      const height = originalHeight + (e.clientY - originalY);

      // Set minimum dimensions
      if (width > 200) element.style.width = width + "px";
      if (height > 200) element.style.height = height + "px";

      // Make sure canvas updates after resize
      const canvas = element.querySelector("#blackboard");
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        const resizeEvent = new Event("resize");
        window.dispatchEvent(resizeEvent);
      }
    }

    function stopResize() {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResize);

      // Manually trigger resizeCanvas to redraw content at new size
      resizeCanvas();
    }
  }

  // Make blackboard draggable and resizable
  makeDraggable(blackboardContainer);
  makeResizable(blackboardContainer);

  // Initialize blackboard functionality
  const canvas = document.getElementById("blackboard");
  const ctx = canvas.getContext("2d");
  const cursorOverlay = document.getElementById("cursor-overlay");

  let isDrawing = false;
  let currentColor = "white";
  let drawingActions = [];
  let currentTool = "pen";

  const DEFAULT_PEN_SIZE = 4;
  const DEFAULT_ERASER_SIZE = 12;

  let penSize = DEFAULT_PEN_SIZE;
  let eraserSize = DEFAULT_ERASER_SIZE;
  let lineSize = penSize;

  let lastX, lastY;

  const penButton = document.getElementById("pen");
  const eraserButton = document.getElementById("eraser");
  const sizeSlider = document.getElementById("size-slider");
  const sizeValue = document.getElementById("size-value");
  const resetSizeButton = document.getElementById("reset-size");

  const ACTION_TYPES = {
    DRAW_LINE: "drawLine",
    DRAW_DOT: "drawDot",
    CLEAR: "clear",
  };

  function resizeCanvas() {
    const container = canvas.closest(".canvas-container");
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const prevWidth = canvas.width;
    const prevHeight = canvas.height;

    canvas.width = containerWidth;
    canvas.height = containerHeight;

    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    redrawCanvas();
    updateDrawingSettings();
  }

  function redrawCanvas() {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawingActions.forEach((action) => {
      switch (action.type) {
        case ACTION_TYPES.DRAW_LINE:
          drawLineFromAction(action);
          break;
        case ACTION_TYPES.DRAW_DOT:
          drawDotFromAction(action);
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

  function updateDrawingSettings() {
    if (currentTool === "pen") {
      lineSize = penSize;
      ctx.strokeStyle = currentColor;
      ctx.globalCompositeOperation = "source-over";
    } else if (currentTool === "eraser") {
      lineSize = eraserSize;
      ctx.strokeStyle = "#222";
      ctx.globalCompositeOperation = "destination-out";
    }

    sizeSlider.value = lineSize;
    sizeValue.textContent = lineSize;

    ctx.lineWidth = lineSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  function setTool(tool) {
    currentTool = tool;

    penButton.classList.toggle("active", tool === "pen");
    eraserButton.classList.toggle("active", tool === "eraser");

    updateDrawingSettings();

    if (tool === "eraser" && lastMouseX && lastMouseY) {
      updateCursor({ clientX: lastMouseX, clientY: lastMouseY });
    } else {
      cursorOverlay.style.display = "none";
      canvas.style.cursor = "crosshair";
    }
  }

  function resetToDefaultSizes() {
    penSize = DEFAULT_PEN_SIZE;
    eraserSize = DEFAULT_ERASER_SIZE;
    updateDrawingSettings();

    if (currentTool === "eraser" && lastMouseX && lastMouseY) {
      updateCursor({ clientX: lastMouseX, clientY: lastMouseY });
    }
  }

  resizeCanvas();
  setTool("pen");

  let lastMouseX, lastMouseY;
  canvas.addEventListener("mousemove", function (e) {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    updateCursor(e);
  });

  const resizeObserver = new ResizeObserver(() => {
    resizeCanvas();
  });
  resizeObserver.observe(canvas.closest(".canvas-container"));

  function startDrawing(e) {
    isDrawing = true;

    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;

    ctx.beginPath();
    ctx.arc(lastX, lastY, lineSize / 2, 0, Math.PI * 2);
    ctx.fill();

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

  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseout", stopDrawing);

  penButton.addEventListener("click", () => setTool("pen"));
  eraserButton.addEventListener("click", () => setTool("eraser"));

  sizeSlider.addEventListener("input", function () {
    const newSize = parseInt(this.value);

    if (currentTool === "pen") {
      penSize = newSize;
    } else {
      eraserSize = newSize;
    }

    lineSize = newSize;
    sizeValue.textContent = newSize;
    ctx.lineWidth = lineSize;

    if (currentTool === "eraser" && lastMouseX && lastMouseY) {
      updateCursor({ clientX: lastMouseX, clientY: lastMouseY });
    }
  });

  resetSizeButton.addEventListener("click", resetToDefaultSizes);

  document.getElementById("clear").addEventListener("click", function () {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    updateDrawingSettings();
    drawingActions = [{ type: ACTION_TYPES.CLEAR }];
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const blackboard = document.getElementById("embedded-blackboard");
      if (blackboard) blackboard.style.display = "none";
    }
  });

  document.addEventListener("mousemove", function (e) {
    if (currentTool === "eraser") {
      updateCursor(e);
    }
  });

  document.addEventListener("mouseout", function () {
    cursorOverlay.style.display = "none";
  });

  // Close button functionality
  document.getElementById("close-blackboard").addEventListener("click", () => {
    blackboardContainer.style.display = "none";
  });
}
