#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}开始部署到GitHub Pages...${NC}"

REPO_URL="https://github.com/OpenDataArena/OpenDataArena.github.io.git"
BRANCH="gh-pages"

if [ -z "$(git config --get user.name)" ] || [ -z "$(git config --get user.email)" ]; then
    echo -e "${YELLOW}请配置Git用户信息:${NC}"
    read -p "请输入Git用户名: " git_username
    git config --global user.name "$git_username"
    read -p "请输入Git邮箱: " git_email
    git config --global user.email "$git_email"
fi

if [ ! -d .git ]; then
    git init
fi

if ! git remote | grep -q origin; then
    git remote add origin $REPO_URL
else
    git remote set-url origin $REPO_URL
fi

git add .
git commit -m "Update website content $(date '+%Y-%m-%d %H:%M:%S')"

if ! git branch | grep -q $BRANCH; then
    git checkout -b $BRANCH
else
    git checkout $BRANCH
fi

echo -e "${YELLOW}推送到GitHub...${NC}"
if git push -u origin $BRANCH --force; then
    echo -e "${GREEN}部署完成!${NC}"
else
    echo -e "${YELLOW}推送失败，请检查网络连接和认证信息${NC}"
fi
