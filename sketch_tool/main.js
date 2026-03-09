const layoutCanvas = document.getElementById('sketchCanvas');
const lCtx = layoutCanvas.getContext('2d');
const inkCanvas = document.getElementById('calligraphyCanvas');
const iCtx = inkCanvas.getContext('2d');

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
const saveToFolderBtn = document.getElementById('saveToFolderBtn');
const charNameInput = document.getElementById('charNameInput');

// Layer Toggles
const layerLayoutBtn = document.getElementById('layerLayoutBtn');
const layerCalligraphyBtn = document.getElementById('layerCalligraphyBtn');

let isDrawing = false;
let currentLayer = 'layout'; // 'layout' or 'calligraphy'
let currentFilename = null;
let lastX = 0;
let lastY = 0;
let history = { layout: [], calligraphy: [] };
let sketchCounter = 1;

function initCanvas(canvas, ctx) {
    canvas.width = 720;
    canvas.height = 1280;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = brushSize.value;
}

initCanvas(layoutCanvas, lCtx);
initCanvas(inkCanvas, iCtx);

function getActiveCtx() {
    return currentLayer === 'layout' ? lCtx : iCtx;
}

function getActiveCanvas() {
    return currentLayer === 'layout' ? layoutCanvas : inkCanvas;
}

function saveHistory() {
    const hist = history[currentLayer];
    if (hist.length > 20) hist.shift();
    hist.push(getActiveCanvas().toDataURL());
}

function startDrawing(e) {
    isDrawing = true;
    saveHistory();
    [lastX, lastY] = getMousePos(e);
}

function draw(e) {
    if (!isDrawing) return;
    const [x, y] = getMousePos(e);
    const ctx = getActiveCtx();
    const canvas = getActiveCanvas();
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.lineWidth = brushSize.value * (720 / canvas.clientWidth);
    ctx.stroke();
    [lastX, lastY] = [x, y];
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

function stopDrawing() { isDrawing = false; }

const calligraphyInput = document.getElementById('calligraphyInput');
const fontSelect = document.getElementById('fontSelect');
const addTextBtn = document.getElementById('addTextBtn');

// Attach listeners to BOTH canvases to ensure capture
[layoutCanvas, inkCanvas].forEach(c => {
    c.addEventListener('mousedown', startDrawing);
    c.addEventListener('mousemove', draw);
    c.addEventListener('mouseup', stopDrawing);
    c.addEventListener('mouseout', stopDrawing);
    c.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e); }, { passive: false });
    c.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, { passive: false });
    c.addEventListener('touchend', stopDrawing);
});

// Layer Switching Logic
function switchLayer(layer) {
    currentLayer = layer;
    const inkOnlyGroups = document.querySelectorAll('.ink-only');
    if (layer === 'layout') {
        layerLayoutBtn.classList.add('active');
        layerCalligraphyBtn.classList.remove('active');
        document.body.classList.remove('calligraphy-mode');
        // Layout uses white/grey/red
        inkOnlyGroups.forEach(g => g.style.display = 'none');
        // Ensure color matches layout
        lCtx.strokeStyle = document.querySelector('.color-option.active:not(.ink-only)')?.dataset.color || '#ffffff';
    } else {
        layerLayoutBtn.classList.remove('active');
        layerCalligraphyBtn.classList.add('active');
        document.body.classList.add('calligraphy-mode');
        // Calligraphy uses black
        inkOnlyGroups.forEach(g => g.style.display = 'flex');
        const blackOpt = document.querySelector('.ink-only.color-option');
        if (blackOpt) {
            colorOptions.forEach(o => o.classList.remove('active'));
            blackOpt.classList.add('active');
            iCtx.strokeStyle = '#000000';
        }
    }
}

addTextBtn.addEventListener('click', () => {
    const text = calligraphyInput.value.trim();
    if (!text) return;
    saveHistory();
    iCtx.clearRect(0, 0, 720, 1280); // Clear current ink for a clean text stamp
    const font = fontSelect.value;
    iCtx.fillStyle = '#000000';
    iCtx.textAlign = 'center';
    iCtx.textBaseline = 'middle';
    iCtx.font = `600px ${font}`;
    iCtx.fillText(text, 360, 640);
});

layerLayoutBtn.addEventListener('click', () => switchLayer('layout'));
layerCalligraphyBtn.addEventListener('click', () => switchLayer('calligraphy'));

clearBtn.addEventListener('click', () => {
    saveHistory();
    const ctx = getActiveCtx();
    ctx.clearRect(0, 0, 720, 1280);
    if (currentLayer === 'layout') referenceLayer.innerHTML = '';
});

undoBtn.addEventListener('click', () => {
    const hist = history[currentLayer];
    if (hist.length > 0) {
        const lastState = hist.pop();
        const img = new Image();
        img.src = lastState;
        img.onload = () => {
            const ctx = getActiveCtx();
            ctx.clearRect(0, 0, 720, 1280);
            ctx.drawImage(img, 0, 0);
        };
    }
});

colorOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        colorOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        getActiveCtx().strokeStyle = opt.dataset.color;
    });
});

async function saveToPNG(autoClear = false) {
    const charName = charNameInput.value.trim() || "sketch";
    const paddedIndex = sketchCounter.toString().padStart(2, '0');
    const filename = currentLayer === 'calligraphy' ?
        `calligraphy_${new Date().getTime()}.png` :
        `${charName}_${paddedIndex}.png`;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 720;
    tempCanvas.height = 1280;
    const tCtx = tempCanvas.getContext('2d');

    if (currentLayer === 'layout') {
        tCtx.fillStyle = '#000000';
        tCtx.fillRect(0, 0, 720, 1280);
        tCtx.drawImage(layoutCanvas, 0, 0);
    } else {
        // Calligraphy save: Transparent bg with black ink (or white bg if needed for assets)
        tCtx.fillStyle = '#ffffff'; // Use white bg for standard ink assets
        tCtx.fillRect(0, 0, 720, 1280);
        tCtx.drawImage(inkCanvas, 0, 0);
    }

    const finalDataURL = tempCanvas.toDataURL('image/png');

    // Auto detection for "Save to Folder" if charName is present
    if (charName !== "sketch") {
        await saveToServer(finalDataURL, filename, charName);
    } else {
        const link = document.createElement('a');
        link.download = filename;
        link.href = finalDataURL;
        link.click();
        updateGallery(finalDataURL, filename);
    }

    sketchCounter++;
    if (autoClear) {
        if (currentLayer === 'layout') {
            referenceLayer.innerHTML = `<img src="${finalDataURL}">`;
        }
        saveHistory();
        getActiveCtx().clearRect(0, 0, 720, 1280);
    }
}

async function saveToServer(dataURL, filename, folder) {
    try {
        const response = await fetch('http://localhost:8000/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: dataURL, filename: filename, folder: folder })
        });
        const result = await response.json();
        if (result.status === 'success') {
            alert(`✅ 已成功存入: characters/${folder}/${filename}`);
            updateGallery(dataURL, filename);
        }
    } catch (err) {
        alert(`❌ 儲存失敗: ${err.message}`);
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
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            saveHistory();
            const ctx = getActiveCtx();
            ctx.clearRect(0, 0, 720, 1280);
            const ratio = Math.min(720 / img.width, 1280 / img.height);
            const w = img.width * ratio;
            const h = img.height * ratio;
            const x = (720 - w) / 2;
            const y = (1280 - h) / 2;
            if (currentLayer === 'layout') {
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, 720, 1280);
            }
            ctx.drawImage(img, x, y, w, h);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

saveToFolderBtn.addEventListener('click', () => saveToPNG(false));
