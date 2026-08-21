// 预加载脚本：当前游戏为纯前端，无 Node 依赖。
// 此文件保留供后续扩展（如本地存档读写、自动更新等）。
// contextIsolation 开启，此脚本在隔离世界运行，通过 contextBridge 暴露安全 API。

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('appAPI', {
  version: '1.0.0',
  platform: process.platform
});
