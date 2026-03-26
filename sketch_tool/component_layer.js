// ==========================================
// 部件層 (Component Layer) 邏輯
// ==========================================

let isDraggingText = false;
let isResizingText = false;
let activeTextObj = null;

let textDragStartX = 0, textDragStartY = 0;
let textStartLeft = 0, textStartTop = 0, textStartSize = 0;

// UI Controls
const showStructBtn = document.getElementById('showStructBtn');
const showInkBtn = document.getElementById('showInkBtn');
const phoneticToggle = document.getElementById('isPhonetic');

function createFloatingText(data) {
    const textEl = document.createElement('div');
    textEl.className = 'text-element';
    
    // [ADD] 部件內建紅框範圍 (DOM 模式，用於預覽動畫)
    const regionBox = document.createElement('div');
    regionBox.className = 'region-box';
    textEl.appendChild(regionBox);

    const defaultFont = "'TW-Kai', serif";
    const defaultColor = "#ffffff";

    // Styles
    if (data.color) textEl.style.color = data.color;
    else textEl.style.color = defaultColor;
    
    textEl.style.fontFamily = data.fontFamily || defaultFont;
    textEl.style.fontWeight = data.fontWeight || "400";
    
    const size = data.fontSize || 100;
    textEl.style.fontSize = (typeof size === 'number' || !size.toString().endsWith('px')) ? `${size}px` : size;

    const l = (typeof data.left === 'string' && data.left.endsWith('px')) ? parseFloat(data.left) : (data.left ?? 0);
    const t = (typeof data.top === 'string' && data.top.endsWith('px')) ? parseFloat(data.top) : (data.top ?? 0);
    textEl.style.left = `${l}px`;
    textEl.style.top = `${t}px`;

    const w = (typeof data.width === 'string' && data.width.endsWith('px')) ? parseFloat(data.width) : (data.width || 0);
    const h = (typeof data.height === 'string' && data.height.endsWith('px')) ? parseFloat(data.height) : (data.height || 0);
    if (w > 0) textEl.style.width = `${w}px`;
    if (h > 0) textEl.style.height = `${h}px`;

    // Datasets for state persistence
    textEl.dataset.rotateX = data.rotateX || 0;
    textEl.dataset.rotateY = data.rotateY || 0;
    textEl.dataset.rotateZ = data.rotateZ || 0;
    textEl.dataset.fontWeight = data.fontWeight || "400";
    textEl.dataset.isPhonetic = data.isPhonetic ? 'true' : 'false';

    // Content
    const span = document.createElement('span');
    span.textContent = data.text;
    textEl.appendChild(span);

    // Image backgrounds
    if (data.image && data.image !== "null") {
        textEl.dataset.image = data.image; // Current active image
        textEl.dataset.image_ink = data.image; 
        if (data.image_struct) textEl.dataset.image_struct = data.image_struct;

        const img = document.createElement('img');
        img.crossOrigin = "anonymous";
        const charName = charNameInput.value.trim();
        img.src = `/characters/${charName}/${data.image}`;
        img.onerror = () => img.style.display = 'none'; // 自動隱藏載入失敗的圖檔，消除破碎圖示
        textEl.appendChild(img);
        textEl.classList.add('image-element');
    } else {
        // [MOD] 紀錄為 null 或空值，但保留區塊以顯示聚光效果
        textEl.dataset.image = 'null';
    }

    // Controls
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    textEl.appendChild(handle);

    const delBtn = document.createElement('div');
    delBtn.className = 'delete-btn';
    delBtn.innerHTML = '×';
    textEl.appendChild(delBtn);

    setupTextElement(textEl);

    // [CRITICAL] Append to container BEFORE updating transform to ensures renderRegions finds it
    textOverlayContainer.appendChild(textEl);
    updateTextTransform(textEl);
}

