/*
 * 《最后一道菜 · 第一章：温汤裹谎》主程序（Phaser 3 + 原生 JS）
 * 布局：顶栏状态 / 左侧档案 / 右侧舞台演出 / 底部操作（对话·烹饪·送餐）。
 * 含烹饪过程演出、送餐动画、过场淡入淡出、料理图标、分层反应、情绪状态条。
 */
(function () {
  'use strict';

  const W = 960, H = 540;
  const STAT_KEYS = ['trust', 'fear', 'anger', 'guilt', 'suspicion', 'hunger'];
  const STAT_COLOR = { trust: 0x6abf69, fear: 0xe06c75, anger: 0xe0a458, guilt: 0x8a7fd0, suspicion: 0x5aa0c0 };
  const STAT_NAME = { trust: '信任', fear: '恐惧', anger: '愤怒', guilt: '愧疚', suspicion: '警觉' };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const SORT = a => a.slice().sort();
  const SAME = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  // ============ 统一像素风主题（灰烬监狱厨房：低饱和铁锈·暖黄炉火·金属面板·冷暖对比）============
  const THEME = {
    coal: 0x0c0e14, coal2: 0x12151d,
    panel: 0x161b24, panelHi: 0x2c3543, panelLo: 0x070a10,
    rust: 0xb5523a, rustDk: 0x6e2f23, rustHi: 0xd4775a,
    gold: 0xf4d35e, goldDk: 0xc99a2e,
    metal: 0x3a414c, metalHi: 0x586172, metalLo: 0x23282f,
    paper: 0xe8e0cf, ink: 0x2a2620,
    cold: 0x9fd0ff, warm: 0xff9d6c, hearth: 0xff7a2f,
    good: 0x6abf69, bad: 0xe06c75
  };
  // 像素斜角面板：外暗(lo)作右下描边，亮(hi)作左上描边，内部 fill
  function drawBevel(g, x, y, w, h, fill, hi, lo, bw) {
    bw = bw || 2;
    g.fillStyle(lo, 1); g.fillRect(x, y, w, h);
    g.fillStyle(hi, 1); g.fillRect(x, y, w, bw); g.fillRect(x, y, bw, h);
    g.fillStyle(fill, 1); g.fillRect(x + bw, y + bw, w - 2 * bw, h - 2 * bw);
  }

  // ============ 角色像素绘制（程序生成，无外部资源）============
  // 林烬（厨师 / 主角）：站立 烹饪 端餐 对话 四种动作
  function drawLin(g, pose) {
    const hat = 0xf2efe6, hatS = 0xd8d2c4, skin = 0xe8b98a, skinS = 0xcf9c72, eye = 0x1a1410,
      jk = 0x3f7fa0, jkD = 0x2c5d76, apron = 0xe8e0cf, pants = 0x2a2f3a, shoe = 0x15171d,
      metal = 0x9aa3b2, bowl = 0x6b7280;
    g.clear();
    g.fillStyle(hat, 1); g.fillRect(5, 0, 8, 2); g.fillRect(4, 2, 10, 2);
    g.fillStyle(hatS, 1); g.fillRect(4, 4, 10, 1);
    g.fillStyle(skin, 1); g.fillRect(6, 5, 6, 7); g.fillStyle(skinS, 1); g.fillRect(6, 11, 6, 1);
    g.fillStyle(0x2e2620, 1); g.fillRect(5, 5, 1, 3); g.fillRect(12, 5, 1, 3);
    g.fillStyle(eye, 1); g.fillRect(7, 8, 1, 1); g.fillRect(10, 8, 1, 1);
    g.fillStyle(0x7a3b34, 1); g.fillRect(8, 10, 2, 1);
    g.fillStyle(skin, 1); g.fillRect(8, 12, 2, 1);
    g.fillStyle(jk, 1); g.fillRect(4, 13, 10, 11);
    g.fillStyle(jkD, 1); g.fillRect(4, 13, 1, 11); g.fillRect(13, 13, 1, 11);
    g.fillStyle(apron, 1); g.fillRect(8, 14, 2, 9);
    g.fillStyle(jk, 1); g.fillRect(3, 14, 1, 8); g.fillRect(14, 14, 1, 8);
    g.fillStyle(skin, 1); g.fillRect(3, 22, 1, 2); g.fillRect(14, 22, 1, 2);
    g.fillStyle(pants, 1); g.fillRect(5, 24, 3, 4); g.fillRect(10, 24, 3, 4);
    g.fillStyle(shoe, 1); g.fillRect(5, 27, 3, 1); g.fillRect(10, 27, 3, 1);
    if (pose === 'cook') {
      g.fillStyle(jk, 1); g.fillRect(14, 16, 2, 2); g.fillStyle(skin, 1); g.fillRect(16, 16, 1, 2);
      g.fillStyle(metal, 1); g.fillRect(16, 14, 1, 3); g.fillStyle(bowl, 1); g.fillRect(17, 13, 1, 2);
    } else if (pose === 'serve') {
      g.fillStyle(jk, 1); g.fillRect(2, 16, 2, 3); g.fillRect(14, 16, 2, 3);
      g.fillStyle(skin, 1); g.fillRect(3, 18, 2, 2); g.fillRect(13, 18, 2, 2);
    } else if (pose === 'talk') {
      g.fillStyle(jk, 1); g.fillRect(14, 9, 1, 6); g.fillStyle(skin, 1); g.fillRect(14, 8, 2, 2);
    }
  }
  // 苏晚（囚犯 / 核心角色）：坐姿 + 平静 / 警戒 / 愤怒 / 犹豫 / 进食反应 / 关键线索反应
  function drawSu(g, expr) {
    const hair = 0x2e2620, hairHi = 0x4a3a30, skin = 0xe8b98a, skinS = 0xcf9c72, eye = 0x1a1410,
      white = 0xf2efe6, uni = 0xa66a3a, uniDk = 0x6e3f23, uniHi = 0xc08a55, tear = 0x9fd0ff,
      mouth = 0x7a3b34, open = 0x2a1410, flush = 0xc06a4a;
    g.clear();
    g.fillStyle(hair, 1); g.fillRect(6, 2, 10, 3); g.fillRect(5, 4, 12, 3); g.fillRect(5, 6, 2, 6); g.fillRect(15, 6, 2, 6);
    g.fillStyle(skin, 1); g.fillRect(7, 6, 8, 8); g.fillStyle(skinS, 1); g.fillRect(7, 13, 8, 1);
    g.fillStyle(hair, 1); g.fillRect(6, 5, 10, 2);
    g.fillStyle(skin, 1); g.fillRect(9, 14, 4, 1);
    g.fillStyle(uni, 1); g.fillRect(4, 15, 14, 11); g.fillStyle(uniHi, 1); g.fillRect(5, 15, 12, 1);
    g.fillStyle(uniDk, 1); g.fillRect(4, 24, 14, 3); g.fillStyle(uni, 1); g.fillRect(3, 16, 2, 8); g.fillRect(17, 16, 2, 8);
    g.fillStyle(skin, 1); g.fillRect(3, 23, 2, 2); g.fillRect(17, 23, 2, 2);
    g.fillStyle(uniDk, 1); g.fillRect(9, 15, 4, 1);
    if (expr === 'calm') {
      g.fillStyle(eye, 1); g.fillRect(9, 9, 1, 1); g.fillRect(12, 9, 1, 1); g.fillStyle(mouth, 1); g.fillRect(10, 12, 2, 1);
    } else if (expr === 'alert') {
      g.fillStyle(eye, 1); g.fillRect(9, 8, 2, 2); g.fillRect(12, 8, 2, 2); g.fillStyle(hairHi, 1); g.fillRect(9, 7, 2, 1); g.fillRect(12, 7, 2, 1);
      g.fillStyle(open, 1); g.fillRect(10, 12, 2, 1);
    } else if (expr === 'angry') {
      g.fillStyle(hairHi, 1); g.fillRect(8, 8, 2, 1); g.fillRect(9, 7, 1, 1); g.fillStyle(hairHi, 1); g.fillRect(13, 8, 2, 1); g.fillRect(12, 7, 1, 1);
      g.fillStyle(eye, 1); g.fillRect(9, 9, 1, 1); g.fillRect(12, 9, 1, 1);
      g.fillStyle(mouth, 1); g.fillRect(10, 12, 2, 1); g.fillStyle(hairHi, 1); g.fillRect(9, 11, 1, 1); g.fillStyle(hairHi, 1); g.fillRect(13, 11, 1, 1);
      g.fillStyle(flush, 1); g.fillRect(8, 11, 1, 1); g.fillRect(14, 11, 1, 1);
    } else if (expr === 'hesitant') {
      g.fillStyle(eye, 1); g.fillRect(10, 9, 1, 1); g.fillRect(13, 9, 1, 1); g.fillStyle(mouth, 1); g.fillRect(11, 12, 1, 1);
    } else if (expr === 'eat') {
      g.fillStyle(hairHi, 1); g.fillRect(9, 9, 2, 1); g.fillStyle(hairHi, 1); g.fillRect(12, 9, 2, 1); g.fillStyle(open, 1); g.fillRect(10, 12, 2, 1);
      g.fillStyle(skin, 1); g.fillRect(14, 12, 2, 2);
    } else if (expr === 'clue') {
      g.fillStyle(white, 1); g.fillRect(8, 8, 2, 2); g.fillRect(12, 8, 2, 2);
      g.fillStyle(eye, 1); g.fillRect(9, 9, 1, 1); g.fillRect(12, 9, 1, 1);
      g.fillStyle(hairHi, 1); g.fillRect(8, 7, 2, 1); g.fillRect(12, 7, 2, 1);
      g.fillStyle(open, 1); g.fillRect(10, 11, 2, 2); g.fillStyle(tear, 1); g.fillRect(8, 11, 1, 2); g.fillRect(14, 11, 1, 2);
      g.fillStyle(skin, 1); g.fillRect(5, 9, 2, 2); g.fillRect(15, 9, 2, 2);
    }
  }

  const SPECIAL_NAME = {
    potato_soup: '温甜米羹', pepper_egg: '微辣清汤', burnt_potato: '焦糊糖水',
    caramel_pudding: '恒温奶羹', bug_dessert: '虫形软糕', burnt: '硬粒糙米饭',
    caramel_truth: '恒温奶羹·真相', qingku: '清苦野菜粥', suitang: '碎糖面点',
    normal: '寻常料理'
  };

  // ============ Boot ============
  class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    create() {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 1, 1); g.generateTexture('white', 1, 1); g.clear();
      g.fillStyle(0xffffff, 1); g.fillRect(4, 0, 8, 5);
      g.fillStyle(0xe8b98a, 1); g.fillRect(5, 5, 6, 6);
      g.fillStyle(0x222222, 1); g.fillRect(6, 7, 1, 1); g.fillRect(9, 7, 1, 1);
      g.fillStyle(0x3a6ea5, 1); g.fillRect(3, 11, 10, 11);
      g.fillStyle(0xe8b98a, 1); g.fillRect(1, 12, 2, 6); g.fillRect(13, 12, 2, 6);
      g.generateTexture('chef', 16, 24); g.clear();
      g.fillStyle(0x222222, 1); g.fillRect(8, 0, 8, 3);
      g.fillStyle(0xe8b98a, 1); g.fillRect(8, 3, 8, 7);
      g.fillStyle(0x222222, 1); g.fillRect(9, 5, 1, 1); g.fillRect(14, 5, 1, 1);
      g.fillStyle(0xc06a2e, 1); g.fillRect(5, 11, 12, 18);
      g.fillStyle(0xe8b98a, 1); g.fillRect(5, 22, 3, 3); g.fillRect(14, 22, 3, 3);
      g.generateTexture('prisoner', 22, 30); g.clear();
      g.fillStyle(0xf2efe6, 1); g.fillRect(0, 0, 14, 6); g.fillStyle(0xcfc9bb, 1); g.fillRect(0, 5, 14, 1);
      g.generateTexture('plate', 14, 6); g.clear();
      // 背景像素瓦片（纯程序生成，无外部资源）
      const mk = (key, w, h, paint) => { const gg = this.make.graphics({ x: 0, y: 0, add: false }); paint(gg); gg.generateTexture(key, w, h); gg.destroy(); };
      mk('tile_floor', 16, 16, t => { t.fillStyle(0x23272f, 1); t.fillRect(0, 0, 16, 16); t.fillStyle(0x2b303a, 1); t.fillRect(0, 0, 8, 8); t.fillRect(8, 8, 8, 8); t.fillStyle(0x1c2027, 1); t.fillRect(2, 3, 2, 2); t.fillRect(11, 5, 2, 2); t.fillRect(6, 11, 2, 2); t.fillRect(13, 13, 2, 2); });
      mk('tile_wall', 16, 16, t => { t.fillStyle(0x2a2622, 1); t.fillRect(0, 0, 16, 16); t.fillStyle(0x3a2f28, 1); t.fillRect(1, 1, 14, 6); t.fillRect(1, 9, 14, 6); t.fillStyle(0x1a1512, 1); t.fillRect(0, 7, 16, 1); t.fillRect(0, 15, 16, 1); });
      mk('tile_metal', 16, 16, t => { t.fillStyle(0x3a414c, 1); t.fillRect(0, 0, 16, 16); t.fillStyle(0x4a525e, 1); t.fillRect(0, 0, 16, 2); t.fillRect(0, 0, 2, 16); t.fillStyle(0x23282f, 1); t.fillRect(0, 14, 16, 2); t.fillRect(14, 0, 2, 16); });
      // 角色多姿态 / 多表情纹理（程序生成，无外部资源）
      ['idle', 'cook', 'serve', 'talk'].forEach(p => { drawLin(g, p); g.generateTexture('lin_' + p, 18, 28); });
      ['calm', 'alert', 'angry', 'hesitant', 'eat', 'clue'].forEach(e => { drawSu(g, e); g.generateTexture('su_' + e, 22, 30); });
      // 像素纹理保持最近邻采样，避免关闭 pixelArt 抗锯齿后角色/瓦片被模糊
      ['white', 'chef', 'prisoner', 'plate', 'tile_floor', 'tile_wall', 'tile_metal',
        'lin_idle', 'lin_cook', 'lin_serve', 'lin_talk', 'su_calm', 'su_alert', 'su_angry', 'su_hesitant', 'su_eat', 'su_clue']
        .forEach(k => { if (this.textures.exists(k)) this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST); });
      g.destroy();
      this.scene.start('MainMenu');
    }
  }

  // ============ MainMenu ============
  class MainMenuScene extends Phaser.Scene {
    constructor() { super('MainMenu'); }
    create() {
      this.add.rectangle(W / 2, H / 2, W, H, THEME.coal);
      // 暖黄炉火光晕（冷暖对比）
      const glow = this.add.graphics();
      glow.fillStyle(THEME.hearth, 0.10); glow.fillCircle(W / 2, 250, 260);
      glow.fillStyle(THEME.hearth, 0.07); glow.fillCircle(W / 2, 250, 170);
      this.add.image(W / 2, 150, 'chef').setScale(6).setTint(0xfff1d6);
      // 标题像素框
      const tf = this.add.graphics();
      drawBevel(tf, W / 2 - 200, 222, 400, 70, 0x1a1f29, THEME.goldDk, THEME.coal, 3);
      this.add.text(W / 2, 244, '最后一道菜', { fontFamily: 'monospace', fontSize: '46px', color: '#f4d35e', fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(W / 2, 300, '第一章 · ' + window.DATA.chapterTitle, { fontFamily: 'monospace', fontSize: '22px', color: '#cdbfa0' }).setOrigin(0.5);
      this.add.text(W / 2, 345, '你做的不是饭，是审问。', { fontFamily: 'monospace', fontSize: '15px', color: '#8b94a7' }).setOrigin(0.5);
      this.mkBtn(W / 2, 420, 240, 52, '进入厨房', () => this.scene.start('Kitchen'));
      this.add.text(W / 2, H - 18, 'WASD 移动 · E 交互 · 底部按钮操作 · M 静音', { fontFamily: 'monospace', fontSize: '12px', color: '#5a6275' }).setOrigin(0.5);
    }
    mkBtn(x, y, w, h, label, cb) {
      const r = this.add.rectangle(x, y, w, h, 0x2f3a4d).setInteractive({ useHandCursor: true }).setStrokeStyle(2, THEME.goldDk);
      this.add.text(x, y, label, { fontFamily: 'monospace', fontSize: '18px', color: '#e8eef7' }).setOrigin(0.5);
      r.on('pointerover', () => { r.setFillStyle(0x3d5a85); r.setStrokeStyle(2, THEME.gold); });
      r.on('pointerout', () => { r.setFillStyle(0x2f3a4d); r.setStrokeStyle(2, THEME.goldDk); });
      r.on('pointerdown', () => cb());
    }
  }

  // ============ Kitchen（核心）============
  class KitchenScene extends Phaser.Scene {
    constructor() { super('Kitchen'); }
    create() {
      const D = window.DATA;
      // 苏晚章节：恒温奶羹高潮解锁条件（运行时仅改内存，不改 data.js 文件）
      const _rcp = D.dialogues && D.dialogues.r_caramel_pudding;
      if (_rcp && _rcp.choices && _rcp.choices[0]) _rcp.choices[0].requires = ['high_trust_guilt'];
      this.state = {
        day: 1, stats: Object.assign({}, D.prisoner.startingStats), flags: {}, clues: [],
        talkedToday: false, cookedToday: false, dayPunish: false
      };
      this.mode = 'idle';
      this.muted = false;
      this.locked = false;
      this.cook = { ingredients: [], method: null, plating: null, overcook: false };
      this.startPos = { x: 330, y: 380 };
      this.overlayItems = [];
      this.bottomObjs = [];
      this.leftObjs = [];
      this.fxTimer = null;

      this.drawLayout();
      // 角色（程序生成的多姿态 / 多表情像素图）
      this.player = this.add.image(this.startPos.x, this.startPos.y, 'lin_idle').setScale(2.2).setDepth(8);
      this.prisoner = this.add.image(840, 300, 'su_calm').setScale(2.4).setDepth(3);
      this.suLocked = false;
      this.emote = this.add.text(840, 256, '😐', { fontSize: '20px' }).setOrigin(0.5).setDepth(9);
      this.plate = this.add.image(this.startPos.x, this.startPos.y - 18, 'plate').setScale(1.8).setDepth(9).setVisible(false);
      this.foodBlob = this.add.image(0, 0, 'white').setDisplaySize(12, 12).setDepth(10).setVisible(false);
      // 灶台上的锅
      this.pot = this.add.rectangle(300, 345, 34, 18, 0x3a3f4a).setDepth(7).setStrokeStyle(2, 0x222631);

      // 顶栏状态条
      this.buildTopBar();
      // 左侧档案
      this.buildLeftPanel();
      // 底部栏背景（像素斜角面板）
      const bb = this.add.graphics().setDepth(29);
      drawBevel(bb, 232, 432, W - 232, 108, THEME.panel, THEME.panelHi, THEME.panelLo, 2);
      // 过场
      this.fadeRect = this.add.rectangle(W / 2, H / 2, W, H, 0x05060a, 0).setDepth(200).setVisible(false);

      // 输入
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys('W,A,S,D,E,SPACE,M');
      this.input.keyboard.on('keydown-M', () => { this.muted = !this.muted; this.toast(this.muted ? '已静音' : '已开启音效'); });

      this.refreshHUD();
      this.updateMood();
      this.renderBottomIdle();
      // 第一天开场（查看档案即获得“第一条线索：时间矛盾”）
      const lines = [D.narration.intro, ...D.narration.d1_open];
      this.showNarration(lines, () => { this.addClue('clue_timeline'); this.renderBottomIdle(); });
    }

    // ---------- 布局绘制 ----------
    drawLayout() {
      // 舞台底色（煤炭黑）
      this.add.rectangle(W / 2, H / 2, W, H, THEME.coal).setDepth(0);
      // 地板（石质瓦片）
      this.add.tileSprite(596, 239, W - 232, 386, 'tile_floor').setDepth(0).setAlpha(0.92);
      // 牢房砖墙
      this.add.tileSprite(830, 240, 260, 360, 'tile_wall').setDepth(2).setAlpha(0.9);
      // 左栏背景（铁灰像素面板）
      const lg = this.add.graphics().setDepth(0);
      drawBevel(lg, 0, 46, 232, H - 46, THEME.panel, THEME.panelHi, THEME.panelLo, 2);
      // 顶栏（金属深条）
      const tg = this.add.graphics().setDepth(40);
      drawBevel(tg, 0, 0, W, 46, 0x10141c, THEME.metalHi, THEME.coal, 2);
      // 暖黄炉火光晕（冷暖对比，置于灶台区域后方）
      const glow = this.add.graphics().setDepth(1);
      glow.fillStyle(THEME.hearth, 0.10); glow.fillCircle(300, 360, 120);
      // 灶台（金属面板 + 火热）
      const sg = this.add.graphics().setDepth(6);
      drawBevel(sg, 268, 348, 68, 44, THEME.metal, THEME.metalHi, THEME.metalLo, 2);
      sg.fillStyle(THEME.coal, 1); sg.fillRect(282, 356, 16, 12); sg.fillRect(308, 356, 16, 12);
      sg.fillStyle(THEME.hearth, 1); sg.fillRect(285, 359, 10, 6); sg.fillRect(311, 359, 10, 6);
      // 料理台（金属）
      const cg = this.add.graphics().setDepth(6);
      drawBevel(cg, 232, 298, 44, 16, THEME.metal, THEME.metalHi, THEME.metalLo, 2);
      // 床
      const bed = this.add.graphics().setDepth(2);
      drawBevel(bed, 888, 370, 64, 28, 0x4a3b2a, 0x6b513a, 0x2a2118, 2);
      // 牢栏
      const bars = this.add.graphics().setDepth(4);
      bars.fillStyle(0x8b94a7, 1);
      for (let x = 706; x < 958; x += 24) bars.fillRect(x, 60, 5, 360);
      bars.fillRect(700, 60, 260, 6); bars.fillRect(700, 414, 260, 6);
      bars.fillStyle(0x23262e, 1); bars.fillRect(712, 280, 36, 54); // 送餐窗口
      // 区域提示
      this.zoneStove = this.add.text(302, 408, '灶台', { fontFamily: 'monospace', fontSize: '12px', color: '#6b7280' }).setOrigin(0.5).setDepth(1);
      this.zoneCell = this.add.text(840, 430, '牢房窗口', { fontFamily: 'monospace', fontSize: '12px', color: '#6b7280' }).setOrigin(0.5).setDepth(1);
    }

    // ---------- 顶栏 ----------
    buildTopBar() {
      this.add.text(12, 14, '第 1/3 天  ' + window.DATA.prisoner.name + '·' + window.DATA.prisoner.crime, { fontFamily: 'monospace', fontSize: '15px', color: '#f4d35e' }).setDepth(41).setName('dayText');
      this.statBars = {};
      let x = 360;
      ['trust', 'fear', 'anger', 'guilt', 'suspicion'].forEach(k => {
        this.add.text(x, 8, STAT_NAME[k], { fontFamily: 'monospace', fontSize: '11px', color: '#cfe0f5' }).setDepth(41);
        const bg = this.add.rectangle(x, 28, 70, 9, THEME.panelLo).setOrigin(0, 0.5).setDepth(41);
        const fill = this.add.rectangle(x + 1, 28, 10, 7, STAT_COLOR[k]).setOrigin(0, 0.5).setDepth(42);
        this.statBars[k] = fill;
        x += 92;
      });
      this.clueText = this.add.text(W - 12, 14, '线索 0', { fontFamily: 'monospace', fontSize: '14px', color: '#9fd0ff' }).setOrigin(1, 0).setDepth(41);
    }

    // ---------- 左侧档案 ----------
    buildLeftPanel() {
      this.leftTitle = this.add.text(12, 56, '— 犯人档案 —', { fontFamily: 'monospace', fontSize: '16px', color: '#f4d35e' }).setDepth(41);
      this.avatar = this.add.image(40, 110, 'su_calm').setScale(1.6).setDepth(41);
      this.leftBody = this.add.text(72, 84, '', { fontFamily: 'monospace', fontSize: '12px', color: '#cfe0f5', wordWrap: { width: 150, useAdvancedWrap: true } }).setDepth(41);
      this.leftKw = this.add.text(12, 150, '', { fontFamily: 'monospace', fontSize: '12px', color: '#9fd0ff', wordWrap: { width: 208, useAdvancedWrap: true } }).setDepth(41);
      this.leftClueTitle = this.add.text(12, 250, '— 已知线索 —', { fontFamily: 'monospace', fontSize: '14px', color: '#ffd76a' }).setDepth(41);
      this.leftClues = this.add.text(12, 274, '', { fontFamily: 'monospace', fontSize: '12px', color: '#e8eef7', wordWrap: { width: 208, useAdvancedWrap: true } }).setDepth(41);
      this.updateArchive();
    }
    updateArchive() {
      const p = window.DATA.prisoner, s = this.state.stats;
      const emo = this.emoLabel();
      this.leftBody.setText(
        p.name + '  ' + p.age + '岁\n罪名：' + p.crime + '\n受害者：' + p.victim + '\n案发：' + p.time + '\n当前情绪：' + emo
      );
      const kw = [];
      const f = this.state.flags;
      const has = id => this.state.clues.indexOf(id) >= 0;
      if (f.suwan_family_secret) { kw.push('弟弟'); kw.push('苏屿'); }
      if (f.suwan_truth_break) kw.push('顶罪');
      if (has('C003') || f.suwan_truth_break) kw.push('包庇');
      if (has('C003') || this.state.day >= 2) kw.push('判决');
      if (has('clue_signal') || f.suwan_truth_break) kw.push('监狱长');
      if (has('clue_signal')) { kw.push('父亲'); kw.push('失踪'); }
      this.leftKw.setText('关键词：' + (kw.length ? kw.join('、') : '（暂无）'));
      const cs = this.state.clues;
      this.leftClues.setText(cs.length ? cs.map(id => '· ' + window.DATA.clues[id].name).join('\n') : '（还没有线索）');
    }
    emoLabel() {
      const s = this.state.stats;
      if (s.anger > 60) return '愤怒😠';
      if (s.fear > 55) return '恐惧😨';
      if (s.trust > 45) return '平静🙂';
      if (s.guilt > 55) return '忧郁😔';
      return '冷漠😐';
    }

    // ---------- 底部栏（按模式渲染）----------
    clearBottom() { this.bottomObjs.forEach(o => o.destroy()); this.bottomObjs = []; }
    bAdd(o) { o.setDepth(32); this.bottomObjs.push(o); return o; }
    bText(x, y, t, size, color, origin) {
      return this.bAdd(this.add.text(x, y, t, { fontFamily: 'monospace', fontSize: (size || 14) + 'px', color: color || '#d6e0ee', align: 'left', wordWrap: { width: W - 260, useAdvancedWrap: true } }).setOrigin(origin || 0, 0));
    }
    bBtn(x, y, w, h, label, cb, opts) {
      opts = opts || {};
      const base = opts.color || 0x2f3a4d, hover = 0x3d5a85, press = 0x4a6a9a;
      const r = this.bAdd(this.add.rectangle(x, y, w, h, base).setStrokeStyle(2, THEME.goldDk).setInteractive({ useHandCursor: !opts.disabled }));
      const t = this.bAdd(this.add.text(x, y, label, { fontFamily: 'monospace', fontSize: (opts.size || 14) + 'px', color: '#e8eef7', align: 'center', wordWrap: { width: Math.max(w - 10, 24), useAdvancedWrap: true } }).setOrigin(0.5));
      if (!opts.disabled) {
        r.on('pointerover', () => { r.setFillStyle(hover); r.setStrokeStyle(2, THEME.gold); });
        r.on('pointerout', () => { r.setFillStyle(base); r.setStrokeStyle(2, THEME.goldDk); r.y = y; t.y = y; });
        r.on('pointerdown', () => { r.setFillStyle(press); r.setStrokeStyle(2, THEME.gold); r.y = y + 1; t.y = y + 1; this.sfx('click'); cb(); });
        r.on('pointerup', () => { r.setFillStyle(hover); r.y = y; t.y = y; });
      } else { r.setFillStyle(0x1a1e26); t.setColor('#6b7280'); r.setStrokeStyle(2, 0x33373f); r.disableInteractive(); }
      return { r, t };
    }

    renderBottomIdle() {
      this.mode = 'idle';
      this.suLocked = false;
      this.setLinPose('idle');
      this.emote.setVisible(true);
      this.clearBottom();
      this.updateMood();
      const canEnd = this.state.talkedToday && this.state.cookedToday;
      this.bText(248, 444, '【第 ' + this.state.day + ' 天】看档案(左) → 对话 → 做饭 → 送餐 → 看反应 → 理线索 → 结束当天', 13, '#8b94a7');
      const by = 478;
      this.bBtn(300, by, 130, 40, '与苏晚对话', () => this.openTalk());
      this.bBtn(440, by, 130, 40, '去灶台做饭', () => this.openCooking());
      this.bBtn(580, by, 110, 40, '案件板', () => this.openCaseBoard());
      this.bBtn(760, by, 170, 40, canEnd ? '结束今天 ✓' : '结束今天', () => this.endDay(),
        { color: canEnd ? 0x2f6b3a : 0x55303a });
    }

    // ---------- 对话（底部栏）----------
    openTalk() {
      this.state.talkedToday = true;
      this.openDialogue('d' + this.state.day + '_talk', () => this.renderBottomIdle());
    }
    openDialogue(nodeId, onDone) {
      this.clearBottom();
      this.mode = 'dialogue';
      this.setLinPose('talk');
      this.suLocked = false;
      this.dialogueOnDone = onDone;
      this.renderNode(nodeId);
    }
    renderNode(id) {
      if (!id || id === '__end__') { if (this.dialogueOnDone) this.dialogueOnDone(); return; }
      const node = window.DATA.dialogues[id];
      if (!node) { if (this.dialogueOnDone) this.dialogueOnDone(); return; }
      this.clearBottom();
      // 角色表情 / 状态表现（仅视觉，不改对话路由或判定）
      const suP = this.suPoseForNode(id);
      if (suP) {
        this.suLocked = true; this.setSuPose(suP);
        this.emote.setVisible(true).setText({ clue: '😱', eat: '😋', angry: '😠', alert: '😰' }[suP]);
      } else { this.suLocked = false; this.emote.setVisible(true); this.updateMood(); }
      // 对话背板（像素斜角面板）
      const db = this.add.graphics().setDepth(30);
      drawBevel(db, 232, 430, W - 232, 110, 0x12161e, THEME.metalHi, THEME.coal, 2);
      this.bottomObjs.push(db);
      const sp = node.speaker === '苏晚' ? '#ff9d6c' : (node.speaker === '系统' ? '#7e879a' : '#9fd0ff');
      this.bText(248, 444, node.speaker, 14, sp);
      this.bText(248, 466, node.text, 15, '#e8eef7');
      const choices = node.choices || [];
      // 多选项横向排布
      const cw = Math.min(220, (W - 280) / choices.length);
      let x = 248 + cw / 2;
      choices.forEach(ch => {
        const need = ch.requires || [];
        const ok = need.every(f => this.state.flags[f]);
        this.bBtn(x, 512, cw - 8, 22, ok ? ch.text : ch.text + '（未满足）', () => {
          if (!ok) return; this.applyChoice(ch); this.renderNode(ch.next);
        }, { disabled: !ok, size: 12 });
        x += cw;
      });
    }
    applyChoice(ch) {
      if (ch.effects) this.applyEffects(ch.effects);
      if (ch.set) ch.set.forEach(f => { this.state.flags[f] = true; if (f === 'penaltyUsed') this.state.dayPunish = true; if (window.DATA.clues[f]) this.addClue(f); });
      this.refreshHUD();
    }

    // ---------- 烹饪 ----------
    openCooking() {
      this.cook = { ingredients: [], method: null, plating: null, overcook: false };
      this.mode = 'cooking';
      this.setLinPose('cook');
      this.clearBottom();
      this.renderCooking();
    }
    renderCooking() {
      this.clearBottom();
      this.clearOverlay();
      // 全屏遮罩式烹饪台（替代原底部拥挤面板，彻底解决按钮越界）
      const ov = this.add.rectangle(W / 2, H / 2, W, H, 0x05060a, 0.92).setDepth(100);
      const boxG = this.add.graphics().setDepth(101);
      drawBevel(boxG, W / 2 - 360, H / 2 - 220, 720, 440, 0x161b24, THEME.metalHi, THEME.coal, 3);
      const title = this.add.text(W / 2, H / 2 - 198, '—— 烹饪台 ——', { fontFamily: 'monospace', fontSize: '22px', color: '#f4d35e' }).setOrigin(0.5).setDepth(102);
      const hint = this.add.text(W / 2, H / 2 - 174, '选食材(≤3) → 做法 → 摆盘 → 火候 → 开始烹饪', { fontFamily: 'monospace', fontSize: '13px', color: '#9aa3b2' }).setOrigin(0.5).setDepth(102);
      this.overlayItems.push(ov, boxG, title, hint);
      const px = W / 2 - 360, py = H / 2 - 220;
      // ---- 食材区 3×3 卡片网格 ----
      this.overlayItems.push(this.add.text(px + 20, py + 40, '食材（普通≤3，惩罚类独占）', { fontFamily: 'monospace', fontSize: '14px', color: '#9fd0ff' }).setDepth(102));
      const cardW = 200, cardH = 38, gap = 8;
      const gridX = px + (720 - (cardW * 3 + gap * 2)) / 2;
      const gridY = py + 62;
      window.DATA.ingredients.forEach((ing, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const cx = gridX + col * (cardW + gap);
        const cy = gridY + row * (cardH + gap);
        const sel = this.cook.ingredients.includes(ing.id);
        this.cookCard(cx, cy, cardW, cardH, ing.name, ing.punishment ? '惩罚食材' : (ing.tags[0] || ''), ing.color, sel, () => this.toggleIngredient(ing.id));
      });
      // ---- 做法 ----
      const mY = gridY + 3 * (cardH + gap) + 6;
      this.overlayItems.push(this.add.text(px + 20, mY, '做法', { fontFamily: 'monospace', fontSize: '14px', color: '#9fd0ff' }).setDepth(102));
      const mCardW = 165, mCardH = 34;
      const mStartX = px + (720 - (mCardW * 4 + gap * 3)) / 2;
      window.DATA.methods.forEach((m, i) => {
        const sel = this.cook.method === m.id;
        this.cookCard(mStartX + i * (mCardW + gap), mY + 18, mCardW, mCardH, m.name, m.desc || m.tag, 0x4a6a8a, sel, () => { this.cook.method = m.id; this.renderCooking(); });
      });
      // ---- 摆盘 ----
      const pY = mY + 18 + mCardH + 10;
      this.overlayItems.push(this.add.text(px + 20, pY, '摆盘', { fontFamily: 'monospace', fontSize: '14px', color: '#9fd0ff' }).setDepth(102));
      window.DATA.platings.forEach((p, i) => {
        const sel = this.cook.plating === p.id;
        this.cookCard(mStartX + i * (mCardW + gap), pY + 18, mCardW, mCardH, p.name, p.tag, 0x8a6a4a, sel, () => { this.cook.plating = p.id; this.renderCooking(); });
      });
      // ---- 火候 toggle ----
      const fY = pY + 18 + mCardH + 10;
      this.overlayItems.push(this.add.text(px + 20, fY, '火候', { fontFamily: 'monospace', fontSize: '14px', color: '#9fd0ff' }).setDepth(102));
      const fireSel = this.cook.overcook;
      this.cookCard(px + 20, fY + 18, 180, 30, fireSel ? '过高（炒焦）' : '火候正常', fireSel ? '将触发焦糊线' : '正常烹饪', fireSel ? 0x5a2f3a : 0x2b3a55, fireSel, () => { this.cook.overcook = !this.cook.overcook; this.renderCooking(); });
      // ---- 底部：取消 + 开始烹饪 ----
      const can = this.cook.ingredients.length > 0 && this.cook.method && this.cook.plating;
      this.cookCard(px + 20, py + 400, 130, 32, '取消', '返回', 0x55303a, false, () => { this.stopFx(); this.clearOverlay(); this.renderBottomIdle(); });
      this.cookCard(px + 720 - 200, py + 392, 180, 44, '开始烹饪 →', can ? '开始制作' : '请选齐食材/做法/摆盘', can ? 0x2f6b3a : 0x1a1e26, false, () => { if (can) this.startCook(); }, !can);
      this.startBenchFx();
    }
    cookCard(x, y, w, h, label, sub, color, sel, cb, disabled) {
      const base = disabled ? 0x1a1e26 : (sel ? 0x2f5a3a : 0x232a38);
      const hover = disabled ? 0x1a1e26 : (sel ? 0x3a6b4a : 0x2d3a4d);
      const stroke = sel ? THEME.gold : THEME.goldDk;
      const r = this.add.rectangle(x + w / 2, y + h / 2, w, h, base).setStrokeStyle(2, stroke).setInteractive({ useHandCursor: !disabled }).setDepth(102);
      const sw = this.add.rectangle(x + 7, y + h / 2, 6, h - 8, color).setOrigin(0, 0.5).setDepth(103);
      const t = this.add.text(x + 20, y + h / 2 - (sub ? 6 : 0), (sel ? '✓ ' : '') + label, { fontFamily: 'monospace', fontSize: '13px', color: disabled ? '#6b7280' : (sel ? '#9fe0a0' : '#e8eef7') }).setOrigin(0, 0.5).setDepth(103);
      let st = null;
      if (sub) st = this.add.text(x + 20, y + h / 2 + 8, sub, { fontFamily: 'monospace', fontSize: '10px', color: '#8b94a7' }).setOrigin(0, 0.5).setDepth(103);
      this.overlayItems.push(r, sw, t);
      if (st) this.overlayItems.push(st);
      if (!disabled) {
        r.on('pointerover', () => { r.setFillStyle(hover); r.setStrokeStyle(2, THEME.gold); });
        r.on('pointerout', () => { r.setFillStyle(base); r.setStrokeStyle(2, stroke); });
        r.on('pointerdown', () => { r.y += 1; this.sfx('click'); cb(); });
        r.on('pointerup', () => { r.y -= 1; });
      } else { r.disableInteractive(); }
    }
    toggleIngredient(id) {
      const ing = window.DATA.ingredients.find(i => i.id === id);
      if (this.cook.ingredients.includes(id)) this.cook.ingredients = this.cook.ingredients.filter(x => x !== id);
      else if (ing.punishment) this.cook.ingredients = [id];
      else {
        const norm = this.cook.ingredients.filter(x => !window.DATA.ingredients.find(i => i.id === x).punishment);
        if (norm.length >= 3) { this.toast('普通食材最多 3 种'); return; }
        this.cook.ingredients.push(id);
      }
      this.renderCooking();
    }
    startBenchFx() {
      this.stopFx();
      // 案板上的食材
      this.benchIcons && this.benchIcons.forEach(o => o.destroy());
      this.benchIcons = [];
      this.cook.ingredients.forEach((id, i) => {
        const ing = window.DATA.ingredients.find(x => x.id === id);
        const sq = this.add.rectangle(250 + i * 22, 320, 16, 16, ing.color).setDepth(7).setStrokeStyle(1, 0x000000);
        this.benchIcons.push(sq);
      });
      // 锅的蒸汽/火
      const method = window.DATA.methods.find(m => m.id === this.cook.method);
      this.fxTimer = this.time.addEvent({ delay: 220, loop: true, callback: () => {
        if (this.cook.overcook) this.spawnFx(300, 340, 'smoke');
        else if (method && (method.id === 'fry' || method.id === 'deepfry')) this.spawnFx(300, 340, 'fire');
        else if (this.cook.method) this.spawnFx(300, 340, 'steam');
      } });
    }
    stopFx() { if (this.fxTimer) { this.fxTimer.remove(); this.fxTimer = null; } }
    spawnFx(x, y, type) {
      const color = type === 'fire' ? 0xff7a2f : (type === 'smoke' ? 0x33363d : 0xcfe6ff);
      const c = this.add.circle(x + Phaser.Math.Between(-6, 6), y, type === 'fire' ? 4 : 5, color, 0.7).setDepth(7);
      this.tweens.add({ targets: c, y: y - (type === 'fire' ? 14 : 30), alpha: 0, scale: 0.4, duration: type === 'fire' ? 380 : 700, onComplete: () => c.destroy() });
    }
    startCook() {
      this.stopFx();
      this.clearOverlay();
      this.sfx('cook');
      const special = this.computeSpecial();
      const base = this.computeBaseEffects();
      const name = this.nameFor(special);
      const r = { name, special, base, tags: this.collectTags() };
      this.cook.result = r;
      // 过程演出 ~0.9s
      let n = 0;
      const proc = this.time.addEvent({ delay: 200, repeat: 3, callback: () => { this.spawnFx(300, 340, this.cook.overcook ? 'smoke' : (this.cook.method === 'fry' || this.cook.method === 'deepfry' ? 'fire' : 'steam')); n++; if (n === 4) this.showResult(r); } });
    }
    computeSpecial() {
      const ings = SORT(this.cook.ingredients), m = this.cook.method, pl = this.cook.plating;
      if (SAME(ings, SORT(['milk', 'potato'])) && m === 'stew') return 'potato_soup';
      if (SAME(ings, SORT(['fish', 'potato'])) && m === 'stew') return 'qingku';
      if (SAME(ings, SORT(['chili', 'egg'])) && m === 'fry') return 'pepper_egg';
      if (SAME(ings, SORT(['chili', 'potato'])) && m === 'fry' && this.cook.overcook) return 'burnt_potato';
      // 恒温奶羹：需信任≥20 且 愧疚≥15 才触发高潮（caramel_truth）
      if (SAME(ings, SORT(['honey', 'milk', 'egg'])) && m === 'bake') return (this.state.stats.trust >= 20 && this.state.stats.guilt >= 15) ? 'caramel_truth' : 'caramel_pudding';
      if (SAME(ings, SORT(['bread', 'honey'])) && m === 'bake' && pl !== 'ugly') return 'suitang';
      if (SAME(ings, SORT(['bread', 'honey'])) && pl === 'ugly') return 'bug_dessert';
      if (this.cook.overcook) return 'burnt';
      return null;
    }
    collectTags() {
      const tags = [];
      this.cook.ingredients.forEach(id => { const i = window.DATA.ingredients.find(x => x.id === id); tags.push(...i.tags); });
      const m = window.DATA.methods.find(x => x.id === this.cook.method); if (m) tags.push(m.tag === '温暖' ? '安慰' : m.tag === '柔软' ? '安全感' : '刺激');
      const p = window.DATA.platings.find(x => x.id === this.cook.plating); if (p) tags.push(p.tag === '轻蔑' ? '恐惧' : p.tag === '诱导' ? '虚假温柔' : '中性');
      if (this.cook.overcook) tags.push('失败');
      return tags;
    }
    computeBaseEffects() {
      const eff = {}; const add = e => { for (const k in e) eff[k] = (eff[k] || 0) + e[k]; };
      this.collectTags().forEach(t => { if (window.DATA.tagEffects[t]) add(window.DATA.tagEffects[t]); });
      return eff;
    }
    nameFor(special) {
      if (special) return SPECIAL_NAME[special];
      const m = window.DATA.methods.find(x => x.id === this.cook.method);
      return m.name + this.cook.ingredients.map(id => window.DATA.ingredients.find(i => i.id === id).name).join('');
    }
    showResult(r) {
      this.mode = 'result';
      this.clearBottom();
      // 结果面板背板（收回 540 画布内）
      const rb = this.add.graphics().setDepth(30);
      drawBevel(rb, 232, 428, W - 232, 104, 0x12161e, THEME.metalHi, THEME.coal, 2);
      this.bottomObjs.push(rb);
      const ingCol = this.blend(this.cook.ingredients);
      const isSpecial = r.special && r.special.indexOf('burnt') < 0;
      this.bText(248, 440, (isSpecial ? '✦ ' : '') + '料理完成：' + r.name, 18, isSpecial ? '#f4d35e' : '#d6e0ee');
      this.bText(248, 464, '标签：' + (r.tags.join('、') || '无'), 13, '#9fd0ff');
      const effStr = STAT_KEYS.filter(k => r.base[k]).map(k => STAT_NAME[k] + (r.base[k] > 0 ? '+' : '') + r.base[k]).join('  ');
      this.bText(248, 484, '心理影响：' + (effStr || '（微妙）'), 13, '#ffb3a0');
      // 舞台上的料理图标
      this.foodBlob.setTint(ingCol).setVisible(true).setPosition(this.pot.x, this.pot.y - 6);
      // 特殊料理光环（旋转金环 + 粒子）
      if (isSpecial) {
        const halo = this.add.graphics().setDepth(6);
        halo.lineStyle(2, 0xf4d35e, 0.7); halo.strokeCircle(0, 0, 16);
        halo.lineStyle(1, 0xffe8a0, 0.5); halo.strokeCircle(0, 0, 22);
        halo.setPosition(this.pot.x, this.pot.y - 6);
        this.bottomObjs.push(halo);
        this.tweens.add({ targets: halo, angle: 360, duration: 3000, repeat: -1 });
        // 脉冲缩放
        this.tweens.add({ targets: halo, scale: { from: 1, to: 1.15 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        // 飘升粒子
        for (let i = 0; i < 5; i++) {
          const px = this.pot.x + Phaser.Math.Between(-10, 10), py = this.pot.y - 6;
          const sp = this.add.circle(px, py, 2, 0xffe8a0, 0.8).setDepth(7);
          this.bottomObjs.push(sp);
          this.tweens.add({ targets: sp, y: py - 24, alpha: 0, scale: 0.3, duration: 900 + i * 120, delay: i * 150, repeat: -1, repeatDelay: 400, onComplete: function () { /* loop via repeat */ } });
        }
      }
      this.bBtn(310, 512, 150, 30, '送餐 →', () => this.deliver(r));
      this.bBtn(480, 512, 110, 30, '重做', () => this.openCooking());
    }
    blend(ids) {
      let r = 0, g = 0, b = 0, n = 0;
      ids.forEach(id => { const c = window.DATA.ingredients.find(i => i.id === id).color; r += (c >> 16) & 255; g += (c >> 8) & 255; b += c & 255; n++; });
      if (!n) return 0xcfc9bb;
      return (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n);
    }
    deliver(r) {
      this.clearBottom();
      this.setLinPose('serve');
      if (!r.special) this.applyEffects(r.base); // 关键料理由反应节点控制数值
      this.state.flags.fear_high = this.state.stats.fear >= 55;
      this.sfx('cook');
      // 送餐光晕脉冲（暖色径向闪烁，增强仪式感）
      const glow = this.add.graphics().setDepth(5);
      glow.fillStyle(THEME.hearth, 0.25); glow.fillCircle(this.player.x, this.player.y, 60);
      glow.fillStyle(THEME.hearth, 0.12); glow.fillCircle(this.player.x, this.player.y, 100);
      this.tweens.add({ targets: glow, alpha: { from: 1, to: 0 }, duration: 700, onComplete: () => glow.destroy() });
      this.foodBlob.setVisible(true).setPosition(this.pot.x, this.pot.y - 6);
      this.plate.setVisible(true).setPosition(this.player.x, this.player.y - 18);
      this.locked = true;
      this.tweens.add({
        targets: [this.player, this.plate, this.foodBlob], x: 712, duration: 800, ease: 'Sine.inOut',
        onUpdate: () => { this.plate.setPosition(this.player.x, this.player.y - 18); this.foodBlob.setPosition(this.player.x + 12, this.player.y - 26); },
        onComplete: () => {
          this.player.setFlipX(true);
          this.tweens.add({ targets: [this.plate, this.foodBlob], x: 840, y: 300, duration: 420, onComplete: () => {
            this.sfx('click');
            const REACT_SPECIALS = ['potato_soup', 'pepper_egg', 'burnt_potato', 'caramel_pudding', 'caramel_truth', 'bug_dessert', 'burnt', 'normal', 'qingku', 'suitang'];
            const node = (r.special && REACT_SPECIALS.indexOf(r.special) >= 0) ? 'r_' + r.special : 'react_' + this.categoryOf(r.tags);
            this.openDialogue(node, () => {
              this.tweenBack(r);
              this.state.cookedToday = true;
              if (r.special && (r.special.indexOf('burnt') >= 0 || r.tags.includes('恐惧') && this.cook.ingredients.some(id => window.DATA.ingredients.find(i => i.id === id).punishment))) {
                this.state.dayPunish = true; this.state.flags.penaltyUsed = true;
                if (this.state.day === 1 && !this.state.flags.discovered_signal) { this.state.flags.discovered_signal = true; this.addClue('clue_signal'); }
              }
              this.refreshHUD();
            });
          } });
        }
      });
    }
    categoryOf(tags) {
      if (tags.includes('记忆') || tags.includes('诱导') || tags.includes('虚假温柔')) return 'memory';
      if (tags.includes('痛苦') || tags.includes('挑衅') || tags.includes('清醒') || tags.includes('刺激') || tags.includes('疼痛')) return 'stimulate';
      if (tags.includes('家庭') || tags.includes('安慰') || tags.includes('童年') || tags.includes('温柔') || tags.includes('安全感')) return 'reward';
      if (tags.includes('羞辱') || tags.includes('恐惧') || tags.includes('拒绝')) return 'penalty';
      return 'neutral';
    }
    tweenBack(r) {
      this.plate.setVisible(false); this.foodBlob.setVisible(false);
      this.locked = true;
      this.tweens.add({ targets: this.player, x: this.startPos.x, y: this.startPos.y, duration: 700, ease: 'Sine.inOut',
        onComplete: () => { this.locked = false; this.renderBottomIdle(); } });
    }

    // ---------- 案件板（全屏遮罩，两列卡片布局，可点击查看详情）----------
    openCaseBoard() {
      this.clearOverlay();
      this.locked = true;
      this.detailItems = [];
      const TYPE_META = {
        '真实': { col: '#9fe0a0', tag: '【真实】' },
        '假': { col: '#ff8a8a', tag: '【假】' },
        '半真半假': { col: '#ffd76a', tag: '【半真半假】' },
        '情感': { col: '#9fd0ff', tag: '【情感】' },
        '时间线': { col: '#c0a0ff', tag: '【时间线】' },
        '主线': { col: '#ff9d6c', tag: '【主线】' },
        // 兼容旧类型（若 data.js 仍用 key/fake/normal，避免线索显示为空）
        'key': { col: '#ffd76a', tag: '【关键】' },
        'fake': { col: '#ff8a8a', tag: '【疑似假】' },
        'normal': { col: '#9fd0ff', tag: '【普通】' }
      };
      const ov = this.add.rectangle(W / 2, H / 2, W, H, 0x05060a, 0.95).setDepth(100);
      const boxG = this.add.graphics().setDepth(101);
      drawBevel(boxG, W / 2 - 360, H / 2 - 220, 720, 440, 0x161b24, THEME.metalHi, THEME.coal, 3);
      const title = this.add.text(W / 2, 78, '— 案件板 —', { fontFamily: 'monospace', fontSize: '22px', color: '#f4d35e' }).setOrigin(0.5).setDepth(102);
      const hint = this.add.text(W / 2, 108, '点击线索查看详情；第 3 天可在“结束今天”后得出结论。', { fontFamily: 'monospace', fontSize: '13px', color: '#9aa3b2' }).setOrigin(0.5).setDepth(102);
      this.overlayItems.push(ov, boxG, title, hint);
      const cs = this.state.clues;
      if (!cs.length) {
        const t = this.add.text(W / 2, 270, '（还没有线索。去做饭、对话，撬开她的嘴。）', { fontFamily: 'monospace', fontSize: '15px', color: '#7e879a' }).setOrigin(0.5).setDepth(102);
        this.overlayItems.push(t);
      } else {
        const cardW = 320, cardH = 42, gapY = 46, startY = 138, colX = [150, 500];
        cs.forEach((id, i) => {
          const c = window.DATA.clues[id];
          const meta = TYPE_META[c.type] || { col: '#9fd0ff', tag: '【' + (c.type || '未知') + '】' };
          const col = meta.col, tag = meta.tag;
          const cx = colX[i % 2], cy = startY + Math.floor(i / 2) * gapY;
          const card = this.add.rectangle(cx + cardW / 2, cy + cardH / 2, cardW, cardH, 0x1b212c)
            .setStrokeStyle(1, 0x39435a).setDepth(102).setInteractive({ useHandCursor: true });
          const t1 = this.add.text(cx + 10, cy + 5, tag + c.name, { fontFamily: 'monospace', fontSize: '13px', color: col, wordWrap: { width: cardW - 20, useAdvancedWrap: true } }).setDepth(103);
          const short = c.desc.length > 20 ? c.desc.slice(0, 20) + '…' : c.desc;
          const t2 = this.add.text(cx + 10, cy + 23, short, { fontFamily: 'monospace', fontSize: '10px', color: '#b9c2d2', wordWrap: { width: cardW - 20, useAdvancedWrap: true } }).setDepth(103);
          card.on('pointerover', () => card.setStrokeStyle(2, 0xf4d35e));
          card.on('pointerout', () => card.setStrokeStyle(1, 0x39435a));
          card.on('pointerdown', () => this.showClueDetail(c, meta));
          this.overlayItems.push(card, t1, t2);
        });
      }
      const close = this.add.rectangle(W / 2, 500, 140, 40, 0x2b3a55).setInteractive({ useHandCursor: true }).setDepth(102);
      const ct = this.add.text(W / 2, 500, '关闭', { fontFamily: 'monospace', fontSize: '16px', color: '#e8eef7' }).setOrigin(0.5).setDepth(103);
      close.on('pointerover', () => close.setFillStyle(0x3d5a85));
      close.on('pointerout', () => close.setFillStyle(0x2b3a55));
      close.on('pointerdown', () => { this.clearOverlay(); this.locked = false; });
      this.overlayItems.push(close, ct);
    }
    showClueDetail(c, meta) {
      this.clearDetail();
      const ov = this.add.rectangle(W / 2, H / 2, W, H, 0x05060a, 0.9).setDepth(120).setInteractive();
      const dbox = this.add.graphics().setDepth(121);
      drawBevel(dbox, W / 2 - 280, H / 2 - 130, 560, 260, THEME.paper, 0xf3eede, THEME.ink, 3);
      const tt = this.add.text(W / 2, H / 2 - 100, meta.tag + c.name, { fontFamily: 'monospace', fontSize: '18px', color: meta.col, fontStyle: 'bold' }).setOrigin(0.5).setDepth(122);
      const dt = this.add.text(W / 2, H / 2 - 64, c.desc, { fontFamily: 'monospace', fontSize: '14px', color: '#3a342a', wordWrap: { width: 500, useAdvancedWrap: true }, align: 'center', lineSpacing: 4 }).setOrigin(0.5, 0).setDepth(122);
      const back = this.add.rectangle(W / 2, H / 2 + 100, 140, 38, THEME.rustDk).setStrokeStyle(2, THEME.goldDk).setInteractive({ useHandCursor: true }).setDepth(122);
      const bt = this.add.text(W / 2, H / 2 + 100, '返回', { fontFamily: 'monospace', fontSize: '16px', color: '#f3ead0' }).setOrigin(0.5).setDepth(123);
      back.on('pointerover', () => { back.setFillStyle(THEME.rust); back.setStrokeStyle(2, THEME.gold); });
      back.on('pointerout', () => { back.setFillStyle(THEME.rustDk); back.setStrokeStyle(2, THEME.goldDk); });
      back.on('pointerdown', () => this.clearDetail());
      this.detailItems.push(ov, dbox, tt, dt, back, bt);
    }
    clearDetail() { if (this.detailItems) { this.detailItems.forEach(o => o.destroy()); this.detailItems = []; } }
    clearOverlay() {
      this.overlayItems.forEach(o => o.destroy()); this.overlayItems = [];
      if (this.detailItems) { this.detailItems.forEach(o => o.destroy()); this.detailItems = []; }
    }

    // ---------- 每日开场 / 结束 ----------
    showNarration(lines, onDone) {
      this.clearOverlay();
      this.locked = true;
      let i = 0;
      const ov = this.add.rectangle(W / 2, H / 2, W, H, 0x05060a, 0.82).setDepth(100);
      const box = this.add.rectangle(W / 2, H / 2, 760, 200, 0x10141c).setStrokeStyle(2, 0x39435a).setDepth(101);
      const sp = this.add.text(180, 230, '', { fontFamily: 'monospace', fontSize: '17px', color: '#9fd0ff' }).setDepth(102);
      const tx = this.add.text(180, 262, '', { fontFamily: 'monospace', fontSize: '17px', color: '#e8eef7', wordWrap: { width: 700, useAdvancedWrap: true } }).setDepth(102);
      const next = this.add.text(800, 410, '继续 ▶', { fontFamily: 'monospace', fontSize: '15px', color: '#f4d35e' }).setOrigin(1, 0.5).setDepth(103).setInteractive({ useHandCursor: true });
      this.overlayItems.push(ov, box, sp, tx, next);
      const show = () => {
        const line = lines[i];
        sp.setText(line.speaker); sp.setColor(line.speaker === '林烬' ? '#ff9d6c' : (line.speaker === '旁白' ? '#7e879a' : '#9fd0ff'));
        tx.setText(line.text);
      };
      next.on('pointerdown', () => {
        i++;
        if (i >= lines.length) { this.clearOverlay(); this.locked = false; if (onDone) onDone(); }
        else { this.sfx('click'); show(); }
      });
      show();
    }
    endDay() {
      const cb = () => {
        if (this.state.day >= window.DATA.totalDays) { this.submitConclusion(); return; }
        this.state.day++; this.state.talkedToday = false; this.state.cookedToday = false; this.state.dayPunish = false;
        const lines = this.state.day === 2 ? [window.DATA.narration.d2_open]
          : this.state.day === 3 ? [window.DATA.narration.d3_open] : [];
        this.transition(() => this.showNarration(lines, () => this.renderBottomIdle()), '第 ' + this.state.day + ' 天');
      };
      let narr;
      if (this.state.day === 1) narr = this.state.dayPunish ? window.DATA.narration.d1_end_punish : window.DATA.narration.d1_end_tame;
      else if (this.state.day === 2) { narr = window.DATA.narration.d2_end; this.state.flags.discovered_2315 = true; this.addClue('clue_2315'); }
      else narr = window.DATA.narration.d3_end;
      this.showNarration([narr], cb);
    }
    transition(cb, titleCard) {
      this.fadeRect.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: this.fadeRect, alpha: 1, duration: 320, onComplete: () => {
        if (titleCard) {
          const card = this.add.text(W / 2, H / 2, titleCard, { fontFamily: 'monospace', fontSize: '36px', color: '#f4d35e', fontStyle: 'bold' }).setOrigin(0.5).setDepth(210).setAlpha(0);
          this.tweens.add({ targets: card, alpha: 1, duration: 400, hold: 700, onComplete: () => {
            this.tweens.add({ targets: card, alpha: 0, duration: 300, onComplete: () => { card.destroy(); cb(); this._fadeBack(); } });
          } });
        } else {
          cb();
          this._fadeBack();
        }
      } });
    }
    _fadeBack() {
      this.tweens.add({ targets: this.fadeRect, alpha: 0, duration: 320, delay: 60, onComplete: () => this.fadeRect.setVisible(false) });
    }
    submitConclusion() {
      const f = this.state.flags, st = this.state.stats;
      let ending;
      if (st.fear >= 80 && st.anger >= 70) ending = 'penalty_lose';
      else if (this.state.clues.includes('clue_signal') && f.discovered_2315 && f.made_caramel && st.trust >= 40) ending = 'hidden';
      else {
        const hasTruth = window.DATA.truthClues.every(c => this.state.clues.includes(c));
        if (hasTruth && st.trust >= 50) ending = 'truth';
        else if (st.trust >= 50) ending = 'wrong_belief';
        else ending = 'silence';
      }
      this.scene.start('Ending', { endingId: ending, stats: st, flags: f, clues: this.state.clues });
    }

    // ---------- 工具 ----------
    applyEffects(e) {
      for (const k in e) {
        if (STAT_KEYS.includes(k)) {
          const old = this.state.stats[k];
          this.state.stats[k] = clamp(this.state.stats[k] + e[k], 0, 100);
          const delta = this.state.stats[k] - old;
          if (delta !== 0) this._floatStat(k, delta);
        }
      }
      this.refreshHUD();
    }
    refreshHUD() {
      const s = this.state.stats;
      // 苏晚章节：恒温奶羹高潮解锁判定（trust>=20 & guilt>=15）
      this.state.flags.high_trust_guilt = s.trust >= 20 && s.guilt >= 15;
      this.children.getByName('dayText').setText('第 ' + this.state.day + '/3 天  ' + window.DATA.prisoner.name + '·' + window.DATA.prisoner.crime);
      ['trust', 'fear', 'anger', 'guilt', 'suspicion'].forEach(k => {
        this.statBars[k].width = Math.max(4, (s[k] / 100) * 68);
      });
      this.clueText.setText('线索 ' + this.state.clues.length);
      this.updateMood(); this.updateArchive();
    }
    setLinPose(p) { if (this.textures.exists('lin_' + p)) this.player.setTexture('lin_' + p); }
    setSuPose(e) { if (this.textures.exists('su_' + e)) this.prisoner.setTexture('su_' + e); }
    suPoseForNode(id) {
      if (!id) return null;
      if (id.indexOf('climax') >= 0) return 'clue';
      if (id === 'r_caramel_truth' || id === 'd3_b' || id === 'd1_c') return 'clue';
      if (id === 'r_burnt' || id.indexOf('react_penalty') >= 0) return 'angry';
      if (id === 'r_bug_dessert') return 'alert';
      if (id.indexOf('react_') === 0) return 'eat';
      if (id.charAt(0) === 'r' && id.length > 1) return 'eat';
      return null;
    }
    updateMood() {
      const s = this.state.stats;
      let emo = '😐', pose = 'calm';
      if (s.anger > 60) { emo = '😠'; pose = 'angry'; }
      else if (s.fear > 55) { emo = '😨'; pose = 'alert'; }
      else if (s.suspicion > 55) { emo = '😟'; pose = 'alert'; }
      else if (s.trust > 45) { emo = '🙂'; pose = 'calm'; }
      else if (s.guilt > 55) { emo = '😔'; pose = 'hesitant'; }
      this.emote.setText(emo);
      if (!this.suLocked) this.setSuPose(pose);
    }
    addClue(id) {
      if (this.state.clues.includes(id)) return;
      this.state.clues.push(id); this.sfx('clue');
      this.toast('✦ 新线索：' + window.DATA.clues[id].name, 'clue'); this.refreshHUD();
    }
    toast(msg, type) {
      type = type || 'info';
      if (!this._toastStack) this._toastStack = [];
      const colors = { info: '#f4d35e', clue: '#9fe0a0', warn: '#ff8a8a' };
      const col = colors[type] || colors.info;
      const idx = this._toastStack.length;
      const baseY = 88 + idx * 30;
      const t = this.add.text(W / 2, baseY, msg, { fontFamily: 'monospace', fontSize: '15px', color: col, backgroundColor: '#000000dd', padding: { x: 12, y: 6 } }).setOrigin(0.5).setDepth(210).setAlpha(0);
      this._toastStack.push(t);
      this.tweens.add({ targets: t, alpha: 1, duration: 180, onComplete: () => {
        this.tweens.add({ targets: t, y: baseY - 12, duration: 1300, delay: 500, onComplete: () => {
          this.tweens.add({ targets: t, alpha: 0, duration: 380, onComplete: () => { t.destroy(); this._toastStack = this._toastStack.filter(x => x !== t); this._relayoutToasts(); } });
        } });
      } });
    }
    _relayoutToasts() {
      if (!this._toastStack) return;
      this._toastStack.forEach((t, i) => { if (t && t.active) t.setY(88 + i * 30); });
    }
    _floatStat(k, delta) {
      const bar = this.statBars[k];
      if (!bar) return;
      const x = bar.x + 34, y = bar.y - 4;
      const col = delta > 0 ? '#7ee787' : '#ff8a8a';
      const sign = delta > 0 ? '+' : '';
      const t = this.add.text(x, y, sign + delta, { fontFamily: 'monospace', fontSize: '13px', color: col, fontStyle: 'bold' }).setOrigin(0.5).setDepth(220).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 120, onComplete: () => {
        this.tweens.add({ targets: t, y: y - 24, alpha: 0, duration: 720, delay: 180, onComplete: () => t.destroy() });
      } });
    }
    sfx(type) {
      try {
        if (this.muted) return;
        if (!this.actx) this.actx = new (window.AudioContext || window.webkitAudioContext)();
        const o = this.actx.createOscillator(), g = this.actx.createGain();
        o.connect(g); g.connect(this.actx.destination);
        const now = this.actx.currentTime;
        if (type === 'click') { o.type = 'square'; o.frequency.setValueAtTime(420, now); g.gain.setValueAtTime(0.04, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.08); o.start(now); o.stop(now + 0.09); }
        else if (type === 'cook') { o.type = 'sawtooth'; o.frequency.setValueAtTime(130, now); o.frequency.exponentialRampToValueAtTime(60, now + 0.3); g.gain.setValueAtTime(0.05, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.35); o.start(now); o.stop(now + 0.36); }
        else if (type === 'clue') { o.type = 'triangle'; o.frequency.setValueAtTime(660, now); o.frequency.setValueAtTime(880, now + 0.1); g.gain.setValueAtTime(0.05, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.25); o.start(now); o.stop(now + 0.26); }
      } catch (e) { }
    }

    // ---------- 更新 ----------
    update(time, dt) {
      if (this.locked || this.mode === 'cooking' || this.mode === 'result') return;
      const sp = 0.22 * dt;
      let dx = 0, dy = 0;
      if (this.cursors.left.isDown || this.keys.A.isDown) dx -= sp;
      if (this.cursors.right.isDown || this.keys.D.isDown) dx += sp;
      if (this.cursors.up.isDown || this.keys.W.isDown) dy -= sp;
      if (this.cursors.down.isDown || this.keys.S.isDown) dy += sp;
      if (dx || dy) {
        this.player.x = clamp(this.player.x + dx, 244, 940);
        this.player.y = clamp(this.player.y + dy, 60, 420);
        if (dx < 0) this.player.setFlipX(true); else if (dx > 0) this.player.setFlipX(false);
      }
      const near = this.nearZone();
      this.zoneStove.setColor(near === 'stove' ? '#f4d35e' : '#6b7280');
      this.zoneCell.setColor(near === 'cell' ? '#f4d35e' : '#6b7280');
      if (Phaser.Input.Keyboard.JustDown(this.keys.E) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
        if (near === 'stove') this.openCooking();
        else if (near === 'cell') this.openTalk();
      }
    }
    nearZone() {
      const d1 = Phaser.Math.Distance.Between(this.player.x, this.player.y, 302, 370);
      const d2 = Phaser.Math.Distance.Between(this.player.x, this.player.y, 840, 330);
      if (d1 < 60) return 'stove';
      if (d2 < 80) return 'cell';
      return null;
    }
  }

  // ============ Ending ============
  class EndingScene extends Phaser.Scene {
    constructor() { super('Ending'); }
    init(data) { this.data2 = data; }
    create() {
      const d = this.data2, E = window.DATA.endings[d.endingId];
      this.add.rectangle(W / 2, H / 2, W, H, THEME.coal);
      // 暖黄炉火光晕
      const glow = this.add.graphics();
      glow.fillStyle(THEME.hearth, 0.08); glow.fillCircle(W / 2, 200, 300);
      // 像素外框
      const g = this.add.graphics();
      drawBevel(g, 60, 40, W - 120, H - 80, 0x12161e, THEME.metalHi, THEME.coal, 3);
      // 徽章+标题：弹入
      const title = this.add.text(W / 2, 80, E.badge + '  ' + E.title, { fontFamily: 'monospace', fontSize: '34px', color: '#f4d35e', fontStyle: 'bold' }).setOrigin(0.5).setScale(0.3).setAlpha(0);
      this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 500, ease: 'Back.out' });
      // 正文：delay 弹入
      const body = this.add.text(W / 2, 180, E.text, { fontFamily: 'monospace', fontSize: '17px', color: '#e8eef7', align: 'center', wordWrap: { width: 780, useAdvancedWrap: true }, lineSpacing: 6 }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: body, alpha: 1, duration: 600, delay: 350 });
      const s = d.stats;
      const stat = this.add.text(W / 2, 360, '最终心理：信任 ' + s.trust + ' · 恐惧 ' + s.fear + ' · 愤怒 ' + s.anger + ' · 愧疚 ' + s.guilt + ' · 警觉 ' + s.suspicion,
        { fontFamily: 'monospace', fontSize: '14px', color: '#9aa3b2' }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: stat, alpha: 1, duration: 500, delay: 700 });
      const clue = this.add.text(W / 2, 392, '收集线索：' + (d.clues.length ? d.clues.map(id => window.DATA.clues[id].name).join('，') : '无'),
        { fontFamily: 'monospace', fontSize: '13px', color: '#7e879a', wordWrap: { width: 780, useAdvancedWrap: true }, align: 'center' }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: clue, alpha: 1, duration: 500, delay: 850 });
      // 再玩按钮：delay 弹入
      const r = this.add.rectangle(W / 2, 460, 200, 46, THEME.rustDk).setStrokeStyle(2, THEME.goldDk).setAlpha(0);
      const rt = this.add.text(W / 2, 460, '再玩一次', { fontFamily: 'monospace', fontSize: '18px', color: '#f3ead0' }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: [r, rt], alpha: 1, duration: 400, delay: 1100, onComplete: () => r.setInteractive({ useHandCursor: true }) });
      r.on('pointerover', () => { r.setFillStyle(THEME.rust); r.setStrokeStyle(2, THEME.gold); });
      r.on('pointerout', () => { r.setFillStyle(THEME.rustDk); r.setStrokeStyle(2, THEME.goldDk); });
      r.on('pointerdown', () => this.scene.start('Kitchen'));
    }
  }

  const config = {
    type: Phaser.AUTO, width: W, height: H, parent: 'game', backgroundColor: '#0a0c12',
    pixelArt: false, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, MainMenuScene, KitchenScene, EndingScene]
  };
  window.addEventListener('load', () => { new Phaser.Game(config); });
})();
