// ==========================================
// 預覽模式邏輯 (Preview Mode Logic)
// ==========================================

async function togglePreviewMode() {
    isPreviewMode = !isPreviewMode;
    const btn = document.getElementById('togglePreviewBtn');
    const controlsPanel = document.getElementById('previewControls');
    const container = document.querySelector('.studio-container');
    const charName = charNameInput.value.trim();

    if (isPreviewMode) {
        if (!charName) {
            showToast("請先載入一個字的工作區", "error");
            isPreviewMode = false;
            return;
        }

        try {
            const response = await fetch(`/characters/${charName}/production_config.json`);
            if (!response.ok) throw new Error("找不到 production_config.json");
            productionConfig = await response.json();
        } catch (err) {
            showToast(err.message, "error");
            isPreviewMode = false;
            return;
        }

        if (container) container.classList.add('preview-mode');

        // 1. 備份目前圖層狀態
        savedToggleStates = {
            bg: toggleBgBtn?.classList.contains('active'),
            sketch: toggleSketchBtn?.classList.contains('active'),
            components: toggleComponentsBtn?.classList.contains('active'),
            regions: toggleRegionsBtn?.classList.contains('active')
        };


        // 2. 交互式隱藏圖層 (這會自動隱藏側邊對應的工具區)
        if (toggleBgBtn?.classList.contains('active')) toggleBgBtn.click();
        if (toggleSketchBtn?.classList.contains('active')) toggleSketchBtn.click();
        if (toggleComponentsBtn?.classList.contains('active')) toggleComponentsBtn.click();
        if (toggleRegionsBtn?.classList.contains('active')) toggleRegionsBtn.click();
        
        // 分別隱藏畫布本體確保乾淨
        bgCanvas.style.display = 'none';
        layoutCanvas.style.display = 'none';
        regionCanvas.style.display = 'none';
        textOverlayContainer.style.display = 'block'; // 必須開啟部件容器以顯示步驟物件
        
        if (btn) {
            btn.classList.add('active');
            btn.textContent = "結束預覽";
        }
        if (controlsPanel) controlsPanel.style.display = 'block';
        
        currentStepIndex = 0;
        applyPreviewStep(0);
        showToast(`進入預覽模式: ${charName}`, 'success');
    } else {
        // 還原
        if (container) container.classList.remove('preview-mode');

        if (btn) {
            btn.classList.remove('active');
            btn.textContent = "預覽 (Preview)";
        }
        if (controlsPanel) controlsPanel.style.display = 'none';
        
        // 還原紅框透明度
        if (regionCanvas) regionCanvas.style.opacity = '1.0';

        // 還原圖層 (這會自動重新顯示側邊工具區)
        if (savedToggleStates.bg) toggleBgBtn?.click();
        if (savedToggleStates.sketch) toggleSketchBtn?.click();
        if (savedToggleStates.components) toggleComponentsBtn?.click();
        if (savedToggleStates.regions) toggleRegionsBtn?.click();

        // 強制顯示所有部件
        document.querySelectorAll('.text-element').forEach(el => el.style.display = 'flex');
        
        showToast('已結束預覽', 'info');
    }
}

function applyPreviewStep(index) {
    if (!productionConfig || !productionConfig.componentExplanations) return;
    const steps = productionConfig.componentExplanations;
    if (index < 0 || index >= steps.length) return;

    const step = steps[index];
    const indicator = document.getElementById('stepIndicator');
    const label = document.getElementById('partLabel');

    if (indicator) indicator.textContent = `${index + 1} / ${steps.length}`;
    if (label) label.textContent = ` 部件: ${step.label || step.components.join('+')}`;

    // 依據生產設定中的 components 清單來過濾顯示的物件
    const allElements = document.querySelectorAll('.text-element');
    allElements.forEach(el => {
        const text = el.querySelector('span')?.textContent.trim();
        const isActive = step.components.includes(text);
        
        // 如果該組件即將從隱藏切換為顯示，加入特效 (包含紅框淡化)
        if (isActive && el.style.display === 'none') {
            el.classList.remove('effect-appear', 'showing');
            void el.offsetWidth; // 強制重繪以重啟動畫
            el.classList.add('effect-appear', 'showing');
        } else if (!isActive) {
            el.classList.remove('showing');
        }

        el.style.display = isActive ? 'flex' : 'none';
        
        // 如果是該步驟的物件，且具備有效圖檔，強制顯示為渲染圖 (ink)
        if (isActive && el.dataset.image && el.dataset.image !== 'null') {
            const img = el.querySelector('img');
            const charName = charNameInput.value.trim();
            const inkImg = el.dataset.image_ink || el.dataset.image.replace('_struct.png', '_ink.png');
            if (img) img.src = `/characters/${charName}/${inkImg}`;
            el.dataset.image = inkImg;
        }
    });

    // 背景底圖在預覽時強制顯示為完全不透明
    bgCanvas.style.display = 'block';
    bgCanvas.style.opacity = '1.0';
}

function nextStep() {
    if (productionConfig && currentStepIndex < productionConfig.componentExplanations.length - 1) {
        currentStepIndex++;
        applyPreviewStep(currentStepIndex);
    }
}

function prevStep() {
    if (currentStepIndex > 0) {
        currentStepIndex--;
        applyPreviewStep(currentStepIndex);
    }
}

// Preview 頁面按鈕事件綁定
document.addEventListener('DOMContentLoaded', () => {
    const togglePreviewBtn = document.getElementById('togglePreviewBtn');
    if (togglePreviewBtn) togglePreviewBtn.addEventListener('click', togglePreviewMode);
    
    const nextStepBtn = document.getElementById('nextStepBtn');
    if (nextStepBtn) nextStepBtn.addEventListener('click', nextStep);
    
    const prevStepBtn = document.getElementById('prevStepBtn');
    if (prevStepBtn) prevStepBtn.addEventListener('click', prevStep);
});
