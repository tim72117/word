console.log("🚀 Sketch Tool Script Loading...");

// ==========================================
// SECTION 1: DOM Elements & Global State
// ==========================================

// Canvas Elements
const bgCanvas = document.getElementById('bgCanvas');
const bgCtx = bgCanvas.getContext('2d');
const layoutCanvas = document.getElementById('sketchCanvas');
const lCtx = layoutCanvas.getContext('2d');
// [INFO] workspaceCanvas 現在是包覆容器 (DIV)
const workspaceCanvas = document.getElementById('workspaceCanvas');
const regionCanvas = document.getElementById('regionCanvas');
const textOverlayContainer = document.getElementById('textOverlayContainer');

// UI Controls
const brushSize = document.getElementById('brushSize');
const colorOptions = document.querySelectorAll('.color-option');
const clearBtn = document.getElementById('clearBtn');
const undoBtn = document.getElementById('undoBtn');
const charNameInput = document.getElementById('charNameInput');
const imageLoader = document.getElementById('imageLoader');

// Workspace Modal
const workspaceModal = document.getElementById('workspaceModal');
const workspaceList = document.getElementById('workspaceList');
const loadWorkspaceBtn = document.getElementById('loadWorkspaceBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

// Toggle Buttons
const toggleRegionsBtn = document.getElementById('toggleRegionsBtn');
const toggleSketchBtn = document.getElementById('toggleSketchBtn');
const toggleBgBtn = document.getElementById('toggleBgBtn');
const toggleComponentsBtn = document.getElementById('toggleComponentsBtn');
const layerLayoutBtn = document.getElementById('layerLayoutBtn');

// Rotation Controls
const rotateXInput = document.getElementById('rotateX');
const rotateYInput = document.getElementById('rotateY');
const rotateZInput = document.getElementById('rotateZ');
const rotateControls = document.querySelector('.rotate-controls');
const resetRotationsBtn = document.getElementById('resetRotationsBtn');
const isPhoneticCheckbox = document.getElementById('isPhonetic');

// Global State (用於跨模組共享)
let currentLayer = 'sketch';
let currentBgFilename = null;

// Preview Mode State
let isPreviewMode = false;
let productionConfig = null;
let currentStepIndex = -1;
let savedToggleStates = {};

// ==========================================
// SECTION 2: Initialization
// ==========================================

function initApp() {
    // 預設解析度，之後會隨工作區載入更新
    const defaultW = 768;
    const defaultH = 1344;
    setCanvasDimensions(defaultW, defaultH);

    // Set Default Context Styles
    updateContextStyles();

    // Default UI States
    if (toggleBgBtn) toggleBgBtn.classList.add('active');
    if (toggleSketchBtn) toggleSketchBtn.classList.remove('active');
    if (toggleComponentsBtn) toggleComponentsBtn.classList.remove('active');
    if (toggleRegionsBtn) toggleRegionsBtn.classList.add('active');

    if (rotateControls) rotateControls.style.display = 'none';
    // 確保工具分組與圖層狀態一致
    const isSketchBtnActive = toggleSketchBtn && toggleSketchBtn.classList.contains('active');
    const isCompBtnActive = toggleComponentsBtn && toggleComponentsBtn.classList.contains('active');
    const isBgBtnActive = toggleBgBtn && toggleBgBtn.classList.contains('active');

    if (document.getElementById('brushControls')) document.getElementById('brushControls').style.display = isSketchBtnActive ? 'block' : 'none';
    if (document.getElementById('componentControls')) document.getElementById('componentControls').style.display = isCompBtnActive ? 'block' : 'none';
    if (document.getElementById('bgControls')) document.getElementById('bgControls').style.display = isBgBtnActive ? 'block' : 'none';

    // 同步圖層顯示狀態
    if (layoutCanvas) layoutCanvas.style.display = isSketchBtnActive ? 'block' : 'none';
    if (textOverlayContainer) textOverlayContainer.style.display = isCompBtnActive ? 'block' : 'none';
    if (regionCanvas) regionCanvas.style.display = (toggleRegionsBtn && toggleRegionsBtn.classList.contains('active')) ? 'block' : 'none';

    updateOverlayScale();
    console.log("✅ Initialization Complete.");
}

/**
 * [NEW] 動態更新所有 Canvas 實體尺寸與重置樣式
 */
function setCanvasDimensions(w, h) {
    [bgCanvas, layoutCanvas, regionCanvas].forEach(canvas => {
        if (canvas) {
            canvas.width = w;
            canvas.height = h;
        }
    });
    if (textOverlayContainer) {
        textOverlayContainer.style.width = `${w}px`;
        textOverlayContainer.style.height = `${h}px`;
    }
    const internalCanvas = document.querySelector('.canvas-layers');
    if (internalCanvas) {
        // [CRITICAL] 改用 content-box 並鎖定像素寬高，確保 1:1 不縮放
        internalCanvas.style.boxSizing = 'content-box';
        internalCanvas.style.flex = 'none';
        internalCanvas.style.width = `${w}px`;
        internalCanvas.style.height = `${h}px`;
        internalCanvas.style.aspectRatio = 'auto'; // 優先使用強制的寬高
    }
    updateContextStyles();
    updateOverlayScale();
}

function updateContextStyles() {
    [lCtx, bgCtx, (typeof rCtx !== 'undefined' ? rCtx : null)].forEach(ctx => {
        if (!ctx) return;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = (typeof opt !== 'undefined' && opt?.dataset?.color) || '#ffffff';
        ctx.lineWidth = brushSize.value;
    });
}

// ==========================================
// SECTION 3: Global Canvas Controls
// ==========================================

function clearCanvas() {
    if (typeof saveHistory === 'function') saveHistory();
    const w = layoutCanvas.width;
    const h = layoutCanvas.height;
    lCtx.clearRect(0, 0, w, h);
    bgCtx.clearRect(0, 0, w, h);
    textOverlayContainer.innerHTML = '';
    currentBgFilename = null;
    
    showToast("畫布已清除", "info");
    if (typeof renderRegions === 'function') renderRegions();
}

// ==========================================
// SECTION 4: Workspace & Server Interaction
// ==========================================

async function fetchWorkspaces() {
    showToast("正在取得工作區列表...", 'info');
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
}

async function loadWorkspace(folder) {
    try {
        const response = await fetch('/load', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: folder })
        });
        const result = await response.json();
        if (result.status === 'success') {
            charNameInput.value = folder;
            textOverlayContainer.innerHTML = '';
            lCtx.clearRect(0, 0, layoutCanvas.width, layoutCanvas.height);
            bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

            if (result.config) {
                const config = result.config;
                // [NEW] 讀取畫布大小並動態應用
                const w = config.width || 768;
                const h = config.height || 1344;
                setCanvasDimensions(w, h);

                // Load Elements (使用 component_layer.js 的函式)
                if (config.elements && typeof createFloatingText === 'function') {
                    config.elements.forEach(data => createFloatingText(data));
                }

                // Load Background Image
                if (config.bgFilename) {
                    currentBgFilename = config.bgFilename;
                    const bgImg = new Image();
                    bgImg.crossOrigin = "anonymous";
                    bgImg.onload = () => {
                        // [FIXED] 優先依循 config 設定之畫布解析度，底圖僅做為背景繪製
                        console.log(`📸 底圖載入: ${bgImg.width}x${bgImg.height} -> 畫布目標: ${layoutCanvas.width}x${layoutCanvas.height}`);
                        
                        // 依照畫布大小滿版繪製底圖 (或 1:1 繪製)
                        bgCtx.drawImage(bgImg, 0, 0, layoutCanvas.width, layoutCanvas.height);
                    };
                    bgImg.src = `/characters/${folder}/${config.bgFilename}`;
                }
                showToast(`✅ 已還原工作區: ${folder}`, 'success');
                if (typeof renderRegions === 'function') setTimeout(renderRegions, 200);
            } else {
                currentBgFilename = null;
                showToast(`✨ 開啟全新工作區: ${folder}`, 'success');
                if (typeof renderRegions === 'function') renderRegions();
            }
        }
    } catch (err) {
        showToast(`❌ 載入工作區出錯: ${err.message}`, 'error');
    }
}

