#!/bin/bash

# eMenuApp GraphQL 连接测试脚本
# 使用方法: bash test-graphql-connection.sh

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${BLUE}  eMenuApp GraphQL 连接测试${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo ""

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ 错误：.env 文件不存在${NC}"
    echo ""
    echo -e "${YELLOW}解决方案：${NC}"
    echo "1. 复制 .env.example 到 .env"
    echo "  cp .env.example .env"
    echo ""
    echo "2. 编辑 .env 文件，设置正确的 GraphQL endpoint："
    echo "  REACT_APP_GRAPHQL_ENDPOINT=https://your-backend.com/graphql"
    echo ""
    exit 1
fi

# 读取 GraphQL endpoint
if grep -q "REACT_APP_GRAPHQL_ENDPOINT" .env; then
    ENDPOINT=$(grep "REACT_APP_GRAPHQL_ENDPOINT" .env | cut -d '=' -f2)
fi

if [ -z "$ENDPOINT" ] || [ "$ENDPOINT" = "https://your-graphql-endpoint.com/graphql" ]; then
    echo -e "${RED}❌ GraphQL endpoint 未配置或仍为默认值${NC}"
    echo ""
    echo -e "${YELLOW}请编辑 .env 文件，设置:</YELLOW}"
    echo "REACT_APP_GRAPHQL_ENDPOINT=https://your-actual-endpoint.com/graphql"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ 找到 GraphQL endpoint:${NC}"
echo "   $ENDPOINT"
echo ""

# 检查网络连接
echo -e "${BLUE}📡 检查网络连接...${NC}"

if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ curl 命令不可用，无法测试连接${NC}"
    exit 1
fi

# 简单的连接测试
if curl -s -f "$ENDPOINT" -X OPTIONS > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 网络连接正常${NC}"
else
    echo -e "${YELLOW}⚠️  无法通过 OPTIONS 请求连接，尝试 POST...${NC}"
    
    # 尝试 POST 请求测试
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
        -H "Content-Type: application/json" \
        -d '{"query": "query { __typename }"}' 2>&1)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
        echo -e "${GREEN}✅ GraphQL endpoint 可达${NC}"
    else
        echo -e "${RED}❌ 无法连接 GraphQL endpoint (HTTP $HTTP_CODE)${NC}"
        echo ""
        echo -e "${YELLOW}排查建议:${NC}"
        echo "1. 检查 endpoint URL 是否正确"
        echo "2. 检查网络连接"
        echo "3. 确认后端服务已启动"
        echo "4. 检查防火墙设置"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}🔍 测试菜品查询...${NC}"

# GraphQL 查询测试
QUERY='{"operationName":"ListDishTypes","query":"query ListDishTypes { listDishTypes { id name } }","variables":{}}'

RESPONSE=$(curl -s -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "$QUERY" \
    2>&1)

if echo "$RESPONSE" | grep -q '"data"'; then
    echo -e "${GREEN}✅ GraphQL 查询成功${NC}"
    echo ""
    echo -e "${BLUE}返回数据(前 500 字符):${NC}"
    echo "$RESPONSE" | head -c 500
    echo ""
    echo ""
else
    echo -e "${YELLOW}⚠️  GraphQL 查询返回异常${NC}"
    echo ""
    echo -e "${BLUE}返回数据:${NC}"
    echo "$RESPONSE"
    echo ""
    echo -e "${YELLOW}排查建议:${NC}"
    echo "1. 检查 GraphQL 查询是否有效"
    echo "2. 确认后端 GraphQL schema 包含 listDishTypes"
    echo "3. 检查认证 token 是否有效"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${BLUE}  测试完成${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}后续步骤:${NC}"
echo "1. 如果连接成功，启动 Metro Bundler:"
echo "   npm start -- --reset-cache"
echo ""
echo "2. 启动 iOS 模拟器:"
echo "   npm run ios"
echo ""
echo "3. 登录应用并导航到 MenuScreen 验证菜品加载"
echo ""
