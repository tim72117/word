// ==========================================
// 部件結構範圍 (Region Layer) 邏輯
// ==========================================

// 注意：regionCanvas 與 toggleRegionsBtn 等變數已在 main.js 中宣告為全域。
const rCtx = regionCanvas ? regionCanvas.getContext('2d') : null;
let showRegions = true; 

/**
 * 渲染區域邊界至畫布 (Canvas 模式)
 */
function renderRegions() {
    if (!rCtx || !regionCanvas) return;
    rCtx.clearRect(0, 0, regionCanvas.width, regionCanvas.height);
    if (!showRegions) return;
    
    // 獲取所有目前存在於 DOM 的組件
    const elements = document.querySelectorAll('.text-element');
    elements.forEach(el => {
        // [MOD] 僅對目前可見的部件繪製紅框，以配合預覽模式的分步演繹
        if (el.style.display === 'none') return;

        // 讀取目前的實體座標 (基於實體解析度系統)
        const x = parseFloat(el.style.left) || 0;
        const y = parseFloat(el.style.top) || 0;
        const w = (parseFloat(el.style.width) || el.offsetWidth || 0);
        const h = (parseFloat(el.style.height) || el.offsetHeight || 0);

        rCtx.strokeStyle = '#ff4444';
        rCtx.lineWidth = 3;
        rCtx.setLineDash([10, 8]);
        
        // 2D 畫布繪製
        rCtx.strokeRect(x, y, w, h);

        rCtx.fillStyle = 'rgba(255, 68, 68, 0.08)';
        rCtx.fillRect(x, y, w, h);
    });
}

// 部件偵測與切換邏輯 (使用 main.js 中已定義好的按鈕變數)
if (typeof toggleRegionsBtn !== 'undefined' && toggleRegionsBtn) {
    toggleRegionsBtn.onclick = () => {
        showRegions = !showRegions;
        toggleRegionsBtn.classList.toggle('active', showRegions);
        
        // 同步切換 Canvas 顯示狀態與重繪
        if (regionCanvas) {
            regionCanvas.style.display = showRegions ? 'block' : 'none';
        }
        
        if (showRegions) {
            renderRegions();
        } else {
            rCtx.clearRect(0, 0, regionCanvas.width, regionCanvas.height);
        }
    };
}

// 在文字位置變動或視窗縮放時連動更新
window.addEventListener('resize', () => { if (showRegions) renderRegions(); });

// 初始化
setTimeout(renderRegions, 500);
