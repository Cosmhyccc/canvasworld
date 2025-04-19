document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');
    const canvasContainer = document.querySelector('.canvas-container');
    
    // Drawing controls
    const pencilSize = document.getElementById('pencil-size');
    const pencilColor = document.getElementById('pencil-color');
    const clearBtn = document.getElementById('clear-btn');
    const imageUpload = document.getElementById('image-upload');
    const saveBtn = document.getElementById('save-btn');
    const undoBtn = document.getElementById('undo-btn');

    // Undo stack
    const historyStack = [];
    const maxHistory = 50;

    function saveState() {
        // Save current canvas state as image data
        if (historyStack.length >= maxHistory) historyStack.shift();
        historyStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }

    function restoreState() {
        if (historyStack.length > 1) {
            historyStack.pop(); // Remove current state
            const prev = historyStack[historyStack.length - 1];
            ctx.putImageData(prev, 0, 0);
        }
    }
    
    // Canvas state
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
    // Canvas transformation
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isPanning = false;
    let startPanX = 0;
    let startPanY = 0;
    
    // Initialize canvas size to a very large area
    const canvasWidth = 5000;
    const canvasHeight = 5000;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Center the canvas initially
    offsetX = (canvasWidth / 2) - (canvasContainer.clientWidth / 2);
    offsetY = (canvasHeight / 2) - (canvasContainer.clientHeight / 2);
    updateCanvasPosition();
    
    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Function to update canvas position based on offset and scale
    function updateCanvasPosition() {
        canvas.style.transform = `scale(${scale})`;
        canvas.style.left = `${-offsetX}px`;
        canvas.style.top = `${-offsetY}px`;
    }
    
    // Drawing functions
    function startDrawing(e) {
        if (isPanning) return;
        isDrawing = true;
        // Save state before starting a new stroke
        saveState();
        // Calculate position in the transformed canvas
        const rect = canvas.getBoundingClientRect();
        lastX = (e.clientX - rect.left) / scale;
        lastY = (e.clientY - rect.top) / scale;
    }
    
    function draw(e) {
        if (!isDrawing) return;
        // Calculate position in the transformed canvas
        const rect = canvas.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) / scale;
        const currentY = (e.clientY - rect.top) / scale;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = pencilSize.value;
        ctx.strokeStyle = pencilColor.value;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        lastX = currentX;
        lastY = currentY;
    }
    
    function stopDrawing() {
        isDrawing = false;
    }
    
    // Panning functions
    function startPanning(e) {
        isPanning = true;
        startPanX = e.clientX;
        startPanY = e.clientY;
    }
    
    function pan(e) {
        if (!isPanning) return;
        
        const deltaX = e.clientX - startPanX;
        const deltaY = e.clientY - startPanY;
        
        offsetX -= deltaX / scale;
        offsetY -= deltaY / scale;
        
        updateCanvasPosition();
        
        startPanX = e.clientX;
        startPanY = e.clientY;
    }
    
    function stopPanning() {
        isPanning = false;
    }
    
    // Zoom function
    function zoom(e) {
        e.preventDefault();
        
        const rect = canvasContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate point on canvas where zoom is centered
        const canvasX = mouseX + offsetX * scale;
        const canvasY = mouseY + offsetY * scale;
        
        // Adjust scale based on wheel direction
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        scale *= zoomFactor;
        
        // Limit scale to reasonable values
        scale = Math.min(Math.max(0.1, scale), 10);
        
        // Adjust offset to keep the point under mouse steady
        offsetX = (canvasX - mouseX) / scale;
        offsetY = (canvasY - mouseY) / scale;
        
        updateCanvasPosition();
    }
    
    // Upload image function
    function uploadImage(e) {
        const file = e.target.files[0];
        if (!file || !file.type.match('image.*')) return;
        saveState(); // Save state before image upload
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // Calculate maximum dimensions (keep images smaller)
                const maxWidth = 500;
                const maxHeight = 500;
                let width = img.width;
                let height = img.height;
                // Scale down if image is too large
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }
                // Calculate position to center the image
                const posX = (canvas.width / 2) - (width / 2);
                const posY = (canvas.height / 2) - (height / 2);
                // Draw image on canvas
                ctx.drawImage(img, posX, posY, width, height);
                // Center view on the image
                offsetX = posX;
                offsetY = posY;
                updateCanvasPosition();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    // Save drawing function
    function saveDrawing() {
        const link = document.createElement('a');
        link.download = 'infinite-canvas-drawing.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
    
    // Clear canvas function
    function clearCanvas() {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Event listeners for drawing
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);

    // Undo button
    undoBtn.addEventListener('click', restoreState);

    // Save initial state
    saveState();
    
    // Event listeners for panning (when spacebar is held)
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            canvas.style.cursor = 'grab';
            // Only start panning if mouse is down
            canvas.addEventListener('mousedown', startPanning);
            canvas.removeEventListener('mousedown', startDrawing);
        }
    });
    
    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            canvas.style.cursor = 'crosshair';
            canvas.removeEventListener('mousedown', startPanning);
            canvas.addEventListener('mousedown', startDrawing);
            stopPanning();
        }
    });
    
    canvas.addEventListener('mousemove', pan);
    window.addEventListener('mouseup', stopPanning);
    
    // Event listener for zooming
    canvasContainer.addEventListener('wheel', zoom);
    
    // Event listeners for buttons
    clearBtn.addEventListener('click', clearCanvas);
    imageUpload.addEventListener('change', uploadImage);
    saveBtn.addEventListener('click', saveDrawing);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        updateCanvasPosition();
    });
    
    // Prevent context menu on right-click
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Touch support for mobile devices
    let touchStartX, touchStartY;
    
    canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        
        lastX = (touch.clientX - rect.left) / scale;
        lastY = (touch.clientY - rect.top) / scale;
        
        isDrawing = true;
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent scrolling
        
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        
        // Check if it's a drawing gesture or panning gesture
        const touchDeltaX = Math.abs(touch.clientX - touchStartX);
        const touchDeltaY = Math.abs(touch.clientY - touchStartY);
        
        if (touchDeltaX > 10 || touchDeltaY > 10) {
            // If moved significantly, treat as panning
            if (!isPanning) {
                isPanning = true;
                isDrawing = false;
                startPanX = touch.clientX;
                startPanY = touch.clientY;
            } else {
                // Continue panning
                pan({
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
            }
        } else if (isDrawing && !isPanning) {
            // Treat as drawing
            draw({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        }
    });
    
    canvas.addEventListener('touchend', () => {
        isDrawing = false;
        isPanning = false;
    });
    
    // Pinch to zoom
    let initialPinchDistance = 0;
    
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialPinchDistance = getPinchDistance(e.touches);
        }
    });
    
    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            const currentPinchDistance = getPinchDistance(e.touches);
            const pinchRatio = currentPinchDistance / initialPinchDistance;
            
            if (pinchRatio > 1.1 || pinchRatio < 0.9) {
                // Calculate center of pinch
                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                
                // Simulate zoom with wheel event
                zoom({
                    preventDefault: () => {},
                    clientX: centerX,
                    clientY: centerY,
                    deltaY: pinchRatio < 1 ? 1 : -1 // Zoom in if ratio > 1, out if < 1
                });
                
                initialPinchDistance = currentPinchDistance;
            }
        }
    });
    
    function getPinchDistance(touches) {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    }
});