// ==========================================
// SECTION 5: UI Helpers & Feedback
// ==========================================

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    const container = document.getElementById('toastContainer');
    if (container) container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function updateOverlayScale() {
    const sheet = document.querySelector('.canvas-layers');
    if (sheet && textOverlayContainer) {
        const w = layoutCanvas.width;
        const h = layoutCanvas.height;
        const scaleX = sheet.clientWidth / w;
        const scaleY = sheet.clientHeight / h;
        textOverlayContainer.style.transform = `scale(${scaleX}, ${scaleY})`;
    }
}

// ==========================================
// SECTION 6: Event Listeners
// ==========================================

window.addEventListener('resize', updateOverlayScale);

// UI Controls
if (clearBtn) clearBtn.addEventListener('click', clearCanvas);
if (undoBtn && typeof undo === 'function') undoBtn.addEventListener('click', undo);

// Layer Toggles
if (toggleSketchBtn) {
    toggleSketchBtn.addEventListener('click', () => {
        const isVisible = layoutCanvas.style.display !== 'none';
        const nextVisible = !isVisible;
        layoutCanvas.style.display = nextVisible ? 'block' : 'none';
        toggleSketchBtn.classList.toggle('active', nextVisible);
        
        const controls = document.getElementById('brushControls');
        if (controls) controls.style.display = nextVisible ? 'block' : 'none';
    });
}

