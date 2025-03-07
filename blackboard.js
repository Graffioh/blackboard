document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("blackboard");
  const ctx = canvas.getContext("2d");
  let isDrawing = false;
  let currentColor = "white";

  // Set initial canvas state
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = currentColor;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  // Drawing handlers
  function startDrawing(e) {
    isDrawing = true;
    draw(e); // Draw a point when just clicking
  }

  function stopDrawing() {
    isDrawing = false;
    ctx.beginPath(); // Reset the path
  }

  function draw(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  // Set up event listeners for drawing
  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseout", stopDrawing);

  // Clear button
  document.getElementById("clear").addEventListener("click", function () {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = currentColor;
    ctx.beginPath();
  });

  // Color picker functionality
  const colorElements = document.querySelectorAll(".color");
  colorElements.forEach((colorElement) => {
    colorElement.addEventListener("click", function () {
      // Remove active class from all colors
      colorElements.forEach((el) => el.classList.remove("active"));

      // Add active class to selected color
      this.classList.add("active");

      // Set current drawing color
      currentColor = this.dataset.color;
      ctx.strokeStyle = currentColor;
    });
  });
});