function setupTextElement(textEl) {
    const handle = textEl.querySelector('.resize-handle');
    const delBtn = textEl.querySelector('.delete-btn');

    delBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        textEl.remove();
        if (activeTextObj === textEl) activeTextObj = null;
        if (typeof renderRegions === 'function') renderRegions();
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

        // Sync Controls
        if (typeof rotateXInput !== 'undefined' && rotateXInput) rotateXInput.value = textEl.dataset.rotateX || 0;
        if (typeof rotateYInput !== 'undefined' && rotateYInput) rotateYInput.value = textEl.dataset.rotateY || 0;
        if (typeof rotateZInput !== 'undefined' && rotateZInput) rotateZInput.value = textEl.dataset.rotateZ || 0;
        
        ['X', 'Y', 'Z'].forEach(axis => {
            const valDisplay = document.getElementById(`val${axis}`);
            const input = document.getElementById(`rotate${axis.toLowerCase()}`);
            if (valDisplay && input) valDisplay.textContent = input.value;
        });

        if (typeof isPhoneticCheckbox !== 'undefined' && isPhoneticCheckbox) {
            isPhoneticCheckbox.checked = textEl.dataset.isPhonetic === 'true';
        }

        // Update display mode buttons state based on current image filename
        const currentImg = textEl.dataset.image || '';
        if (currentImg.includes('_struct.png')) {
            showStructBtn?.classList.add('active');
            showInkBtn?.classList.remove('active');
        } else {
            showInkBtn?.classList.add('active');
            showStructBtn?.classList.remove('active');
        }

        const rotPanel = document.getElementById('rotationPanel');
        const noSelMsg = document.getElementById('noSelectionMsg');
        if (rotPanel) rotPanel.style.display = 'block';
        if (noSelMsg) noSelMsg.style.display = 'none';

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
    
    // Support Region Redraw
    if (typeof renderRegions === 'function') renderRegions();
}

// 監聽部件互動事件 (Dragging / Resizing)
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

const paperElem = document.querySelector('.canvas-layers');
if (paperElem) {
    paperElem.addEventListener('mousedown', (e) => {
        if (!e.target.closest('.text-element')) {
            document.querySelectorAll('.text-element').forEach(el => el.classList.remove('active'));
            activeTextObj = null;

            const rotPanel = document.getElementById('rotationPanel');
            const noSelMsg = document.getElementById('noSelectionMsg');
            if (rotPanel) rotPanel.style.display = 'none';
            if (noSelMsg) noSelMsg.style.display = 'block';
        }
    });
}

// ==========================================
// Rotation & Property Controls
// ==========================================

const rotInputs = [
    document.getElementById('rotateX'),
    document.getElementById('rotateY'),
    document.getElementById('rotateZ')
];

rotInputs.forEach(input => {
    if (input) {
        input.addEventListener('input', () => {
            if (activeTextObj) {
                const axis = input.id.replace('rotate', '').toUpperCase();
                activeTextObj.dataset[`rotate${axis}`] = input.value;
                const valDisplay = document.getElementById(`val${axis}`);
                if (valDisplay) valDisplay.textContent = input.value;
                updateTextTransform(activeTextObj);
            }
        });
    }
});

const resetBtn = document.getElementById('resetRotationsBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        document.querySelectorAll('.text-element').forEach(el => {
            el.dataset.rotateX = 0;
            el.dataset.rotateY = 0;
            el.dataset.rotateZ = 0;
            updateTextTransform(el);
        });
        if (activeTextObj) {
            rotInputs.forEach(input => { if (input) input.value = 0; });
            ['X', 'Y', 'Z'].forEach(axis => {
                const display = document.getElementById(`val${axis}`);
                if (display) display.textContent = '0';
            });
        }
        if (typeof showToast === 'function') showToast('已重設為平面視角', 'success');
    });
}

if (phoneticToggle) {
    phoneticToggle.addEventListener('change', (e) => {
        if (activeTextObj) activeTextObj.dataset.isPhonetic = e.target.checked;
    });
}

// Display Mode Switching (Sketch vs Ink)

function setDisplayMode(mode) {
    // 優先切換當前選中的，或切換全部
    const targets = activeTextObj ? [activeTextObj] : Array.from(document.querySelectorAll('.text-element.image-element'));
    const charName = document.getElementById('charNameInput')?.value.trim();

    targets.forEach(el => {
        const img = el.querySelector('img');
        if (!img) return;

        let currentImg = el.dataset.image;
        let newImg;

        if (mode === 'struct') {
            newImg = el.dataset.image_struct || currentImg.replace('_ink.png', '_struct.png');
        } else {
            newImg = el.dataset.image_ink || currentImg.replace('_struct.png', '_ink.png');
        }

        if (newImg && newImg !== currentImg) {
            console.log(`🖼️ 切換模式 [${mode}]: ${newImg}`);
            img.src = `/characters/${charName}/${newImg}`;
            el.dataset.image = newImg;
        }
    });

    if (mode === 'struct') {
        showStructBtn?.classList.add('active');
        showInkBtn?.classList.remove('active');
    } else {
        showInkBtn?.classList.add('active');
        showStructBtn?.classList.remove('active');
    }
}

if (showStructBtn) showStructBtn.addEventListener('click', () => setDisplayMode('struct'));
if (showInkBtn) showInkBtn.addEventListener('click', () => setDisplayMode('ink'));
