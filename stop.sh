#!/bin/bash
echo "🛑 正在停止所有服务..."

# 停止后端
if [ -f "logs/backend.log" ]; then
    BACKEND_PID=$(ps aux | grep "npm start" | grep -v grep | awk '{print $2}')
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID
        echo "✅ 后端服务已停止"
    fi
fi

# 停止前端
if [ -f "logs/frontend.log" ]; then
    FRONTEND_PID=$(ps aux | grep "python3 -m http.server 8080" | grep -v grep | awk '{print $2}')
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID
        echo "✅ 前端服务已停止"
    fi
fi

echo "🎉 所有服务已停止"
