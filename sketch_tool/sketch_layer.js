// ==========================================
// 手繪圖層 (Hand-drawn Layer) 邏輯
// ==========================================

let isDrawing = false;
let lastX = 0, lastY = 0;
let history = { sketch: [] };

function getActiveCtx() { return lCtx; }
function getActiveCanvas() { return layoutCanvas; }

function saveHistory() {
    const hist = history[currentLayer] || [];
    if (hist.length > 20) hist.shift();
    hist.push(getActiveCanvas().toDataURL());
    history[currentLayer] = hist;
}

function getMousePos(e) {
    const canvas = getActiveCanvas();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
    const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
    return [(clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY];
}

function startDrawing(e) {
    // [SECURITY] 只有在手繪圖層按鈕啟用的情況下才能進行繪圖
    if (typeof toggleSketchBtn !== 'undefined' && toggleSketchBtn && !toggleSketchBtn.classList.contains('active')) return;
    
    if (typeof isDraggingText !== 'undefined' && isDraggingText || typeof isResizingText !== 'undefined' && isResizingText) return;
    isDrawing = true;
    saveHistory();
    [lastX, lastY] = getMousePos(e);
}

function draw(e) {
    if (!isDrawing || (typeof isDraggingText !== 'undefined' && isDraggingText) || (typeof isResizingText !== 'undefined' && isResizingText)) return;
    const [x, y] = getMousePos(e);
    const ctx = getActiveCtx();
    const canvas = getActiveCanvas();
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    // 使用當前筆刷大小，並依縮放比例調整
    const brushVal = (typeof brushSize !== 'undefined') ? brushSize.value : 3;
    ctx.lineWidth = brushVal * (canvas.width / canvas.clientWidth);
    ctx.stroke();
    [lastX, lastY] = [x, y];
}

function stopDrawing() { isDrawing = false; }

function undo() {
    const hist = history[currentLayer] || [];
    if (hist.length > 0) {
        const lastState = hist.pop();
        const img = new Image();
        img.src = lastState;
        img.onload = () => {
            const ctx = getActiveCtx();
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }
}

// 監聽筆刷顏色選擇
if (typeof colorOptions !== 'undefined' && colorOptions) {
    colorOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            colorOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            const color = opt.dataset.color || '#ffffff';
            lCtx.strokeStyle = color;
            console.log(`🎨 筆刷顏色切換至: ${color}`);
        });
    });
}

// 註冊畫布事件 (假設 layoutCanvas 與其餘 DOM 已由 main.js 初始化)
if (typeof layoutCanvas !== 'undefined' && layoutCanvas) {
    layoutCanvas.addEventListener('mousedown', startDrawing);
    layoutCanvas.addEventListener('mousemove', draw);
    layoutCanvas.addEventListener('mouseup', stopDrawing);
    layoutCanvas.addEventListener('mouseout', stopDrawing);
    layoutCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e); }, { passive: false });
    layoutCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, { passive: false });
    layoutCanvas.addEventListener('touchend', stopDrawing);
}
