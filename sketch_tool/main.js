const bgCanvas = document.getElementById('bgCanvas');
const bgCtx = bgCanvas.getContext('2d');
const layoutCanvas = document.getElementById('sketchCanvas');
const lCtx = layoutCanvas.getContext('2d');
const inkCanvas = document.getElementById('calligraphyCanvas');
const iCtx = inkCanvas.getContext('2d');
const regionCanvas = document.getElementById('regionCanvas');
const rCtx = regionCanvas.getContext('2d');

const brushSize = document.getElementById('brushSize');
const colorOptions = document.querySelectorAll('.color-option');
const clearBtn = document.getElementById('clearBtn');
const undoBtn = document.getElementById('undoBtn');
const saveBtn = document.getElementById('saveBtn');
const saveAndClearBtn = document.getElementById('saveAndClearBtn');
const galleryItems = document.getElementById('galleryItems');
const saveInkBtn = document.getElementById('saveInkBtn');
const referenceLayer = document.getElementById('referenceLayer');
const imageLoader = document.getElementById('imageLoader');
const loadBtn = document.getElementById('loadBtn');
const loadWorkspaceBtn = document.getElementById('loadWorkspaceBtn');
const saveBackBtn = document.getElementById('saveBackBtn');
const saveToFolderBtn = document.getElementById('saveToFolderBtn');
const saveWorkspaceBtn = document.getElementById('saveWorkspaceBtn');
const charNameInput = document.getElementById('charNameInput');
const toastContainer = document.getElementById('toastContainer');
const workspaceModal = document.getElementById('workspaceModal');
const workspaceList = document.getElementById('workspaceList');
const closeModalBtn = document.getElementById('closeModalBtn');
const toggleRegionsBtn = document.getElementById('toggleRegionsBtn');
const toggleSketchBtn = document.getElementById('toggleSketchBtn');
const toggleCalligraphyBtn = document.getElementById('toggleCalligraphyBtn');
const toggleBgBtn = document.getElementById('toggleBgBtn');

// [FIXED] 最終預設：顯示底圖 (bgCanvas) 並淡化，隱藏書法層 (inkCanvas)
layoutCanvas.style.display = 'none';
inkCanvas.style.display = 'none';
bgCanvas.style.display = 'block';
bgCanvas.style.opacity = '0.15';

const container = document.getElementById('textOverlayContainer');
if (container) {
    container.classList.add('hide-all-calligraphy');
    container.classList.add('show-regions');
    container.classList.add('hide-component-text');
}

let showRegions = true; 
if (toggleSketchBtn) toggleSketchBtn.classList.remove('active');
if (toggleCalligraphyBtn) toggleCalligraphyBtn.classList.remove('active'); 
if (toggleBgBtn) toggleBgBtn.classList.add('active'); 
if (toggleRegionsBtn) toggleRegionsBtn.classList.add('active');

const rotateXInput = document.getElementById('rotateX');
const rotateYInput = document.getElementById('rotateY');
const rotateZInput = document.getElementById('rotateZ');
const rotateControls = document.querySelector('.rotate-controls');

if (rotateControls) rotateControls.style.display = 'none';

const fontWeightSelect = document.getElementById('fontWeightSelect');

let currentBgFilename = null; // 追蹤目前載入的底圖檔名

// Layer Toggles
const layerLayoutBtn = document.getElementById('layerLayoutBtn');
const layerCalligraphyBtn = document.getElementById('layerCalligraphyBtn');

let isDrawing = false;
let isDraggingText = false;
let isResizingText = false;
let activeTextObj = null; // 統一在此宣告
let currentLayer = 'layout'; // 'layout' or 'calligraphy'
let currentFilename = null;
let lastX = 0;
let lastY = 0;
let history = { layout: [], calligraphy: [] };
let sketchCounter = 1;

function initCanvas(canvas, ctx) {
    canvas.width = 768;
    canvas.height = 1344;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = brushSize.value;
}

bgCanvas.width = 768;
bgCanvas.height = 1344;
regionCanvas.width = 768;
regionCanvas.height = 1344;
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
    if (currentLayer === 'calligraphy' || isDraggingText || isResizingText) return;
    isDrawing = true;
    saveHistory();
    [lastX, lastY] = getMousePos(e);
}

function draw(e) {
    if (!isDrawing || isDraggingText || isResizingText) return;
    const [x, y] = getMousePos(e);
    const ctx = getActiveCtx();
    const canvas = getActiveCanvas();
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.lineWidth = brushSize.value * (768 / canvas.clientWidth);
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
    const calliTextGroup = document.querySelector('.calli-text-group');
    if (layer === 'layout') {
        layerLayoutBtn.classList.add('active');
        layerCalligraphyBtn.classList.remove('active');
        document.body.classList.remove('calligraphy-mode');
        if (calliTextGroup) calliTextGroup.style.display = 'none';

        const activeColor = document.querySelector('.color-option.active')?.dataset.color || '#ffffff';
        lCtx.strokeStyle = activeColor;
    } else {
        layerLayoutBtn.classList.remove('active');
        layerCalligraphyBtn.classList.add('active');
        document.body.classList.add('calligraphy-mode');
        if (calliTextGroup) calliTextGroup.style.display = 'flex';
        // 不在這裡直接顯示 rotateControls，由 setupTextElement 處理

        const activeColor = document.querySelector('.color-option.active')?.dataset.color || '#ffffff';
        iCtx.strokeStyle = activeColor;
    }
}

