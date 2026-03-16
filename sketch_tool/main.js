const bgCanvas = document.getElementById('bgCanvas');
const bgCtx = bgCanvas.getContext('2d');
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

// 3D 旋轉控制項
const rotateXInput = document.getElementById('rotateX');
const rotateYInput = document.getElementById('rotateY');
const rotateZInput = document.getElementById('rotateZ');
const rotateControls = document.querySelector('.rotate-controls');

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
        if (rotateControls) rotateControls.style.display = 'flex';

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

        // 同步旋轉滑桿
        rotateXInput.value = textEl.dataset.rotateX || 0;
        rotateYInput.value = textEl.dataset.rotateY || 0;
        rotateZInput.value = textEl.dataset.rotateZ || 0;

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
}

// 綁定旋轉滑桿事件
[rotateXInput, rotateYInput, rotateZInput].forEach(input => {
    input.addEventListener('input', () => {
        if (activeTextObj) {
            const axis = input.id.replace('rotate', '').toUpperCase(); // X, Y, or Z
            activeTextObj.dataset[`rotate${axis}`] = input.value;
            updateTextTransform(activeTextObj);
        }
    });
});

addTextBtn.addEventListener('click', async () => {
    const textStr = calligraphyInput.value.trim() || charNameInput.value.trim();
    if (!textStr) {
        showToast("請輸入欲置入的字", 'info');
        return;
    }

    const fontValue = fontSelect.value;
    const fontString = `600px ${fontValue}`;

    try {
        await document.fonts.load(fontString);
    } catch (e) {
        console.warn("字體載入逾時或錯誤，使用降級顯示:", e);
    }

    const activeColor = document.querySelector('.color-option.active')?.dataset.color || '#ffffff';
    const container = document.getElementById('textOverlayContainer');

    const textEl = document.createElement('div');
    textEl.className = 'text-element';
    textEl.style.color = activeColor;
    textEl.style.fontFamily = fontValue;

    // 初始化 3D 旋轉數據
    textEl.dataset.rotateX = 0;
    textEl.dataset.rotateY = 0;
    textEl.dataset.rotateZ = 0;

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
    container.appendChild(textEl);

    document.querySelectorAll('.text-element').forEach(el => el.classList.remove('active'));
    textEl.classList.add('active');
    activeTextObj = textEl;

    // 重置滑桿
    rotateXInput.value = 0;
    rotateYInput.value = 0;
    rotateZInput.value = 0;
});

// 工作區設定收集功能
function getWorkspaceConfig() {
    const charName = charNameInput.value.trim();
    const elements = [];
    document.querySelectorAll('.text-element').forEach(el => {
        elements.push({
            text: el.querySelector('span').textContent,
            fontFamily: el.style.fontFamily,
            color: el.style.color,
            fontSize: el.style.fontSize,
            left: el.style.left,
            top: el.style.top,
            rotateX: el.dataset.rotateX || 0,
            rotateY: el.dataset.rotateY || 0,
            rotateZ: el.dataset.rotateZ || 0
        });
    });
    return {
        charName,
        bgFilename: currentBgFilename,
        elements
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
    }
});

layerLayoutBtn.addEventListener('click', () => switchLayer('layout'));
layerCalligraphyBtn.addEventListener('click', () => switchLayer('calligraphy'));

clearBtn.addEventListener('click', () => {
    saveHistory();
    const ctx = getActiveCtx();
    ctx.clearRect(0, 0, 768, 1344);
    if (currentLayer === 'layout') {
        referenceLayer.innerHTML = '';
        bgCtx.clearRect(0, 0, 768, 1344);
        currentBgFilename = null; // Clear background filename when clearing layout
    }
    // 若在書法模式清除，一併清除浮動文字
    if (currentLayer === 'calligraphy') {
        document.getElementById('textOverlayContainer').innerHTML = '';
    }
});

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
    // 獲取目前繪圖層的數據
    const brushDataURL = inkCanvas.toDataURL('image/png');
    const config = getWorkspaceConfig();

    // 繪製 DOM 互動文字層至合併畫布
    const container = document.getElementById('textOverlayContainer');
    const ratioX = 768 / container.clientWidth;
    const ratioY = 1344 / container.clientHeight;

    document.querySelectorAll('.text-element').forEach(el => {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        // 取得 DOM 元件相對於容器的精確中心座標
        const domCenterX = (rect.left - containerRect.left) + rect.width / 2;
        const domCenterY = (rect.top - containerRect.top) + rect.height / 2;
        const fontSize = parseFloat(el.style.fontSize) || 100;
        const textStr = el.querySelector('span').textContent;

        tCtx.fillStyle = el.style.color;
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        tCtx.font = `${fontSize * ratioX}px ${el.style.fontFamily}`;
        // 將中心座標依照比例投射回 768x1344 畫布上
        tCtx.fillText(textStr, domCenterX * ratioX, domCenterY * ratioY);
    });

    const finalDataURL = tempCanvas.toDataURL('image/png');

    // Auto detection for "Save to Folder" if charName is present
    if (charName !== "sketch") {
        await saveToServer(finalDataURL, filename, charName, config, inkDataURL, brushDataURL);
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

function renderInkOnlyToDataURL() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 768;
    tempCanvas.height = 1344;
    const tCtx = tempCanvas.getContext('2d');
    const container = document.getElementById('textOverlayContainer');
    const ratioX = 768 / container.clientWidth;
    const ratioY = 1344 / container.clientHeight;

    document.querySelectorAll('.text-element').forEach(el => {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const domCenterX = (rect.left - containerRect.left) + rect.width / 2;
        const domCenterY = (rect.top - containerRect.top) + rect.height / 2;
        const fontSize = parseFloat(el.style.fontSize) || 100;
        const textStr = el.querySelector('span').textContent;
        tCtx.fillStyle = el.style.color;
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        tCtx.font = `${fontSize * ratioX}px ${el.style.fontFamily}`;
        tCtx.fillText(textStr, domCenterX * ratioX, domCenterY * ratioY);
    });
    return tempCanvas.toDataURL('image/png');
}

