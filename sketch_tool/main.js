const canvas = document.getElementById('sketchCanvas');
const ctx = canvas.getContext('2d');
const brushSize = document.getElementById('brushSize');
const colorOptions = document.querySelectorAll('.color-option');
const clearBtn = document.getElementById('clearBtn');
const undoBtn = document.getElementById('undoBtn');
const saveBtn = document.getElementById('saveBtn');

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let history = [];

// 初始化畫布大小
function resizeCanvas() {
    // 固定的正方形比例 1:1，適合 Imagen 模型輸入
    const size = Math.min(window.innerHeight * 0.6, window.innerWidth * 0.8);
    canvas.width = 1024; // 固定的內部解析度
    canvas.height = 1024;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    // 底色白色
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

resizeCanvas();

// 設置初始畫筆
ctx.lineJoin = 'round';
ctx.lineCap = 'round';
ctx.strokeStyle = '#000000';
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
    ctx.lineWidth = brushSize.value * (1024 / parseInt(canvas.style.width)); // 補償縮放
    ctx.stroke();

    [lastX, lastY] = [x, y];
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return [
        (clientX - rect.left) * scaleX,
        (clientY - rect.top) * scaleY
    ];
}

function stopDrawing() {
    isDrawing = false;
}

// 事件監聽
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// 觸控支援
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); });
canvas.addEventListener('touchend', stopDrawing);

// 清除畫布
clearBtn.addEventListener('click', () => {
    saveHistory();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});

// 復原
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

// 色彩選擇
colorOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        colorOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        ctx.strokeStyle = opt.dataset.color;
    });
});

// 儲存為 PNG
saveBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `sketch_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
});
