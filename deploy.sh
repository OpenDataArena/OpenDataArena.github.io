#!/bin/bash

# 颜色设置
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}开始部署到GitHub Pages...${NC}"

REPO_URL_HTTPS="https://github.com/BriefMind-Daily/Data_Leaderboard.git"
REPO_URL_SSH="git@github.com:BriefMind-Daily/Data_Leaderboard.git"

REPO_URL="$REPO_URL_HTTPS"
BRANCH="gh-pages" 

echo -e "${YELLOW}请选择Git推送协议:${NC}"
echo "1) HTTPS (需要输入用户名密码或个人访问令牌)"
echo "2) SSH (需要已配置SSH密钥)"
read -p "请选择 [1/2] (默认: 1): " protocol_choice

if [ "$protocol_choice" = "2" ]; then
    REPO_URL="$REPO_URL_SSH"
    echo -e "${GREEN}已选择SSH协议${NC}"
else
    echo -e "${GREEN}已选择HTTPS协议${NC}"
    
    echo -e "${YELLOW}注意: 使用HTTPS协议时，GitHub可能要求使用个人访问令牌(PAT)而非密码${NC}"
    echo -e "${YELLOW}如何创建个人访问令牌: https://github.com/settings/tokens${NC}"
fi

# 检查Git配置
if [ -z "$(git config --get user.name)" ] || [ -z "$(git config --get user.email)" ]; then
    echo -e "${YELLOW}Git用户名或邮箱未配置，请配置：${NC}"
    echo "git config --global user.name \"您的名字\""
    echo "git config --global user.email \"您的邮箱\""
    
    # 询问是否继续
    read -p "是否要配置Git用户名和邮箱并继续？(y/n) " answer
    if [ "$answer" = "y" ]; then
        read -p "请输入Git用户名: " git_username
        git config --global user.name "$git_username"
        read -p "请输入Git邮箱: " git_email
        git config --global user.email "$git_email"
        echo -e "${GREEN}Git配置已更新${NC}"
    else
        echo -e "${YELLOW}部署已取消${NC}"
        exit 1
    fi
fi

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
echo -e "${YELLOW}这可能需要几分钟时间，请耐心等待...${NC}"

# 使用-v参数获取更详细的输出
if git push -v -u origin $BRANCH --force; then
    echo -e "${GREEN}部署完成!${NC}"
    echo -e "${GREEN}网站将在几分钟内可通过https://briefmind-daily.github.io/Data_Leaderboard/访问${NC}"
else
    echo -e "${YELLOW}推送失败，尝试使用更详细的方式...${NC}"
    
    # 检查配置和认证
    echo -e "${YELLOW}检查Git配置...${NC}"
    git config --get user.name
    git config --get user.email
    
    # 检查远程仓库
    echo -e "${YELLOW}检查远程仓库...${NC}"
    git remote -v
    
    echo -e "${YELLOW}请检查以下几点：${NC}"
    echo "1. 确保已配置Git用户名和邮箱"
    echo "2. 确保有权限访问${REPO_URL}仓库"
    echo "3. 如果使用HTTPS协议，可能需要输入GitHub用户名和密码（或个人访问令牌）"
    echo "4. 使用SSH密钥认证可能更方便"
    echo "5. 网络连接是否稳定"
    
    echo -e "${YELLOW}尝试重新推送...${NC}"
    GIT_TRACE=1 git push -u origin $BRANCH --force
fi
