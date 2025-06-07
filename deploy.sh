#!/bin/bash

# 颜色设置
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}开始部署到GitHub Pages...${NC}"

# 设置GitHub仓库URL
REPO_URL="https://github.com/BriefMind-Daily/Data_Leaderboard.git"
BRANCH="gh-pages"  # GitHub Pages分支

# 检查是否已经初始化Git仓库
if [ ! -d .git ]; then
    echo -e "${YELLOW}初始化Git仓库...${NC}"
    git init
    echo -e "${GREEN}Git仓库初始化完成${NC}"
fi

# 检查远程仓库是否已配置
if ! git remote | grep -q origin; then
    echo -e "${YELLOW}添加GitHub远程仓库...${NC}"
    git remote add origin $REPO_URL
    echo -e "${GREEN}远程仓库添加完成${NC}"
else
    # 确保远程仓库URL正确
    git remote set-url origin $REPO_URL
fi

# 添加所有文件到Git
echo -e "${YELLOW}添加文件到Git...${NC}"
git add .

# 提交更改
echo -e "${YELLOW}提交更改...${NC}"
git commit -m "Update website content $(date '+%Y-%m-%d %H:%M:%S')"

# 检查是否存在gh-pages分支，如果不存在则创建
if ! git branch | grep -q $BRANCH; then
    echo -e "${YELLOW}创建${BRANCH}分支...${NC}"
    git checkout -b $BRANCH
else
    echo -e "${YELLOW}切换到${BRANCH}分支...${NC}"
    git checkout $BRANCH
fi

# 推送到GitHub
echo -e "${YELLOW}推送到GitHub...${NC}"
git push -u origin $BRANCH --force

echo -e "${GREEN}部署完成!${NC}"
echo -e "${GREEN}网站将在几分钟内可通过https://briefmind-daily.github.io/Data_Leaderboard/访问${NC}"