if (toggleBgBtn) {
    toggleBgBtn.addEventListener('click', () => {
        const isVisible = bgCanvas.style.display !== 'none';
        const nextVisible = !isVisible;
        bgCanvas.style.display = nextVisible ? 'block' : 'none';
        toggleBgBtn.classList.toggle('active', nextVisible);
        
        const controls = document.getElementById('bgControls');
        if (controls) controls.style.display = nextVisible ? 'block' : 'none';
        showToast(nextVisible ? "顯示底圖" : "隱藏底圖", 'info');
    });
}

if (toggleComponentsBtn) {
    toggleComponentsBtn.addEventListener('click', () => {
        const isVisible = textOverlayContainer.style.display !== 'none';
        const nextVisible = !isVisible;
        textOverlayContainer.style.display = nextVisible ? 'block' : 'none';
        textOverlayContainer.style.pointerEvents = nextVisible ? 'auto' : 'none';
        toggleComponentsBtn.classList.toggle('active', nextVisible);

        const controls = document.getElementById('componentControls');
        if (controls) controls.style.display = nextVisible ? 'block' : 'none';
        showToast(nextVisible ? "顯示部件層" : "隱藏部件層", 'info');
    });
}

// Background Opacity Control
const bgOpacityInput = document.getElementById('bgOpacityInput');
if (bgOpacityInput) {
    bgOpacityInput.addEventListener('input', (e) => {
        const val = e.target.value / 100;
        bgCanvas.style.opacity = val;
    });
}

// Workspace Management
if (loadWorkspaceBtn) loadWorkspaceBtn.addEventListener('click', fetchWorkspaces);
if (closeModalBtn) closeModalBtn.addEventListener('click', () => workspaceModal.style.display = 'none');
if (workspaceModal) {
    workspaceModal.addEventListener('click', (e) => {
        if (e.target === workspaceModal) workspaceModal.style.display = 'none';
    });
}

// Image background loader
if (imageLoader) {
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        currentBgFilename = file.name;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const targetW = layoutCanvas.width;
                const targetH = layoutCanvas.height;
                const ratio = Math.min(targetW / img.width, targetH / img.height);
                bgCtx.clearRect(0, 0, targetW, targetH);
                bgCtx.drawImage(img, 0, 0, img.width * ratio, img.height * ratio);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Start Main Loop
initApp();
console.log("✅ Sketch Tool Script Loaded Successfully!");

