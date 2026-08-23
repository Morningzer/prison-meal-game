const assert = require('node:assert/strict');

const content = require('../data/hengwen_content.json');

assert.equal(content.totalDays, 5);
assert.deepEqual(
  content.prisoners.map((prisoner) => prisoner.id),
  ['su_wan', 'laotu', 'baizhu', 'aying', 'zhong'],
);
assert.deepEqual(
  Object.keys(content.endings).sort(),
  ['ending_collapse', 'ending_hidden', 'ending_peace', 'ending_silence', 'ending_truth'],
);
assert.equal(content.ingredients.length, 9);
assert.equal(content.methods.length, 4);
assert.equal(content.platings.length, 4);

console.log('content export test passed');
