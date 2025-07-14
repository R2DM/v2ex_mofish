# v2ex_mofish
摸鱼研究所

# 使用步骤
## 先fork到自己的仓库

## 修改.github/workflows/v2ex-fetch.yml下的用户名和邮箱
+ 把“用户名”替换为自己的GitHub用户名（下同）
+ 把“邮箱”替换为自己的GitHub邮箱
```bash
git config --global user.name "用户名"
git config --global user.email "邮箱"
```

## 修改actions下的v2ex-tools.js（76行左右）
```js
let realPath = `https://raw.githubusercontent.com/用户名/v2ex_mofish/main/assets/v2ex/${now}-${data.id}.png`
```

## 开启 Issues 功能
+ 在 GitHub 仓库页面
+ 点击右上角的 Settings ⚙️ 
+ 在左侧菜单中点击 General 
+ 向下滚动到 Features 部分
+ 勾选 Issues 
+ 点击页面底部的 Save 按钮

## 测试actions
+ 在 GitHub 仓库页面
+ 点击 Actions 
+ 点击 v2ex-fetch
+ 点击右边的 Run workflow 
+ action运行结束后，能成功创建一条issues则成功，否则请查看action的报错信息