// 文字拖拉輔助變數
let textDragStartX = 0, textDragStartY = 0;
let textStartLeft = 0, textStartTop = 0, textStartSize = 0;

// 使用全域變數處理文字狀態
function setupTextElement(textEl) {
    const handle = textEl.querySelector('.resize-handle');
    const delBtn = textEl.querySelector('.delete-btn');

    delBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        textEl.remove();
        if (activeTextObj === textEl) activeTextObj = null;
    });

    textEl.addEventListener('mousedown', (e) => {
        if (e.target === handle || e.target === delBtn) return;
        isDraggingText = true;
        activeTextObj = textEl;
        document.querySelectorAll('.text-element').forEach(el => el.classList.remove('active'));
        textEl.classList.add('active');
        textDragStartX = e.clientX;
        textDragStartY = e.clientY;
        textStartLeft = parseFloat(textEl.style.left) || 0;
        textStartTop = parseFloat(textEl.style.top) || 0;

        // 同步旋轉與屬性
        rotateXInput.value = textEl.dataset.rotateX || 0;
        rotateYInput.value = textEl.dataset.rotateY || 0;
        rotateZInput.value = textEl.dataset.rotateZ || 0;
        document.getElementById('valX').textContent = rotateXInput.value;
        document.getElementById('valY').textContent = rotateYInput.value;
        document.getElementById('valZ').textContent = rotateZInput.value;
        document.getElementById('isPhonetic').checked = textEl.dataset.isPhonetic === 'true';

        // 強制彈出旋轉與細部控制項
        if (rotateControls) rotateControls.style.display = 'flex';
        const calliTextGroup = document.querySelector('.calli-text-group');
        if (calliTextGroup) calliTextGroup.style.display = 'flex';

        // 同步字重
        if (fontWeightSelect) {
            fontWeightSelect.value = textEl.dataset.fontWeight || "400";
        }

        e.preventDefault();
        e.stopPropagation();
    });

    handle.addEventListener('mousedown', (e) => {
        isResizingText = true;
        activeTextObj = textEl;
        document.querySelectorAll('.text-element').forEach(el => el.classList.remove('active'));
        textEl.classList.add('active');
        textDragStartX = e.clientX;
        textStartSize = parseFloat(textEl.style.fontSize) || 100;

        e.preventDefault();
        e.stopPropagation();
    });
}

function updateTextTransform(el) {
    if (!el) return;
    const rx = el.dataset.rotateX || 0;
    const ry = el.dataset.rotateY || 0;
    const rz = el.dataset.rotateZ || 0;
    el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;

    // [NEW] 畫布模式下，若正在顯示結構，則同步重繪
    if (typeof showRegions !== 'undefined' && showRegions) {
        renderRegions();
    }
}

// 綁定旋轉滑桿與聲符勾選事件
[rotateXInput, rotateYInput, rotateZInput].forEach(input => {
    input.addEventListener('input', () => {
        if (activeTextObj) {
            const axis = input.id.replace('rotate', '').toUpperCase(); // X, Y, or Z
            activeTextObj.dataset[`rotate${axis}`] = input.value;
            // 更新數值顯示
            const valDisplay = document.getElementById(`val${axis}`);
            if (valDisplay) valDisplay.textContent = input.value;
            updateTextTransform(activeTextObj);
        }
    });
});

document.getElementById('resetRotationsBtn').addEventListener('click', () => {
    document.querySelectorAll('.text-element').forEach(el => {
        el.dataset.rotateX = 0;
        el.dataset.rotateY = 0;
        el.dataset.rotateZ = 0;
        updateTextTransform(el);
    });
    // 同步 UI 狀態
    if (activeTextObj) {
        rotateXInput.value = 0;
        rotateYInput.value = 0;
        rotateZInput.value = 0;
        document.getElementById('valX').textContent = '0';
        document.getElementById('valY').textContent = '0';
        document.getElementById('valZ').textContent = '0';
    }
    showToast('🤖 已將所有部件重設為平面視角 (1:1)', 'success');
});

document.getElementById('isPhonetic').addEventListener('change', (e) => {
    if (activeTextObj) {
        activeTextObj.dataset.isPhonetic = e.target.checked;
    }
});

if (fontWeightSelect) {
    fontWeightSelect.addEventListener('change', (e) => {
        if (activeTextObj) {
            const weight = e.target.value;
            activeTextObj.dataset.fontWeight = weight;
            activeTextObj.style.fontWeight = weight;
        }
    });
}

