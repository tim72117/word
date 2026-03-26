// ==========================================
// CLI 遠端控制系統 (CLI Remote Control System)
// ==========================================

async function pollRemoteCommands() {
    try {
        const response = await fetch('http://localhost:8001/poll');
        const data = await response.json();
        if (data.status === 'success' && data.commands && data.commands.length > 0) {
            data.commands.forEach(cmd => handleRemoteCommand(cmd));
        }
    } catch (err) { /* Silent fail if server is down */ }
    setTimeout(pollRemoteCommands, 500);
}

function handleRemoteCommand(cmd) {
    console.log("🎮 收到遠端指令:", cmd);
    const { action, params } = cmd;

    switch (action) {
        case 'load':
            if (params?.name && typeof loadWorkspace === 'function') loadWorkspace(params.name);
            break;
        case 'toggle_regions':
            toggleRegionsBtn?.click();
            break;
        case 'clear':
            if (confirm("📢 CLI 指令要求清除畫布，是否執行？")) clearBtn?.click();
            break;
        case 'select':
            if (params?.text) {
                const elements = Array.from(document.querySelectorAll('.text-element'));
                const target = elements.find(el => el.textContent.trim() === params.text);
                if (target) target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            }
            break;
        case 'screenshot':
            captureAndUploadScreenshot();
            break;
        case 'rotate':
            if (typeof activeTextObj !== 'undefined' && activeTextObj && params?.axis && params.deg !== undefined) {
                const axis = params.axis.toUpperCase();
                activeTextObj.dataset[`rotate${axis}`] = params.deg;
                if (typeof updateTextTransform === 'function') updateTextTransform(activeTextObj);
                showToast(`🤖 CLI: 旋轉 ${axis} 軸至 ${params.deg}°`, 'info');
            }
            break;
        case 'opacity':
            if (params?.value !== undefined) {
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
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = layoutCanvas.width;
    tempCanvas.height = layoutCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(bgCanvas, 0, 0);
    tempCtx.drawImage(layoutCanvas, 0, 0);
    // 繪製紅框 (如果是開啟狀態)
    if (regionCanvas && regionCanvas.style.display !== 'none') {
        tempCtx.drawImage(regionCanvas, 0, 0);
    }
    const base64Image = tempCanvas.toDataURL('image/png');

    try {
        await fetch('/upload_screenshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
            // [IGNORE SSL as localhost]
        });
        console.log("📸 截圖已上傳至伺服器");
    } catch (err) {
        console.error("❌ 截圖上傳失敗:", err);
    }
}

// 註冊啟動
document.addEventListener('DOMContentLoaded', () => {
    pollRemoteCommands();
});
