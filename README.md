# 恒温牢饭 / Constant-Temperature Prison Meal

一款基于 **Phaser 3** 的文字冒险 + 烹饪经营小游戏，使用 **Electron** 打包为桌面 EXE。

## 玩法
在「恒温牢饭」的世界里，你是一名囚犯厨师，通过每天选择食材、做法、摆盘与火候，
烹出影响狱友、看守与自己的料理，逐步解锁线索、推动剧情，并走向不同结局。

## 运行（网页版）
直接用浏览器打开 `index.html` 即可游玩（依赖本地 `libs/phaser.min.js`）。

## 构建桌面版（Electron）
```bash
npm install
npm run build        # 生成 dist/ 下的 nsis 安装版与便携版 EXE
```

## 目录结构
| 路径 | 说明 |
|------|------|
| `index.html` / `libs/` | 网页游戏入口与 Phaser 运行时 |
| `src/game.js` | 游戏主逻辑（场景、UI、烹饪系统） |
| `src/data.js` | 剧情、食材、做法、结局等数据 |
| `main.js` / `preload.js` / `package.json` | Electron 工程 |
| `游戏流程技术说明.md` | 流程与技术说明文档 |

## 下载成品
无需构建，直接下载便携版 EXE，见 [Releases](../../releases)。