addTextBtn.addEventListener('click', async () => {
    const textStr = calligraphyInput.value.trim() || charNameInput.value.trim();
    if (!textStr) {
        showToast("請輸入欲置入的字", 'info');
        return;
    }

    const fontValue = fontSelect.value;
    const fontWeight = fontWeightSelect ? fontWeightSelect.value : "400";
    
    // 擷取主要字型家族 (排除 fallback 如 cursive) 以供 load() 使用
    const mainFontFamily = fontValue.split(',')[0].trim();
    const fontString = `${fontWeight} 600px ${mainFontFamily}`;

    try {
        console.log(`🔍 嘗試載入字型: ${fontString}`);
        await document.fonts.load(fontString);
    } catch (e) {
        console.warn(`⚠️ 字型載入逾時或錯誤 (${mainFontFamily})，使用降級顯示:`, e);
    }

    const activeColor = document.querySelector('.color-option.active')?.dataset.color || '#ffffff';
    const container = document.getElementById('textOverlayContainer');

    const textEl = document.createElement('div');
    textEl.className = 'text-element';
    textEl.style.color = activeColor;
    textEl.style.fontFamily = fontValue;
    textEl.style.fontWeight = fontWeight;

    // 初始化 3D 旋轉與屬性
    textEl.dataset.rotateX = 0;
    textEl.dataset.rotateY = 0;
    textEl.dataset.rotateZ = 0;
    textEl.dataset.fontWeight = fontWeight;
    textEl.dataset.isPhonetic = document.getElementById('isPhonetic').checked;

    const initialDomSize = container.clientWidth * 0.9;
    textEl.style.fontSize = `${initialDomSize}px`;
    textEl.style.left = (container.clientWidth / 2 - initialDomSize / 2) + 'px';
    textEl.style.top = (container.clientHeight / 2 - initialDomSize / 2) + 'px';

    const span = document.createElement('span');
    span.textContent = textStr;
    textEl.appendChild(span);

    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    textEl.appendChild(handle);

    const delBtn = document.createElement('div');
    delBtn.className = 'delete-btn';
    delBtn.innerHTML = '×';
    textEl.appendChild(delBtn);

    setupTextElement(textEl);
    
    // [NEW] 標記全字底稿
    if (textStr === charNameInput.value.trim() && textStr.length === 1) {
        textEl.classList.add('full-char');
    }

    container.appendChild(textEl);

    document.querySelectorAll('.text-element').forEach(el => el.classList.remove('active'));
    textEl.classList.add('active');
    activeTextObj = textEl;

    // 重置滑桿與數值顯示
    rotateXInput.value = 0;
    rotateYInput.value = 0;
    rotateZInput.value = 0;
    document.getElementById('valX').textContent = 0;
    document.getElementById('valY').textContent = 0;
    document.getElementById('valZ').textContent = 0;
    document.getElementById('isPhonetic').checked = false;

    // 顯示控制項
    if (rotateControls) rotateControls.style.display = 'flex';
});

// 工作區設定收集功能
function getWorkspaceConfig() {
    const charName = charNameInput.value.trim();
    // 找 reference
    let reference = null;
    document.querySelectorAll('.text-element.full-char').forEach(el => {
        reference = {
            fontSize: parseFloat(el.style.fontSize),
            left: parseFloat(el.style.left),
            top: parseFloat(el.style.top),
            color: el.style.color
        };
    });

    const elements = [];
    document.querySelectorAll('.text-element:not(.full-char)').forEach(el => {
        const configElement = {
            text: el.querySelector('span').textContent,
            fontSize: parseFloat(el.style.fontSize),
            left: parseFloat(el.style.left),
            top: parseFloat(el.style.top),
            width: parseFloat(el.style.width) || 0,
            height: parseFloat(el.style.height) || 0
        };

        // 僅當不為預設值時才存儲
        const rx = el.dataset.rotateX || 0;
        const ry = el.dataset.rotateY || 0;
        const rz = el.dataset.rotateZ || 0;
        if (rx != 0) configElement.rotateX = rx;
        if (ry != 0) configElement.rotateY = ry;
        if (rz != 0) configElement.rotateZ = rz;

        const weight = el.dataset.fontWeight || "400";
        if (weight != "400") configElement.fontWeight = weight;

        const color = el.style.color;
        if (color && color !== 'rgb(255, 255, 255)' && color !== '#ffffff') configElement.color = color;

        // fontFamily 預設為 MasaFont，若不同則存儲
        const font = el.style.fontFamily;
        if (font && !font.includes('MasaFont')) configElement.fontFamily = font;

        if (el.dataset.isPhonetic === 'true') configElement.isPhonetic = true;
        if (el.dataset.image) configElement.image = el.dataset.image;

        elements.push(configElement);
    });

    // 計算聲符範圍
    const phonoInfo = renderInkOnlyWithBounds(true);

    return {
        charName,
        bgFilename: currentBgFilename,
        reference,
        elements,
        phonoRange: phonoInfo.bounds
    };
}


window.addEventListener('mousemove', (e) => {
    if (isDraggingText && activeTextObj) {
        const dx = e.clientX - textDragStartX;
        const dy = e.clientY - textDragStartY;
        activeTextObj.style.left = (textStartLeft + dx) + 'px';
        activeTextObj.style.top = (textStartTop + dy) + 'px';
    } else if (isResizingText && activeTextObj) {
        const dx = e.clientX - textDragStartX;
        let newSize = textStartSize + dx;
        if (newSize < 12) newSize = 12;
        activeTextObj.style.fontSize = `${newSize}px`;
    }
});

window.addEventListener('mouseup', () => {
    isDraggingText = false;
    isResizingText = false;
});

// 若點擊畫布區且非文字本體，則取消文字選擇框
document.querySelector('.canvas-wrapper').addEventListener('mousedown', (e) => {
    if (!e.target.closest('.text-element')) {
        document.querySelectorAll('.text-element').forEach(el => el.classList.remove('active'));
        activeTextObj = null;
        if (rotateControls) rotateControls.style.display = 'none';
    }
});