async function saveToServer(dataURL, filename, folder, config = null, inkImage = null, brushImage = null) {
    try {
        const response = await fetch('http://localhost:8000/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: dataURL,
                filename: filename,
                folder: folder,
                config: config,
                inkImage: inkImage,
                brushImage: brushImage
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
saveInkBtn.addEventListener('click', () => saveCalligraphyOnly());

loadWorkspaceBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('http://localhost:8000/list', { method: 'POST' });
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
        const response = await fetch('http://localhost:8000/load', {
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

                // 還原文字元件
                if (config.elements) {
                    config.elements.forEach(data => {
                        createFloatingText(data);
                    });
                }

                // [NEW] 自動從同目錄載入手寫筆跡與底圖
                // 通過 8000 埠號存取 (已透過 Symlink 指向 characters)
                const rootUrl = `http://localhost:8000/characters/${folder}`;

                // 1. 還原底圖
                if (config.bgFilename) {
                    currentBgFilename = config.bgFilename;
                    const bgImg = new Image();
                    bgImg.crossOrigin = "anonymous";
                    bgImg.onload = () => {
                        const ratio = Math.min(768 / bgImg.width, 1344 / bgImg.height);
                        const w = bgImg.width * ratio;
                        const h = bgImg.height * ratio;
                        bgCtx.drawImage(bgImg, (768 - w) / 2, (1344 - h) / 2, w, h);
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
    textEl.style.color = data.color;
    textEl.style.fontFamily = data.fontFamily;
    textEl.style.fontSize = data.fontSize;
    textEl.style.left = data.left;
    textEl.style.top = data.top;

    // 套用 3D 旋轉參數
    textEl.dataset.rotateX = data.rotateX || 0;
    textEl.dataset.rotateY = data.rotateY || 0;
    textEl.dataset.rotateZ = data.rotateZ || 0;
    updateTextTransform(textEl);

    const span = document.createElement('span');
    span.textContent = data.text;
    textEl.appendChild(span);

    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    textEl.appendChild(handle);

    const delBtn = document.createElement('div');
    delBtn.className = 'delete-btn';
    delBtn.innerHTML = '×';
    textEl.appendChild(delBtn);

    setupTextElement(textEl);
    container.appendChild(textEl);
}

loadBtn.addEventListener('click', () => imageLoader.click());

async function saveCalligraphyOnly() {
    const charName = charNameInput.value.trim() || "ink";
    const filename = `ink_${charName}_${new Date().getTime()}.png`;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 768;
    tempCanvas.height = 1344;
    const tCtx = tempCanvas.getContext('2d');

    // 不填充背景色，保持透明
    const container = document.getElementById('textOverlayContainer');
    const ratioX = 768 / container.clientWidth;
    const ratioY = 1344 / container.clientHeight;

    document.querySelectorAll('.text-element').forEach(el => {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const domCenterX = (rect.left - containerRect.left) + rect.width / 2;
        const domCenterY = (rect.top - containerRect.top) + rect.height / 2;
        const fontSize = parseFloat(el.style.fontSize) || 100;
        const textStr = el.querySelector('span').textContent;

        const rx = parseFloat(el.dataset.rotateX || 0);
        const ry = parseFloat(el.dataset.rotateY || 0);
        const rz = parseFloat(el.dataset.rotateZ || 0);

        tCtx.save();
        tCtx.translate(domCenterX * ratioX, domCenterY * ratioY);

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
        tCtx.font = `${fontSize * ratioX}px ${el.style.fontFamily}`;
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
            const x = (768 - w) / 2;
            const y = (1344 - h) / 2;
            // 將底圖繪製至專屬 bgCanvas，不清除現有草稿
            bgCtx.clearRect(0, 0, 768, 1344);
            bgCtx.drawImage(img, x, y, w, h);
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
    const brushDataURL = inkCanvas.toDataURL('image/png');

    // 儲存工作區時，我們不產生新的編號圖檔，而是更新該目錄的基礎資產
    // 我們傳送一個空檔名告訴伺服器：僅更新 config/ink/brush
    try {
        const response = await fetch('http://localhost:8000/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: inkDataURL, // 隨機傳送一個圖案以滿足伺服器檢查，但不儲存 final
                filename: "workspace_sync",
                folder: folder,
                config: config,
                inkImage: inkDataURL,
                brushImage: brushDataURL,
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
