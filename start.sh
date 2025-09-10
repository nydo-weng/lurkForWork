#!/bin/bash

# LurkForWork 项目快速启动脚本
# 用于同时启动前端和后端服务

echo "🚀 正在启动 LurkForWork 项目..."
echo "=================================="

# 检查是否安装了 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查是否安装了 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm，请先安装 npm"
    exit 1
fi

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 项目目录: $SCRIPT_DIR"

# 检查后端依赖
echo "🔍 检查后端依赖..."
if [ ! -d "ass3-backend/node_modules" ]; then
    echo "📦 安装后端依赖..."
    cd ass3-backend
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 后端依赖安装失败"
        exit 1
    fi
    cd ..
fi

# 检查前端依赖（如果有的话）
if [ -f "frontend/package.json" ]; then
    echo "🔍 检查前端依赖..."
    if [ ! -d "frontend/node_modules" ]; then
        echo "📦 安装前端依赖..."
        cd frontend
        npm install
        if [ $? -ne 0 ]; then
            echo "❌ 前端依赖安装失败"
            exit 1
        fi
        cd ..
    fi
fi

# 创建日志目录
mkdir -p logs

echo "🎯 启动服务..."
echo "=================================="

# 启动后端服务
echo "🔧 启动后端服务 (端口 5005)..."
cd ass3-backend
npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 等待后端启动
echo "⏳ 等待后端服务启动..."
sleep 3

# 检查后端是否成功启动
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ 后端服务启动失败，请检查 logs/backend.log"
    exit 1
fi

# 启动前端服务（使用 Python 简单 HTTP 服务器）
echo "🌐 启动前端服务 (端口 8080)..."
cd frontend
python3 -m http.server 8080 > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# 等待前端启动
sleep 2

echo "✅ 服务启动完成！"
echo "=================================="
echo "🌐 前端地址: http://localhost:8080"
echo "🔧 后端地址: http://localhost:5005"
echo "📚 API 文档: http://localhost:5005/docs"
echo "=================================="
echo "📝 日志文件:"
echo "   - 后端日志: logs/backend.log"
echo "   - 前端日志: logs/frontend.log"
echo "=================================="
echo "🛑 按 Ctrl+C 停止所有服务"

# 创建停止脚本
cat > stop.sh << 'EOF'
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
EOF

chmod +x stop.sh

# 等待用户中断
trap 'echo -e "\n🛑 正在停止服务..."; ./stop.sh; exit 0' INT

# 保持脚本运行
while true; do
    sleep 1
done