if (layerLayoutBtn) layerLayoutBtn.addEventListener('click', () => switchLayer('layout'));
if (layerCalligraphyBtn) layerCalligraphyBtn.addEventListener('click', () => switchLayer('calligraphy'));

if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        saveHistory();
        const ctx = getActiveCtx();
        ctx.clearRect(0, 0, 768, 1344);
        if (currentLayer === 'layout') {
            referenceLayer.innerHTML = '';
            bgCtx.clearRect(0, 0, 768, 1344);
            currentBgFilename = null; 
        }
        if (currentLayer === 'calligraphy') {
            document.getElementById('textOverlayContainer').innerHTML = '';
        }
    });
}

if (undoBtn) {
    undoBtn.addEventListener('click', () => {
        const hist = history[currentLayer];
        if (hist.length > 0) {
            const lastState = hist.pop();
            const img = new Image();
            img.src = lastState;
            img.onload = () => {
                const ctx = getActiveCtx();
                ctx.clearRect(0, 0, 768, 1344);
                ctx.drawImage(img, 0, 0);
            };
        }
    });
}

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
    const filename = `${charName}_${paddedIndex}.png`;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 768;
    tempCanvas.height = 1344;
    const tCtx = tempCanvas.getContext('2d');

    // 統一合併底圖、佈局、與書法三層
    tCtx.fillStyle = '#000000';
    tCtx.fillRect(0, 0, 768, 1344);
    tCtx.drawImage(bgCanvas, 0, 0);
    tCtx.drawImage(layoutCanvas, 0, 0);
    tCtx.drawImage(inkCanvas, 0, 0);

    const inkDataURL = renderInkOnlyToDataURL();
    const phonoInfo = renderInkOnlyWithBounds(true);
    const inkPhonoDataURL = phonoInfo.dataURL;

    // 獲取目前繪圖層的數據
    const brushDataURL = inkCanvas.toDataURL('image/png');
    const config = getWorkspaceConfig();
    // 確保 config 中的 phonoRange 是最新的
    config.phonoRange = phonoInfo.bounds;

    // 繪製 DOM 互動文字層至合併畫布
    document.querySelectorAll('.text-element').forEach(el => {
        drawSingleTextToCtx(tCtx, el);
    });

    const finalDataURL = tempCanvas.toDataURL('image/png');

    // Auto detection for "Save to Folder" if charName is present
    if (charName !== "sketch") {
        await saveToServer(finalDataURL, filename, charName, config, inkDataURL, brushDataURL, inkPhonoDataURL);
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
        getActiveCtx().clearRect(0, 0, 768, 1344);
    }
}

function renderInkOnlyToDataURL(phonoOnly = false) {
    return renderInkOnlyWithBounds(phonoOnly).dataURL;
}

/**
 * 渲染書法層並計算邊界
 */
function renderInkOnlyWithBounds(phonoOnly = false) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 768;
    tempCanvas.height = 1344;
    const tCtx = tempCanvas.getContext('2d');
    let hasContent = false;
    document.querySelectorAll('.text-element').forEach(el => {
        if (phonoOnly && el.dataset.isPhonetic !== 'true') return;
        drawSingleTextToCtx(tCtx, el);
        hasContent = true;
    });

    const dataURL = tempCanvas.toDataURL('image/png');
    let bounds = null;

    if (hasContent) {
        bounds = getImageBoundingBox(tCtx, 768, 1344);
    }

    return { dataURL, bounds };
}

/**
 * 核心繪圖函數：處理 3D 旋轉模擬並繪製至 Canvas
 */
