#!/bin/bash

# setup_venv.sh - 自動化 Python venv 建立與套件安裝
# 使用方式: ./setup_venv.sh [package_names...]

VENV_DIR=".venv"

if [ ! -d "$VENV_DIR" ]; then
    echo "正在建立虛擬環境 (.venv)..."
    python3 -m venv "$VENV_DIR"
fi

if [ -f "requirements.txt" ]; then
    echo "正在從 requirements.txt 安裝依賴..."
    "$VENV_DIR/bin/pip" install -r requirements.txt
fi

if [ "$#" -gt 0 ]; then
    echo "正在安裝額外套件: $@"
    "$VENV_DIR/bin/pip" install "$@"
fi

echo "虛擬環境配置完成。"
echo "請使用 $VENV_DIR/bin/python 執行您的腳本。"
