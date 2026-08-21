/*
 * 《最后一道菜 · 第一章：温汤裹谎》数据层
 * 对应官方设计文档「苏晚 / 灰区307」章节。结构等价于方案里的 JSON 数据文件。
 * 通过 window.DATA 暴露，普通 <script> 加载（双击 index.html 即可运行）。
 *
 * 兼容性说明（给下一步改 game.js 参考）：
 *  - 所有字段名、数组结构、食材 id、special 料理 id、对话节点 id、narration 键名、结局 id
 *    均与现有 game.js 调用方式保持一致，故本文件可单独替换而不改游戏逻辑。
 *  - game.js 硬编码引用的线索 id（create 自动授予 clue_timeline、第二天结束授予 clue_2315、
 *    惩罚路径授予 clue_signal）在本文件仍保留，仅内容改写为苏晚章节，确保无点击报错。
 *  - 结局沿用 penalty_lose / hidden / truth / wrong_belief / silence 五个 id，仅把标题改写为
 *    用户确认的 4 个版本（温和理解 / 惩罚失控 / 不完整真相 / 隐藏线索）。
 */
(function () {
  'use strict';

  // 标签 -> 心理数值影响（与旧版保持一致，被 game.js computeBaseEffects 使用）
  const TAG_EFFECTS = {
    家庭: { trust: 8, guilt: 4, anger: -4 },
    安慰: { trust: 8, anger: -5, fear: -4 },
    童年: { trust: 6, guilt: 5 },
    温柔: { trust: 6, anger: -4 },
    朴素: { trust: 3, anger: -2 },
    中性: { trust: 2 },
    安全感: { trust: 4, fear: -4 },
    记忆: { guilt: 6, suspicion: 3 },
    诱导: { guilt: 4, suspicion: 5, trust: -2 },
    虚假温柔: { guilt: 4, suspicion: 5 },
    痛苦: { fear: 6, anger: 5 },
    挑衅: { anger: 7, fear: 4 },
    清醒: { fear: 2, guilt: 3 },
    疼痛: { anger: 5, fear: 3 },
    羞辱: { fear: 8, anger: 6, suspicion: 6, trust: -8 },
    恐惧: { fear: 8, anger: 4, suspicion: 5 },
    玩笑: { fear: 3, anger: -3 },
    拒绝: { anger: 6, suspicion: 4, trust: -6 },
    厌恶: { anger: 5, fear: 4 },
    刺激: { anger: 5, fear: 4 },
    油腻: { anger: 3 },
    失败: { anger: 4, fear: 4, guilt: 3 },
    失神: { guilt: 4, fear: 2 }
  };

  const METHODS = [
    { id: 'stew', name: '炖煮', tag: '柔软', desc: '柔软、治愈' },
    { id: 'bake', name: '烘烤', tag: '温暖', desc: '稳定、温暖' },
    { id: 'fry', name: '煎制', tag: '刺激', desc: '刺激、疼痛' },
    { id: 'deepfry', name: '油炸', tag: '刺激', desc: '刺激、油腻' }
  ];

  const PLATINGS = [
    { id: 'neat', name: '整齐', tag: '认真' },
    { id: 'plain', name: '朴素', tag: '平淡' },
    { id: 'fancy', name: '精致', tag: '诱导' },
    { id: 'ugly', name: '恐怖造型', tag: '轻蔑' }
  ];

  // 食材（第一章：保留旧 id 以兼容 game.js 的 computeSpecial 匹配规则，仅改写显示名与标签）
  const INGREDIENTS = [
    { id: 'bread', name: '软米', tags: ['家庭', '安慰', '童年'], color: 0xe8d8a0, punishment: false },
    { id: 'milk', name: '牛奶', tags: ['家庭', '安慰', '温柔'], color: 0xf2efe6, punishment: false },
    { id: 'egg', name: '冰糖', tags: ['安慰', '温柔', '记忆'], color: 0xeae3c8, punishment: false },
    { id: 'potato', name: '温水', tags: ['朴素', '中性', '安全感'], color: 0xbfd8e0, punishment: false },
    { id: 'chili', name: '辣椒', tags: ['痛苦', '挑衅', '清醒'], color: 0xc0392b, punishment: false },
    { id: 'fish', name: '野菜', tags: ['朴素', '中性', '失败'], color: 0x6f8f5a, punishment: false },
    { id: 'honey', name: '蜂蜜', tags: ['记忆', '诱导', '虚假温柔'], color: 0xe0a93b, punishment: false },
    { id: 'bug_candy', name: '虫形软糕', tags: ['羞辱', '恐惧', '玩笑'], color: 0x7bbf6a, punishment: true },
    { id: 'nail_pastry', name: '糙米', tags: ['失败', '朴素', '中性'], color: 0xc9b27a, punishment: false }
  ];

  // 8 道关键料理（special 用于烹饪系统匹配，与 game.js computeSpecial 规则对应）
  const KEY_DISHES = [
    { id: 'wentian', name: '温甜米羹', ingredients: ['milk', 'potato'], method: 'stew',
      tags: ['安慰', '家庭', '温柔'], special: 'potato_soup',
      note: '牛奶+温水+炖煮 → 苏晚鼻尖微动，身体不再紧绷。解锁【亲人甜食执念】' },
    { id: 'qingku', name: '清苦野菜粥', ingredients: ['fish', 'potato'], method: 'stew',
      tags: ['朴素', '中性', '失败'], special: null,
      note: '野菜+温水+炖煮（暂未纳入特殊匹配，下阶段补） → 苏晚自言“该吃苦”。解锁【自我惩罚倾向】' },
    { id: 'jiaohu', name: '焦糊糖水', ingredients: ['chili', 'potato'], method: 'fry', overcook: true,
      tags: ['失败', '羞辱', '痛苦'], special: 'burnt_potato',
      note: '辣椒+温水+煎制+过高火候 → 苏晚自认“不配温柔”。解锁【对温柔的极度自卑】' },
    { id: 'yingli', name: '硬粒糙米饭', ingredients: ['nail_pastry'], method: '', overcook: true,
      tags: ['失败', '生硬'], special: 'burnt',
      note: '糙米+过高火候（敷衍） → 关闭部分温柔支线。' },
    { id: 'weila', name: '微辣清汤', ingredients: ['chili', 'egg'], method: 'fry',
      tags: ['刺激', '挑衅', '清醒'], special: 'pepper_egg',
      note: '辣椒+冰糖+煎制 → 打破清淡习惯，触发应激。解锁【刻意克制的喜好】' },
    { id: 'suitang', name: '碎糖面点', ingredients: ['bread', 'honey'], method: 'bake',
      tags: ['安慰', '温柔'], special: null,
      note: '软米+蜂蜜+烘烤（暂未纳入特殊匹配，下阶段补） → 小幅提升信任，无深层真相。' },
    { id: 'chongxing', name: '虫形软糕', ingredients: ['bread', 'honey'], method: 'bake', plating: 'ugly',
      tags: ['恐惧', '羞辱', '玩笑'], special: 'bug_dessert',
      note: '软米+蜂蜜+恐怖造型 → 虚构惩罚型，大幅提升恐惧，易得假线索【监狱规则篡改真相】' },
    { id: 'hengwen', name: '恒温奶羹', ingredients: ['honey', 'milk', 'egg'], method: 'bake',
      tags: ['童年', '家庭', '温柔'], special: 'caramel_pudding',
      note: '蜂蜜+牛奶+冰糖+烘烤 → 关键剧情料理，开启章节高潮（需信任≥20 且 愧疚≥15）。' },
    { id: 'hengwen_truth', name: '恒温奶羹·真相', ingredients: ['honey', 'milk', 'egg'], method: 'bake',
      tags: ['童年', '家庭', '温柔'], special: 'caramel_truth',
      note: '恒温奶羹满足条件时的深化版本，直接引出顶罪真相。' }
  ];

  const PRISONER = {
    id: 'S001',
    name: '苏晚', age: 24, crime: '过失重伤·包庇',
    victim: '无（替弟顶罪）', place: '灰区307', time: '—',
    publicStory: '档案记载：疏忽操作器械致人重伤，事后包庇同伴，态度良好，判处终身监禁。',
    realSecret: '真实无罪。弟弟苏屿（17岁）撞见监狱长篡改档案的现场被控制；苏晚为换取弟弟的人身安全与正常人生，自愿顶罪。',
    personality: ['隐忍', '温顺', '护短', '自卑', '极度愧疚'],
    weaknesses: ['提及亲人时剧烈波动', '过度认罪', '对温柔极度自卑'],
    dislikes: ['焦苦', '生硬', '辛辣', '怪异造型料理'],
    startingStats: { trust: 10, fear: 15, anger: 5, guilt: 40, suspicion: 35, hunger: 20 }
  };

  // 线索（类型统一为：真实 / 假 / 半真半假 / 情感 / 时间线 / 主线）
  // 注：clue_timeline / clue_2315 / clue_signal 为 game.js 硬编码引用，保留其 id 仅改写内容。
  const CLUES = {
    clue_timeline: { id: 'clue_timeline', type: '情感', name: '初见·灰区307', desc: '灰区307，犯人苏晚。广播称无特殊管控，允许定制料理。' },
    C001: { id: 'C001', type: '情感', name: '沉默的自保', desc: '“吵闹没用，安静才能少惹麻烦。”——她在用沉默自保。' },
    C002: { id: 'C002', type: '情感', name: '过往甜汤记忆', desc: '她总给别人做甜汤，可惜没人再喝了。' },
    C003: { id: 'C003', type: '半真半假', name: '过度认罪的反常', desc: '认罪过于干脆，远超普通罪犯，恐有隐情。' },
    C004: { id: 'C004', type: '情感', name: '亲人甜食执念', desc: '温甜米羹勾起她对亲人甜食的记忆。' },
    C005: { id: 'C005', type: '情感', name: '自我惩罚倾向', desc: '清苦野菜粥下她自言“本就该吃苦”。' },
    C006: { id: 'C006', type: '情感', name: '对温柔的极度自卑', desc: '焦糊糖水让她自认“不配温柔”。' },
    C007: { id: 'C007', type: '情感', name: '刻意克制的喜好', desc: '微辣清汤打破清淡习惯，她明显应激。' },
    C008: { id: 'C008', type: '真实', name: '顶罪保护无辜者', desc: '她替真正的无辜者顶罪——那人只是撞见不该看的东西。' },
    C009: { id: 'C009', type: '真实', name: '被保护的弟弟', desc: '她唯一的弟弟苏屿，17岁，被监狱长胁迫。' },
    clue_2315: { id: 'clue_2315', type: '主线', name: 'C010 监狱长的口头协议', desc: '连续三次安慰料理，她私下递出碎纸条：监狱长口头协议。' },
    clue_signal: { id: 'clue_signal', type: '主线', name: 'M001 监狱规则篡改真相', desc: '规则从不讲对错，监狱长篡改判决与真相。' },
    // 以下两条为验收发现的缺失类型补全（假 / 时间线），沿用现有 CLUES 字段结构，id 不与已有冲突。
    fake_record: { id: 'fake_record', type: '假', name: '伪造的过失证词', desc: '公开档案中“过失致人重伤”的描述存在夸大与伪造痕迹，与真实伤情并不相符。' },
    timeline_conflict: { id: 'timeline_conflict', type: '时间线', name: '矛盾的时间线', desc: '案发当晚的官方记录时间，与苏屿的不在场时间存在明显矛盾。' }
  };

  // ============ 每日旁白 / 开场（林烬视角）============
  const NARRATION = {
    intro: { speaker: '旁白', text: '灰烬惩戒监狱，厨房是唯一暖黄的地方。\n你是这里唯一的厨师，林烬。你入职不为救赎别人——只为查清父亲十年前在这里的失踪。' },
    d1_open: [
      { speaker: '广播', text: '灰烬惩戒监狱，新执勤日开启。今日单人膳食对接：灰区307，犯人苏晚。无特殊管控，允许定制料理。' },
      { speaker: '艾拉', text: '（档案管理员）这是她今日的档案。记住，公开档案都删过字。' },
      { speaker: '林烬', text: '（指尖抚过老旧案板）苏晚……我看你今天能藏住多少。' }
    ],
    d2_open: { speaker: '艾拉', text: '（压低声音）冷区的人从不说软谎，他们只藏真话。\n你昨天撬开的，是她最软的那层。' },
    d3_open: [
      { speaker: '监狱长', text: '苏晚今天要转移。' },
      { speaker: '林烬', text: '转移到哪里？' },
      { speaker: '监狱长', text: '你只需要准备最后一顿饭。' },
      { speaker: '林烬', text: '最后一顿饭……那就别做得太好吃。' }
    ],
    d1_end_tame: { speaker: '旁白', text: '苏晚吃完了那碗温甜的东西。\n她没有道谢，只在餐盘边缘留了一小枚没动过的桂花——像给某个不在场的人留的位置。' },
    d1_end_punish: { speaker: '旁白', text: '苏晚没有吃那道菜。\n她把餐盘推回来时，手指在铁桌上敲了三下。走廊尽头，也传来了三下回应。' },
    d2_end: { speaker: '旁白', text: '夜里你清洗餐盘，在操作台缝隙摸到一枚陌生的黑色纽扣——纹路像极了父亲当年的工作服配件。' },
    d3_end: { speaker: '旁白', text: '黑色纽扣的纹路与监狱长办公室一致。\n你终于明白，父亲的失踪、苏晚的冤案，都被同一只手按进了灰烬里。' }
  };

  // ============ 对话图 ============
  const DIALOGUES = {

    // --- 第一天对话（3 选项可遍历 + 收尾）---
    d1_talk: {
      speaker: '苏晚', text: '（声音轻柔微弱，带着细微颤抖）我知道。这里的每个人，我都记得。谢谢你……愿意过来。',
      choices: [
        { text: '“档案写你性格很温顺，一直都这么安静吗？”', next: 'd1_a' },
        { text: '“你平时最喜欢吃什么口味的食物？”', next: 'd1_b' },
        { text: '“你对自己的判决，没有任何异议吗？”', next: 'd1_c' },
        { text: '（先默默打量这间牢房）', next: 'd1_d' }
      ]
    },
    d1_a: {
      speaker: '苏晚', text: '（指尖攥紧衣角，头更低）吵闹没有用。在这里，安静才能少惹麻烦。我不想再添麻烦了。',
      choices: [ { text: '（记下：沉默的自保）', effects: { trust: 3, suspicion: 5 }, set: ['C001'], next: 'd1_back' } ]
    },
    d1_b: {
      speaker: '苏晚', text: '（首次轻轻抬眼）甜的、温的就好。以前……我总给别人做甜汤。可惜，没人再喝了。',
      choices: [ { text: '（记下：甜汤记忆）', effects: { trust: 8, guilt: 6 }, set: ['C002'], next: 'd1_back' } ]
    },
    d1_c: {
      speaker: '苏晚', text: '（身体瞬间僵硬）没有异议。是我的错，我认罪。所有都是我该承担的。',
      choices: [ { text: '（记下：过度认罪）', effects: { trust: -6, anger: 2, guilt: 10, suspicion: 12 }, set: ['C003', 'fake_record'], next: 'd1_back' } ]
    },
    d1_d: {
      speaker: '苏晚', text: '（安静地垂着眼，等你开口）……',
      choices: [ { text: '（继续）', next: 'd1_back' } ]
    },
    d1_back: { speaker: '系统', text: '（第一天对话结束。去灶台做饭，看她的反应。）', choices: [ { text: '继续', next: '__end__' } ] },

    // --- 第二天对话 ---
    d2_talk: {
      speaker: '苏晚', text: '你看过我的档案了。',
      choices: [
        { text: '“我看过所有人的档案。”', next: 'd2_a' },
        { text: '“今天有甜的。（你妹妹也喜欢吧）”', next: 'd2_b' },
        { text: '“那就不谈家人。”', next: 'd2_c' }
      ]
    },
    d2_a: {
      speaker: '苏晚', text: '那你应该知道，我没有弟弟。',
      choices: [
        { text: '“档案里没有弟弟，但不代表你没有。”', effects: { suspicion: 10, trust: -5 }, set: ['C009', 'suwan_family_secret'], next: 'd2_back' },
        { text: '“你们连档案都能改，还有什么是真的？”', effects: { suspicion: 8, trust: -3 }, set: ['C009'], next: 'd2_back' }
      ]
    },
    d2_b: {
      speaker: '苏晚', text: '（沉默良久）……',
      choices: [ { text: '（等她开口）', effects: { fear: 8, guilt: 8 }, set: ['C002', 'suwan_family_secret'], next: 'd2_back' } ]
    },
    d2_c: {
      speaker: '苏晚', text: '你比他们聪明一点。',
      choices: [ { text: '（她愿意多说几句）', effects: { trust: 8 }, set: ['understands'], next: 'd2_back' } ]
    },
    d2_back: { speaker: '系统', text: '（第二天对话结束。）', choices: [ { text: '继续', next: '__end__' } ] },

    // --- 第三天对话 ---
    d3_talk: {
      speaker: '苏晚', text: '他们来过了。',
      choices: [
        { text: '“谁？”', next: 'd3_a' },
        { text: '“你到底在保护谁？”', next: 'd3_b' },
        { text: '（不说话，等她继续）', next: 'd3_c' }
      ]
    },
    d3_a: {
      speaker: '苏晚', text: '来收拾厨房的人。——不是这个厨房。',
      choices: [ { text: '“你到底在保护谁？”', next: 'd3_b' } ]
    },
    d3_b: {
      speaker: '苏晚', text: '我弟弟。他才17岁。监狱长说，只要我认罪，就放他走。',
      choices: [
        { text: '“所以你是替他顶罪？”', effects: { trust: 6, guilt: 4 }, set: ['C009', 'suwan_family_secret', 'timeline_conflict'], next: 'd3_back' },
        { text: '“你是在保护一个无辜的人？”', effects: { trust: 4 }, set: ['C008', 'timeline_conflict'], next: 'd3_back' }
      ]
    },
    d3_c: {
      speaker: '苏晚', text: '我弟弟。他什么都没做。',
      choices: [ { text: '（记下）', effects: { trust: 4 }, set: ['C009'], next: 'd3_back' } ]
    },
    d3_back: { speaker: '系统', text: '（第三天对话结束。去做最后一顿饭。）', choices: [ { text: '继续', next: '__end__' } ] },

    // ============ 关键料理专属反应 ============
    r_potato_soup: {
      speaker: '苏晚', text: '（鼻尖微动，身体不再紧绷）……很久没有吃到这么暖的东西了。谢谢你。',
      choices: [
        { text: '“想家了？”', effects: { trust: 4, guilt: 3 }, set: ['C004'], next: '__end__' },
        { text: '“只是普通甜汤。”', effects: { anger: 3, suspicion: 2 }, next: '__end__' }
      ]
    },
    r_pepper_egg: {
      speaker: '苏晚', text: '（微微蹙眉）你是在试探我的口味？',
      choices: [
        { text: '“只是想让你吃点热的。”', effects: { trust: 3, fear: 2 }, set: ['C007'], next: '__end__' },
        { text: '“清淡惯了，换个味？”', effects: { fear: 4, suspicion: 3 }, set: ['C007'], next: '__end__' }
      ]
    },
    r_burnt_potato: {
      speaker: '苏晚', text: '（身体一颤）是……我不值得温柔。我知道的。',
      choices: [
        { text: '“你值得。”', effects: { trust: 5, guilt: 4 }, set: ['C006'], next: '__end__' },
        { text: '（不语）', effects: { fear: 6, anger: 3 }, set: ['C006'], next: '__end__' }
      ]
    },
    r_caramel_pudding: {
      speaker: '苏晚', text: '（捧着温热的奶羹，指尖不再蜷缩）……这么暖的东西，不该出现在牢里。',
      choices: [
        { text: '“你眼底的愧疚，不是对受害者，是对另一个人，对吗？”', effects: { trust: 5 }, next: 'climax' },
        { text: '（只是静静看她吃）', effects: { trust: 5, guilt: 3 }, set: ['made_caramel'], next: '__end__' }
      ]
    },
    climax: {
      speaker: '苏晚', text: '（肩膀剧烈颤抖，首次抬头直视你，眼眶泛红）我不认罪，他会死。我认罪了，所有人都安全。我没有选择。',
      choices: [
        { text: '“你在替真正的凶手顶罪？”', effects: { trust: 10 }, set: ['C008', 'suwan_truth_break'], next: 'climax_a' },
        { text: '“你保护的人，是你的亲人？”', effects: { guilt: 15 }, set: ['C009', 'suwan_family_secret'], next: 'climax_b' },
        { text: '“你甘心一辈子背负不属于你的罪名吗？”', effects: { suspicion: -8 }, set: ['clue_signal'], next: 'climax_c' }
      ]
    },
    climax_a: { speaker: '苏晚', text: '（摇头）不是凶手……是无辜的人。他只是撞见了不该看的东西。', choices: [ { text: '（记下）', next: '__end__' } ] },
    climax_b: { speaker: '苏晚', text: '是我唯一的弟弟。他才17岁。监狱长说，只要我认罪，就放他走，保他平安。', choices: [ { text: '（记下）', next: '__end__' } ] },
    climax_c: { speaker: '苏晚', text: '（苦笑）甘心不甘心，都不重要了。这里的规则，从来都不讲对错。', choices: [ { text: '（记下）', next: '__end__' } ] },
    r_caramel_truth: {
      speaker: '苏晚', text: '（泪水滑落）你都看出来了……他是我弟弟，监狱长用他逼我认罪。',
      choices: [
        { text: '“告诉我，是谁在篡改一切？”', effects: { trust: 8, guilt: 6 }, set: ['made_caramel', 'C008', 'C009', 'clue_signal', 'suwan_family_secret', 'suwan_truth_break'], next: '__end__' }
      ]
    },
    r_bug_dessert: {
      speaker: '苏晚', text: '（向后退了一步）你觉得这样很好玩吗？',
      choices: [
        { text: '“我只是想知道你怕什么。”', next: 'r_bug_2' },
        { text: '“不好玩，但有用。”', effects: { anger: 6, fear: 4 }, next: '__end__' }
      ]
    },
    r_bug_2: {
      speaker: '苏晚', text: '（恐惧很高时脱口）……监狱长。',
      choices: [
        { text: '（记下：监狱长）', effects: { trust: -4, suspicion: 3 }, set: ['clue_signal'], next: '__end__' },
        { text: '“监狱长是谁？”（她闭口）', effects: { suspicion: 4 }, next: '__end__' }
      ]
    },
    r_normal: {
      speaker: '苏晚', text: '（平静吃完）今天的饭，没什么特别。',
      choices: [ { text: '（稳妥的一顿）', effects: { trust: 4, anger: -2 }, next: '__end__' } ]
    },
    r_burnt: {
      speaker: '苏晚', text: '（扒了两口，眉头紧锁）……你是在敷衍我？',
      choices: [
        { text: '“不好吃可以不吃。”', effects: { anger: 8, fear: 4, suspicion: 6, trust: -10 }, set: ['penaltyUsed'], next: 'react_penalty_warn' },
        { text: '（不语）', effects: { anger: 6, suspicion: 4, trust: -8 }, set: ['penaltyUsed'], next: 'react_penalty_warn' }
      ]
    },
    // 清苦野菜粥专属反应（野菜+温水+炖煮 → special 'qingku'）
    r_qingku: {
      speaker: '苏晚', text: '（先是警惕地盯住碗）这么苦的东西……你故意的？（低头尝了一口，动作忽然顿住）……是野菜。这种苦法，像我以前……（声音低下去）像家里没米时，凑合煮的那一口。',
      choices: [
        { text: '（轻声）你以前常给家里人做这个吧。', effects: { trust: 5, guilt: 4 }, set: ['C005'], next: '__end__' },
        { text: '（试探）你照顾过谁？', effects: { suspicion: 6, guilt: 3 }, set: ['C005'], next: '__end__' },
        { text: '吃苦是你的习惯，还是你觉得该受罚？', effects: { fear: 5, anger: 3 }, set: ['C005'], next: '__end__' }
      ]
    },
    // 碎糖面点专属反应（软米+蜂蜜+烘烤·非恐怖造型 → special 'suitang'）
    r_suitang: {
      speaker: '苏晚', text: '（目光落在甜点上，喉头轻轻一动）……甜的。（手指蜷了蜷，又松开）我不该碰这个。可这味道……（别过脸）你别看我。',
      choices: [
        { text: '（温和）偶尔吃一口，不算犯规。', effects: { trust: 4, guilt: 3 }, set: ['C002'], next: '__end__' },
        { text: '（试探）你以前也常做甜的给谁？', effects: { suspicion: 5, guilt: 4 }, set: ['C002'], next: '__end__' },
        { text: '（轻笑）怕甜，还是怕想起什么人？', effects: { fear: 3, suspicion: 3 }, set: ['C002'], next: '__end__' }
      ]
    },

    // ============ 通用反应（非关键组合）============
    react_reward: {
      speaker: '苏晚', text: '（闻了闻）……像家里做的。',
      choices: [ { text: '“想家了？”', effects: { trust: 4, guilt: 3 }, next: '__end__' },
        { text: '“只是普通饭。”', effects: { anger: 3, suspicion: 2 }, next: '__end__' } ]
    },
    react_memory: {
      speaker: '苏晚', text: '（蜂蜜味道让她愣住）今天是几号？',
      choices: [ { text: '“你想起谁了？”', effects: { trust: 5, guilt: 5 }, set: ['made_caramel'], next: '__end__' },
        { text: '“只是甜点。”', effects: { anger: 3, suspicion: 3 }, next: '__end__' } ]
    },
    react_stimulate: {
      speaker: '苏晚', text: '（皱眉）你是在逼我开口？',
      choices: [ { text: '“我只是厨师。”', effects: { fear: 4, anger: 3 }, next: '__end__' },
        { text: '“你怕的不是辣。”', effects: { fear: 6, suspicion: 4 }, next: '__end__' } ]
    },
    react_penalty: {
      speaker: '苏晚', text: '（盯着粗糙的饭，脸色发白）……你他妈在羞辱谁？',
      choices: [ { text: '（不说话）', effects: { anger: 8, fear: 6, suspicion: 8, trust: -10 }, set: ['penaltyUsed'], next: 'react_penalty_warn' },
        { text: '“不好吃可以不吃。”', effects: { anger: 10, fear: 4, suspicion: 6, trust: -12 }, set: ['penaltyUsed'], next: 'react_penalty_warn' } ]
    },
    react_penalty_warn: { speaker: '系统', text: '（惩罚让她更警惕，温柔路线被关，可能吐出假话。）', choices: [ { text: '继续', next: '__end__' } ] },
    react_neutral: { speaker: '苏晚', text: '（她扒了两口，没说什么。）', choices: [ { text: '继续', next: '__end__' } ] }
  };

  // ============ 结局（沿用旧 id，标题改写为用户确认的 4 版本）============
  const ENDINGS = {
    truth: {
      id: 'truth', title: '不完整真相', badge: '🔍',
      text: '你拼出了大半真相：苏晚替17岁的弟弟苏屿顶罪，监狱长以弟弟性命胁迫她认罪。\n你拿到父亲留下的黑色纽扣，却仍未触及整座监狱的暗网——真相，只露出一角。'
    },
    wrong_belief: {
      id: 'wrong_belief', title: '温和理解', badge: '⚠️',
      text: '你被苏晚的温顺表象抚慰，以为她只是个过于自责的普通犯人。\n你温和地理解了她，却错过了顶罪的核心矛盾；监狱阴谋继续藏在灰烬里，父亲的下落仍无着落。'
    },
    penalty_lose: {
      id: 'penalty_lose', title: '惩罚失控', badge: '💢',
      text: '苏晚彻底封闭内心，拒绝一切交流，终日沉默呆滞。\n你用错了料理，逼出了她的恐惧而非信任；关键证人失语，第一章线索断层，黑暗沉沦分支开启。'
    },
    silence: {
      id: 'silence', title: '沉默的灰烬', badge: '🌫️',
      text: '她吃完最后一顿饭，什么都没留下。所有属性都不高，关键料理也未触发——\n你只得到一个模糊的、不完整的真相，被锁进了灰烬里。'
    },
    hidden: {
      id: 'hidden', title: '隐藏线索', badge: '🕳️',
      text: '你进入厨房暗格，黑色纽扣的纹路与监狱长办公室一致。\n你获得父亲失踪的首个实证，与监狱长篡改判决的线索——主线阴谋，第一次在你眼前显形。'
    }
  };

  window.DATA = {
    title: '最后一道菜 · 温汤裹谎',
    subtitle: '灰烬监狱 · 厨房',
    chapterTitle: '温汤裹谎',
    totalDays: 3,
    tagEffects: TAG_EFFECTS,
    methods: METHODS,
    platings: PLATINGS,
    ingredients: INGREDIENTS,
    keyDishes: KEY_DISHES,
    prisoner: PRISONER,
    clues: CLUES,
    narration: NARRATION,
    dialogues: DIALOGUES,
    endings: ENDINGS,
    // 结局判定所需的“核心真相线索”集合（与 game.js submitConclusion 对应）
    truthClues: ['C008', 'C009', 'clue_signal']
  };
})();