function drawSingleTextToCtx(ctx, el, forcedW = null, forcedH = null) {
    const left = parseFloat(el.style.left) || 0;
    const top = parseFloat(el.style.top) || 0;
    const width = forcedW !== null ? forcedW : (el.offsetWidth || 0);
    const height = forcedH !== null ? forcedH : (el.offsetHeight || 0);

    // 取得 DOM 元件中心 (768x1344 空間)
    const domCenterX = left + width / 2;
    const domCenterY = top + height / 2;
    const fontSize = parseFloat(el.style.fontSize) || 100;
    const fontWeight = el.dataset.fontWeight || "400";
    const textStr = el.querySelector('span').textContent;

    const rx = parseFloat(el.dataset.rotateX || 0);
    const ry = parseFloat(el.dataset.rotateY || 0);
    const rz = parseFloat(el.dataset.rotateZ || 0);

    ctx.save();
    // 移動到文字中心
    ctx.translate(domCenterX, domCenterY);

    // 近似 3D 旋轉效果
    const scaleY = Math.cos(rx * Math.PI / 180);
    const scaleX = Math.cos(ry * Math.PI / 180);

    ctx.scale(scaleX, scaleY);
    ctx.rotate(rz * Math.PI / 180);

    ctx.fillStyle = el.style.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${fontWeight} ${fontSize}px ${el.style.fontFamily}`;

    if (img && img.complete) {
        console.log(`🎨 Drawing image: ${img.src} at (${domCenterX}, ${domCenterY})`);
        
        // [NEW] 如果是圖片元件，使用色彩增值模式以符合預期
        const isImage = el.classList.contains('image-element');
        if (isImage) {
            ctx.globalCompositeOperation = 'multiply';
        }

        ctx.drawImage(img, -width / 2, -height / 2, width, height);
        ctx.globalCompositeOperation = 'source-over'; // 還原
    } else {
        if (img) console.warn(`⚠️ Image not ready: ${img.src}`);
        ctx.fillText(textStr, 0, 0);
    }
    ctx.restore();
}

/**
 * 掃描 Canvas 內容獲取最小外接矩形 (Alpha Channel 偵測)
 */
function getImageBoundingBox(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let found = false;

    // 每 1 個像素掃描 (RGBA)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha > 10) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
                found = true;
            }
        }
    }

    if (!found) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// [NEW] 私有離屏畫布用於精準邊界偵測
const offscreenCanvas = document.createElement('canvas');
offscreenCanvas.width = 768;
offscreenCanvas.height = 1344;
const oCtx = offscreenCanvas.getContext('2d');

async function saveToServer(dataURL, filename, folder, config = null, inkImage = null, brushImage = null, inkPhonoImage = null) {
    try {
        const response = await fetch('/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: dataURL,
                filename: filename,
                folder: folder,
                config: config,
                inkImage: inkImage,
                brushImage: brushImage,
                inkPhonoImage: inkPhonoImage
            })
        });
        const result = await response.json();
        if (result.status === 'success') {
            showToast(`✅ 已成功存入: characters/${folder}/${filename}`, 'success');
            updateGallery(dataURL, filename);
        }
    } catch (err) {
        showToast(`❌ 儲存失敗: ${err.message}`, 'error');
    }
}

function updateGallery(dataURL, filename) {
    if (galleryItems) {
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
}

saveBtn.addEventListener('click', () => saveToPNG(false));
saveAndClearBtn.addEventListener('click', () => saveToPNG(true));
saveInkBtn.addEventListener('click', () => saveCalligraphyOnly());

loadWorkspaceBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/list', { method: 'POST' });
        const result = await response.json();
        if (result.status === 'success') {
            workspaceList.innerHTML = '';
            result.folders.forEach(folder => {
                const item = document.createElement('div');
                item.className = 'workspace-item';
                item.textContent = folder;
                item.onclick = () => {
                    loadWorkspace(folder);
                    workspaceModal.style.display = 'none';
                };
                workspaceList.appendChild(item);
            });
            workspaceModal.style.display = 'flex';
        }
    } catch (err) {
        showToast("無法取得工作區列表: " + err.message, 'error');
    }
});

closeModalBtn.addEventListener('click', () => {
    workspaceModal.style.display = 'none';
});

// 點擊外部關閉
workspaceModal.addEventListener('click', (e) => {
    if (e.target === workspaceModal) workspaceModal.style.display = 'none';
});

async function loadWorkspace(folder) {
    try {
        const response = await fetch('/load', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: folder })
        });
        const result = await response.json();
        if (result.status === 'success') {
            // 不論有無 config，都優先設定當前字名，確保 addTextBtn 可運作
            charNameInput.value = folder;

            if (result.config) {
                const config = result.config;
                // 清除現有文字元件與 Canvas
                const container = document.getElementById('textOverlayContainer');
                container.innerHTML = '';
                lCtx.clearRect(0, 0, 768, 1344);
                iCtx.clearRect(0, 0, 768, 1344);
                bgCtx.clearRect(0, 0, 768, 1344);

                // [NEW] 優先使用 config.reference，否則自動生成預設底稿
                const charName = config.charName || folder;
                if (config.reference) {
                    createFloatingText({
                        text: charName,
                        ...config.reference
                    });
                } else if (charName && charName.length === 1) {
                    const defaultFont = fontSelect.value;
                    createFloatingText({
                        text: charName,
                        fontFamily: defaultFont,
                        color: "rgba(255, 255, 255, 0.4)",
                        fontSize: "600px",
                        fontWeight: "400",
                        left: "0",
                        top: "0",
                        isPhonetic: false
                    });
                }

                // 還原文字元件
                if (config.elements && config.elements.length > 0) {
                    config.elements.forEach(data => {
                        createFloatingText(data);
                    });
                    
                    // [NEW] 根據目前的按鈕狀態決定是否隱藏書法參考
                    if (!toggleCalligraphyBtn.classList.contains('active')) {
                        container.classList.add('hide-all-calligraphy');
                    } else {
                        container.classList.remove('hide-all-calligraphy');
                    }

                    // [NEW] 如果有結構資訊，自動顯示區域範圍
                    showRegions = true;
                    if (toggleRegionsBtn) toggleRegionsBtn.classList.add('active');
                    container.classList.add('hide-component-text');
                    
                    // 延遲一點點確保 DOM 元件渲染後再準確計算座標
                    setTimeout(renderRegions, 300);
                }

                // [NEW] 自動從同目錄載入手寫筆跡與底圖
                // 通過 8000 埠號存取 (已透過 Symlink 指向 characters)
                const rootUrl = `/characters/${folder}`;

                // 1. 還原底圖
                if (config.bgFilename) {
                    currentBgFilename = config.bgFilename;
                    const bgImg = new Image();
                    bgImg.crossOrigin = "anonymous";
                    bgImg.onload = () => {
                        const ratio = Math.min(768 / bgImg.width, 1344 / bgImg.height);
                        const w = bgImg.width * ratio;
                        const h = bgImg.height * ratio;
                        // [FORCE 1:1] 強制鎖定在 (0, 0) 原點，消除置中導致的位移，確保與 JSON 數據完全對齊
                        bgCtx.drawImage(bgImg, 0, 0, w, h);
                    };
                    bgImg.src = `${rootUrl}/${config.bgFilename}`;
                }

                // 2. 還原筆跡 (brush.png)
                const brushImg = new Image();
                brushImg.crossOrigin = "anonymous";
                brushImg.onload = () => {
                    iCtx.drawImage(brushImg, 0, 0);
                };
                brushImg.src = `${rootUrl}/brush.png?v=${new Date().getTime()}`; // 避免快取

                showToast(`✅ 已還原工作區: ${folder}`, 'success');
            } else {
                // 全新工作區，僅重設畫布
                const container = document.getElementById('textOverlayContainer');
                container.innerHTML = '';
                lCtx.clearRect(0, 0, 768, 1344);
                iCtx.clearRect(0, 0, 768, 1344);
                bgCtx.clearRect(0, 0, 768, 1344);
                currentBgFilename = null; // Clear background filename for new workspace
                showToast(`✨ 開啟全新工作區: ${folder}`, 'success');
            }
        } else {
            showToast(`ℹ️ 工作區 ${folder} 載入失敗`, 'info');
        }
    } catch (err) {
        showToast(`❌ 載入工作區出錯: ${err.message}`, 'error');
    }
}

function createFloatingText(data) {
    const container = document.getElementById('textOverlayContainer');
    const textEl = document.createElement('div');
    textEl.className = 'text-element';
    const defaultFont = "'MasaFont', cursive";
    const defaultColor = "#ffffff";

    textEl.style.color = data.color || defaultColor;
    textEl.style.fontFamily = data.fontFamily || defaultFont;
    
    const size = data.fontSize || 100;
    textEl.style.fontSize = typeof size === 'number' ? `${size}px` : size;
    
    textEl.style.fontWeight = data.fontWeight || "400";

    // 處理座標
    const l = data.left ?? 0;
    const t = data.top ?? 0;
    textEl.style.left = typeof l === 'number' ? `${l}px` : (l.endsWith('px') ? l : `${l}px`);
    textEl.style.top = typeof t === 'number' ? `${t}px` : (t.endsWith('px') ? t : `${t}px`);
    
    // 處理寬高
    if (data.width !== undefined) {
        const w = data.width;
        textEl.style.width = typeof w === 'number' ? `${w}px` : (w.toString().endsWith('px') ? w : `${w}px`);
    }
    if (data.height !== undefined) {
        const h = data.height;
        textEl.style.height = typeof h === 'number' ? `${h}px` : (h.toString().endsWith('px') ? h : `${h}px`);
    }

    // 套用 3D 旋轉與聲符參數
    textEl.dataset.rotateX = data.rotateX || 0;
    textEl.dataset.rotateY = data.rotateY || 0;
    textEl.dataset.rotateZ = data.rotateZ || 0;
    textEl.dataset.fontWeight = data.fontWeight || "400";
    textEl.dataset.isPhonetic = data.isPhonetic ? 'true' : 'false';
    updateTextTransform(textEl);

    const span = document.createElement('span');
    span.textContent = data.text;
    textEl.appendChild(span);

    // [NEW] 支援圖片元件
    if (data.image) {
        textEl.dataset.image = data.image;
        const img = document.createElement('img');
        img.crossOrigin = "anonymous";
        // 自動轉換相對路徑 (相對於 characters/)
        const charName = charNameInput.value.trim();
        img.src = `/characters/${charName}/${data.image}`;
        textEl.appendChild(img);
        textEl.classList.add('image-element');
    }

    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    textEl.appendChild(handle);

    const delBtn = document.createElement('div');
    delBtn.className = 'delete-btn';
    delBtn.innerHTML = '×';
    textEl.appendChild(delBtn);

    setupTextElement(textEl);
    
    // [NEW] 標記全字底稿
    const charName = charNameInput.value.trim();
    if (data.text === charName && data.text.length === 1) {
        textEl.classList.add('full-char');
    }

    container.appendChild(textEl);
}



loadBtn.addEventListener('click', () => imageLoader.click());

/**
 * [RESTORED] 渲染區域邊界至畫布 (Canvas 模式)
 */
function renderRegions() {
    rCtx.clearRect(0, 0, 768, 1344);
    if (!showRegions) return;
    
    const elements = document.querySelectorAll('.text-element');
    elements.forEach(el => {
        // 跳過全字底稿與非結構部件
        if (el.classList.contains('full-char')) return;

        // 讀取目前的實體座標
        const x = parseFloat(el.style.left) || 0;
        const y = parseFloat(el.style.top) || 0;
        const w = parseFloat(el.style.width) || el.offsetWidth || 0;
        const h = parseFloat(el.style.height) || el.offsetHeight || 0;

        rCtx.strokeStyle = '#ff4444';
        rCtx.lineWidth = 3;
        rCtx.setLineDash([10, 8]);
        
        // 2D 畫布繪製 (不支援 CSS 3D 透視變形)
        rCtx.strokeRect(x, y, w, h);

        rCtx.fillStyle = 'rgba(255, 68, 68, 0.08)';
        rCtx.fillRect(x, y, w, h);
    });
}

toggleRegionsBtn.addEventListener('click', () => {
    showRegions = !showRegions;
    toggleRegionsBtn.classList.toggle('active', showRegions);
    
    // [FIXED] 透過 CSS 切換紅框與文字顯隱，解決 3D 旋轉連動問題
    if (container) {
        if (showRegions) {
            container.classList.add('show-regions');
            container.classList.add('hide-component-text');
        } else {
            container.classList.remove('show-regions');
            container.classList.remove('hide-component-text');
            rCtx.clearRect(0, 0, 768, 1344);
        }
    }
});

toggleSketchBtn.addEventListener('click', () => {
    const isVisible = layoutCanvas.style.display !== 'none';
    layoutCanvas.style.display = isVisible ? 'none' : 'block';
    toggleSketchBtn.classList.toggle('active', !isVisible);
});

toggleCalligraphyBtn.addEventListener('click', () => {
    const isVisible = inkCanvas.style.display !== 'none';
    const nextState = isVisible ? 'none' : 'block';
    
    inkCanvas.style.display = nextState;
    toggleCalligraphyBtn.classList.toggle('active', !isVisible);
    
    // [NEW] 同步隱藏 HTML 書法參考文字
    const container = document.getElementById('textOverlayContainer');
    if (isVisible) {
        container.classList.add('hide-all-calligraphy');
        showToast("隱藏書法層(修正+底稿)", 'info');
    } else {
        container.classList.remove('hide-all-calligraphy');
        showToast("顯示書法層(修正+底稿)", 'info');
    }
});

if (toggleBgBtn) {
    toggleBgBtn.addEventListener('click', () => {
        const isVisible = bgCanvas.style.display !== 'none';
        bgCanvas.style.display = isVisible ? 'none' : 'block';
        toggleBgBtn.classList.toggle('active', !isVisible);
        showToast(isVisible ? "隱藏底圖層(原始)" : "顯示底圖層(原始)", 'info');
    });
}

// 在視窗大小改變或內容變動後重新渲染範圍
window.addEventListener('resize', () => {
    if (showRegions) renderRegions();
});

// 攔截滑鼠移動與抬起事件，若是拖拉文字時也更新範圍
window.addEventListener('mousemove', () => {
    if (showRegions && (isDraggingText || isResizingText)) {
        renderRegions();
    }
});

async function saveCalligraphyOnly() {
    const charName = charNameInput.value.trim() || "ink";
    const filename = `ink_${charName}_${new Date().getTime()}.png`;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 768;
    tempCanvas.height = 1344;
    const tCtx = tempCanvas.getContext('2d');

    // 不填充背景色，保持透明
    document.querySelectorAll('.text-element').forEach(el => {
        const left = parseFloat(el.style.left) || 0;
        const top = parseFloat(el.style.top) || 0;
        const width = el.offsetWidth || 0;
        const height = el.offsetHeight || 0;
        const domCenterX = left + width / 2;
        const domCenterY = top + height / 2;
        const fontSize = parseFloat(el.style.fontSize) || 100;
        const textStr = el.querySelector('span').textContent;

        const rx = parseFloat(el.dataset.rotateX || 0);
        const ry = parseFloat(el.dataset.rotateY || 0);
        const rz = parseFloat(el.dataset.rotateZ || 0);

        tCtx.save();
        tCtx.translate(domCenterX, domCenterY);

        // 近似 3D 旋轉效果
        // X 軸旋轉對應 Y 軸縮放
        const scaleY = Math.cos(rx * Math.PI / 180);
        // Y 軸旋轉對應 X 軸縮放
        const scaleX = Math.cos(ry * Math.PI / 180);

        tCtx.scale(scaleX, scaleY);
        tCtx.rotate(rz * Math.PI / 180);

        tCtx.fillStyle = el.style.color;
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        tCtx.font = `${fontSize}px ${el.style.fontFamily}`;
        tCtx.fillText(textStr, 0, 0);
        tCtx.restore();
    });

    const finalDataURL = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = finalDataURL;
    link.click();
    updateGallery(finalDataURL, filename);
}

imageLoader.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    currentBgFilename = file.name;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const ratio = Math.min(768 / img.width, 1344 / img.height);
            const w = img.width * ratio;
            const h = img.height * ratio;
            // [FORCE 1:1] 統一以 (0, 0) 為原點，這與 JSON 紀錄的絕對座標格式一致
            bgCtx.clearRect(0, 0, 768, 1344);
            bgCtx.drawImage(img, 0, 0, w, h);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

saveToFolderBtn.addEventListener('click', () => saveToPNG(false));
saveWorkspaceBtn.addEventListener('click', () => saveWorkspace());

async function saveWorkspace() {
    const folder = charNameInput.value.trim();
    if (!folder) {
        showToast("請先開啟或指定工作區字名", 'info');
        return;
    }

    const config = getWorkspaceConfig();
    const inkDataURL = renderInkOnlyToDataURL();
    const phonoInfo = renderInkOnlyWithBounds(true);
    const inkPhonoDataURL = phonoInfo.dataURL;
    const brushDataURL = inkCanvas.toDataURL('image/png');

    // 確保 config 中的 phonoRange 是最新的
    config.phonoRange = phonoInfo.bounds;

    // 儲存工作區時，我們不產生新的編號圖檔，而是更新該目錄的基礎資產
    // 我們傳送一個空檔名告訴伺服器：僅更新 config/ink/brush
    try {
        const response = await fetch('/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: inkDataURL, // 隨機傳送一個圖案以滿足伺服器檢查，但不儲存 final
                filename: "workspace_sync",
                folder: folder,
                config: config,
                inkImage: inkDataURL,
                brushImage: brushDataURL,
                inkPhonoImage: inkPhonoDataURL,
                isWorkspaceSync: true // 標記為同步工作區
            })
        });
        const result = await response.json();
        if (result.status === 'success') {
            showToast(`💾 工作區【${folder}】狀態已儲存`, 'success');
        }
    } catch (err) {
        showToast(`❌ 儲存工作區失敗: ${err.message}`, 'error');
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// [NEW] 監聽視窗縮放，動態校準畫佈縮放
function updateOverlayScale() {
    const wrapper = document.querySelector('.canvas-wrapper');
    const container = document.getElementById('textOverlayContainer');
    if(wrapper && container) {
        const scaleX = wrapper.clientWidth / 768;
        const scaleY = wrapper.clientHeight / 1344;
        container.style.transform = `scale(${scaleX}, ${scaleY})`;
    }
}
window.addEventListener('resize', updateOverlayScale);
updateOverlayScale();

let resizeDebounceTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = setTimeout(() => {
        if (showRegions) {
            renderRegions();
        }
    }, 250); // 防抖動設計，避免過度頻繁計算
});

// --- [NEW] CLI Control System ---
async function pollRemoteCommands() {
    try {
        const response = await fetch('http://localhost:8001/poll');
        const data = await response.json();
        if (data.status === 'success' && data.commands && data.commands.length > 0) {
            data.commands.forEach(cmd => handleRemoteCommand(cmd));
        }
    } catch (err) {
        // 輪詢失敗通常是伺服器暫時未啟動，不報警以免干擾
    }
    setTimeout(pollRemoteCommands, 500); // 500ms 輪詢一次
}

function handleRemoteCommand(cmd) {
    console.log("🎮 收到遠端指令:", cmd);
    const { action, params } = cmd;

    switch (action) {
        case 'load':
            if (params && params.name) {
                charNameInput.value = params.name;
                // 觸發載入邏輯
                loadWorkspace(params.name);
                showToast(`🤖 CLI: 載入工作區 [${params.name}]`, 'info');
            }
            break;
        case 'save':
            saveWorkspace();
            showToast(`🤖 CLI: 執行儲存工作區`, 'info');
            break;
        case 'toggle_regions':
            toggleRegionsBtn.click();
            break;
        case 'clear':
            if (confirm("📢 CLI 指令要求清除畫布，是否執行？")) {
                clearBtn.click();
            }
            break;
        case 'select':
            if (params && params.text) {
                const elements = Array.from(document.querySelectorAll('.text-element'));
                const target = elements.find(el => el.textContent.trim() === params.text || (el.dataset.text && el.dataset.text.trim() === params.text));
                if (target) {
                    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                    showToast(`🤖 CLI: 已選取部件 [${params.text}]`, 'info');
                } else {
                    showToast(`⚠️ CLI: 找不到部件 [${params.text}]`, 'warning');
                }
            }
            break;
        case 'screenshot':
            captureAndUploadScreenshot();
            showToast(`🤖 CLI: 正在擷取並上傳截圖...`, 'info');
            break;
        case 'rotate':
            if (activeTextObj && params && params.axis && params.deg !== undefined) {
                const axis = params.axis.toUpperCase(); // X, Y, Z
                activeTextObj.dataset[`rotate${axis}`] = params.deg;
                updateTextTransform(activeTextObj);
                showToast(`🤖 CLI: 旋轉物件 ${axis} 軸至 ${params.deg}°`, 'info');
            }
            break;
        case 'opacity':
            if (params && params.value !== undefined) {
                bgCanvas.style.opacity = params.value;
                showToast(`🤖 CLI: 底圖透明度設為 ${params.value}`, 'info');
            }
            break;
        case 'ping':
            showToast("🤖 CLI: 連線測試成功", 'success');
            break;
        default:
            console.warn("⚠️ 未知的 CLI 指令:", action);
    }
}

async function captureAndUploadScreenshot() {
    // 建立臨時 Canvas 用於合併
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 768;
    tempCanvas.height = 1344;
    const tempCtx = tempCanvas.getContext('2d');

    // 依序繪製圖層 (背景 -> 佈局 -> 筆跡 -> 區域框)
    tempCtx.drawImage(bgCanvas, 0, 0);
    tempCtx.drawImage(layoutCanvas, 0, 0);
    tempCtx.drawImage(inkCanvas, 0, 0);
    tempCtx.drawImage(regionCanvas, 0, 0);

    // [NEW] 也將互動文字與圖片層合併進來
    document.querySelectorAll('.text-element').forEach(el => {
        // 確保寬高在 headless 環境下也能讀取 (優先使用 style)
        const width = parseFloat(el.style.width) || el.offsetWidth || 0;
        const height = parseFloat(el.style.height) || el.offsetHeight || 0;
        
        // 傳遞 width/height 給繪圖函數
        drawSingleTextToCtx(tempCtx, el, width, height);
    });

    const base64Image = tempCanvas.toDataURL('image/png');

    try {
        await fetch('/upload_screenshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });
        console.log("📸 截圖已上傳至伺服器");
    } catch (err) {
        console.error("❌ 截圖上傳失敗:", err);
    }
}

// 啟動指令輪詢
pollRemoteCommands();

// [FIXED] 強制執行初始化渲染紅框
setTimeout(renderRegions, 500);
