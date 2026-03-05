const canvas = document.getElementById('sketchCanvas');
const ctx = canvas.getContext('2d');
const brushSize = document.getElementById('brushSize');
const colorOptions = document.querySelectorAll('.color-option');
const clearBtn = document.getElementById('clearBtn');
const undoBtn = document.getElementById('undoBtn');
const saveBtn = document.getElementById('saveBtn');
const saveAndClearBtn = document.getElementById('saveAndClearBtn');
const galleryItems = document.getElementById('galleryItems');
const referenceLayer = document.getElementById('referenceLayer');
const imageLoader = document.getElementById('imageLoader');
const loadBtn = document.getElementById('loadBtn');
const saveBackBtn = document.getElementById('saveBackBtn');

let isDrawing = false;
let currentFilename = null;
let lastX = 0;
let lastY = 0;
let history = [];
let sketchCounter = 1;

// 初始化畫布大小
function resizeCanvas() {
    const size = Math.min(window.innerHeight * 0.6, window.innerWidth * 0.8);
    canvas.width = 1024;
    canvas.height = 1024;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

resizeCanvas();

ctx.lineJoin = 'round';
ctx.lineCap = 'round';
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = brushSize.value;

function saveHistory() {
    if (history.length > 20) history.shift();
    history.push(canvas.toDataURL());
}

function startDrawing(e) {
    isDrawing = true;
    saveHistory();
    [lastX, lastY] = getMousePos(e);
}

function draw(e) {
    if (!isDrawing) return;
    const [x, y] = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.lineWidth = brushSize.value * (1024 / parseInt(canvas.style.width));
    ctx.stroke();
    [lastX, lastY] = [x, y];
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return [(clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY];
}

function stopDrawing() { isDrawing = false; }

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); });
canvas.addEventListener('touchend', stopDrawing);

clearBtn.addEventListener('click', () => {
    saveHistory();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    referenceLayer.innerHTML = '';
});

undoBtn.addEventListener('click', () => {
    if (history.length > 0) {
        const lastState = history.pop();
        const img = new Image();
        img.src = lastState;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }
});

colorOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        colorOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        ctx.strokeStyle = opt.dataset.color;
    });
});

function saveToPNG(autoClear = false) {
    const folderName = "sketch";
    const paddedIndex = sketchCounter.toString().padStart(2, '0');
    const filename = `${folderName}_${paddedIndex}.png`;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1024;
    tempCanvas.height = 1024;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.fillStyle = '#000000';
    tCtx.fillRect(0, 0, 1024, 1024);
    tCtx.drawImage(canvas, 0, 0);
    const finalDataURL = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = finalDataURL;
    link.click();
    updateGallery(finalDataURL, filename);
    sketchCounter++;
    if (autoClear) {
        referenceLayer.innerHTML = `<img src="${finalDataURL}">`;
        saveHistory();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function updateGallery(dataURL, filename) {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.innerHTML = `
        <img src="${dataURL}" alt="${filename}">
        <span>${new Date().toLocaleTimeString()}</span>
    `;
    item.onclick = () => {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataURL;
        link.click();
    };
    galleryItems.prepend(item);
}

saveBtn.addEventListener('click', () => saveToPNG(false));
saveAndClearBtn.addEventListener('click', () => saveToPNG(true));

loadBtn.addEventListener('click', () => imageLoader.click());

imageLoader.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    currentFilename = file.name;
    saveBackBtn.style.display = 'inline-block';
    saveBackBtn.textContent = `直接存回 (${file.name})`;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            saveHistory();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
            const w = img.width * ratio;
            const h = img.height * ratio;
            const x = (canvas.width - w) / 2;
            const y = (canvas.height - h) / 2;
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, x, y, w, h);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

saveBackBtn.addEventListener('click', async () => {
    if (!currentFilename) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1024;
    tempCanvas.height = 1024;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.fillStyle = '#000000';
    tCtx.fillRect(0, 0, 1024, 1024);
    tCtx.drawImage(canvas, 0, 0);
    const finalDataURL = tempCanvas.toDataURL('image/png');
    try {
        const response = await fetch('http://localhost:8000/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: finalDataURL, filename: currentFilename })
        });
        const result = await response.json();
        if (result.status === 'success') {
            alert(`✅ 已成功回存至: ${currentFilename}`);
        } else {
            alert(`❌ 儲存失敗: ${result.message}`);
        }
    } catch (err) {
        alert(`❌ 伺服器錯誤: ${err.message}`);
    }
});
