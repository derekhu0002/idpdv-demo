'use strict';
// Acceptance test for IPD 全量设计 阶段四 (1.9.3.4 / TR4A·TR5·TR6) — 架构与设计实现支撑.
//
// GIVEN the IDPDV demo intent graph and the HarmonyOS project under harmony/
// WHEN  the stage-four (stage-s4) decomposition and the delivered artifacts are inspected
// THEN  stage-s4 composes the four IPD 活动 (软件实现设计与开发 / 测试执行 / 测试评估 / 需求与设计实现评估),
//       6 软件单元 carry 实现状态=已实现 + 源码路径 (harmony/...), produced by 软件实现设计与开发,
//       测试用例 --派生--> 测试因子 --派生--> 测试结果 (tc -> tf -> tres),
//       缺陷 --派生--> 补丁 and 缺陷 --变更--> 软件单元,
//       activity outputs follow the matrix (活动→软件单元/资产 Access, 活动→需求 Realization),
//       TR4A --评审--> 软件单元, TR5/TR6 --评审--> 测试结果,
//       the harmony/ DevEco project structure and the built HAP exist,
//       and graph invariants still hold (single root view, full membership, <=15 elements/view).
//
// Run whole:      node tests/stage4_implementation_support.test.js
// Run one anchor: ARGO_TESTCASE_ANCHOR=activities|software|defect|tests|review|reqeval|project|build|grammar|invariants

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const graph = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'design', 'KG', 'SystemArchitecture.json'), 'utf8')
);
const elements = graph.elements || [];
const relationships = graph.relationships || [];
const views = graph.views || [];
const byId = new Map(elements.map((e) => [e.id, e]));
const anchor = (process.env.ARGO_TESTCASE_ANCHOR || 'all').trim();

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };
const ofType = (t) => elements.filter((e) => e.type === t);
const nameOf = (id) => (byId.get(id) || {}).name;
const relId = (type, sid, tid) =>
  relationships.find((r) => r.type === type && r.source_id === sid && r.target_id === tid);
const outs = (type, sid) => relationships.filter((r) => r.type === type && r.source_id === sid);
const ins = (type, tid) => relationships.filter((r) => r.type === type && r.target_id === tid);
const attr = (el, name) => ((el && el.attributes) || []).find((a) => a.name === name);

const S4 = 'stage-s4';
const ACTS = [
  ['act-s4-impl-design', '软件实现设计与开发'],
  ['act-s4-test-exec', '测试执行'],
  ['act-s4-test-eval', '测试评估'],
  ['act-s4-req-eval', '需求与设计实现评估'],
];
const SUS = ['su-task-model', 'su-task-repository', 'su-task-viewmodel', 'su-task-list-page', 'su-task-stats', 'su-platform-bridge'];
const TCS = ['tc-001', 'tc-002', 'tc-003', 'tc-004'];
const TFS = ['tf-001', 'tf-002', 'tf-003', 'tf-004'];
const TRES = ['tres-001', 'tres-002', 'tres-003', 'tres-004'];
const SRS = ['sr-001', 'sr-002', 'sr-003', 'sr-004'];

const UNIT_FILES = {
  'su-task-model': 'harmony/entry/src/main/ets/model/Task.ets',
  'su-task-repository': 'harmony/entry/src/main/ets/data/TaskRepository.ets',
  'su-task-viewmodel': 'harmony/entry/src/main/ets/viewmodel/TaskListViewModel.ets',
  'su-task-list-page': 'harmony/entry/src/main/ets/pages/TaskListPage.ets',
  'su-task-stats': 'harmony/entry/src/main/ets/components/TaskStats.ets',
  'su-platform-bridge': 'harmony/entry/src/main/ets/platform/PlatformBridge.ets',
};

function activitiesChecks() {
  const s4 = byId.get(S4);
  check(!!s4 && s4.type === 'IPD 阶段', 'missing IPD 阶段 stage-s4');
  for (const [id, name] of ACTS) {
    const el = byId.get(id);
    check(!!el && el.type === 'IPD 活动', `missing IPD 活动 "${name}" (${id})`);
    if (el) check(el.name === name, `活动 ${id} name expected "${name}", got "${el.name}"`);
    const c = relId('Composition', S4, id);
    check(!!c, `missing Composition stage-s4 -> ${name}`);
    if (c) check(c.source_name === nameOf(S4) && c.target_name === name, `Composition ${id} must carry source_name/target_name`);
  }
}

function softwareChecks() {
  const sus = ofType('软件单元');
  check(sus.length >= 6, `expected >=6 软件单元, got ${sus.length}`);
  for (const id of SUS) {
    const el = byId.get(id);
    check(!!el && el.type === '软件单元', `missing 软件单元 ${id}`);
    if (!el) continue;
    const st = attr(el, '实现状态');
    check(!!st && /已实现/.test(st.value), `软件单元 ${id} must carry 实现状态=已实现`);
    const src = attr(el, '源码路径');
    check(!!src && typeof src.value === 'string' && src.value.startsWith('harmony/'), `软件单元 ${id} 源码路径 must start with "harmony/"`);
    check(!!relId('Access', 'act-s4-impl-design', id), `missing Access 软件实现设计与开发 -> ${nameOf(id)}`);
    // The physical source file must exist on disk.
    const rel = UNIT_FILES[id];
    check(!!rel && fs.existsSync(path.join(repoRoot, rel)), `source file missing for ${id}: ${rel}`);
    // Still derived from an 实现元素 (stage-three traceability preserved).
    const fromImp = ins('派生', id).filter((r) => (byId.get(r.source_id) || {}).type === '实现元素');
    check(fromImp.length >= 1, `软件单元 ${id} must remain 派生 from an 实现元素`);
  }
}

function defectChecks() {
  const d = byId.get('def-001');
  check(!!d && d.type === '缺陷', 'missing 缺陷 def-001');
  const p = byId.get('patch-001');
  check(!!p && p.type === '补丁', 'missing 补丁 patch-001');
  const dev = relId('派生', 'def-001', 'patch-001');
  check(!!dev, 'missing 派生 def-001 -> patch-001');
  const chg = relId('变更', 'def-001', 'su-task-list-page');
  check(!!chg, 'missing 变更 def-001 -> su-task-list-page');
}

function testsChecks() {
  check(ofType('测试因子').length >= 4, `expected >=4 测试因子, got ${ofType('测试因子').length}`);
  check(ofType('测试结果').length >= 4, `expected >=4 测试结果, got ${ofType('测试结果').length}`);
  for (let i = 0; i < 4; i++) {
    const tc = TCS[i], tf = TFS[i], tres = TRES[i];
    check((byId.get(tf) || {}).type === '测试因子', `missing 测试因子 ${tf}`);
    check((byId.get(tres) || {}).type === '测试结果', `missing 测试结果 ${tres}`);
    check(!!relId('派生', tc, tf), `missing 派生 ${tc} -> ${tf}`);
    check(!!relId('派生', tf, tres), `missing 派生 ${tf} -> ${tres}`);
    check(!!relId('Access', 'act-s4-test-exec', tf), `missing Access 测试执行 -> ${nameOf(tf)}`);
    check(!!relId('Access', 'act-s4-test-eval', tres), `missing Access 测试评估 -> ${nameOf(tres)}`);
  }
}

function reviewChecks() {
  const tr4a = byId.get('rp-tr4a');
  const tr5 = byId.get('rp-tr5');
  const tr6 = byId.get('rp-tr6');
  check(!!tr4a && tr4a.type === '技术评审点', 'missing 技术评审点 rp-tr4a');
  check(!!tr5 && tr5.type === '技术评审点', 'missing 技术评审点 rp-tr5');
  check(!!tr6 && tr6.type === '技术评审点', 'missing 技术评审点 rp-tr6');
  for (const id of SUS) check(!!relId('评审', 'rp-tr4a', id), `missing 评审 TR4A -> ${nameOf(id)}`);
  for (const id of TRES) {
    check(!!relId('评审', 'rp-tr5', id), `missing 评审 TR5 -> ${nameOf(id)}`);
    check(!!relId('评审', 'rp-tr6', id), `missing 评审 TR6 -> ${nameOf(id)}`);
  }
}

function reqevalChecks() {
  for (const id of SRS) {
    check(!!relId('Realization', 'act-s4-req-eval', id), `missing Realization 需求与设计实现评估 -> ${nameOf(id)}`);
  }
}

function projectChecks() {
  const required = [
    'harmony/build-profile.json5',
    'harmony/hvigorfile.ts',
    'harmony/oh-package.json5',
    'harmony/hvigor/hvigor-config.json5',
    'harmony/entry/build-profile.json5',
    'harmony/entry/hvigorfile.ts',
    'harmony/entry/oh-package.json5',
    'harmony/entry/src/main/module.json5',
    'harmony/entry/src/main/ets/entryability/EntryAbility.ets',
    'harmony/entry/src/main/ets/pages/Index.ets',
  ];
  for (const f of required) {
    check(fs.existsSync(path.join(repoRoot, f)), `missing project file: ${f}`);
  }
  const app = JSON.parse(fs.readFileSync(path.join(repoRoot, 'harmony', 'AppScope', 'app.json5'), 'utf8'));
  check(app.app && typeof app.app.bundleName === 'string' && app.app.bundleName.length > 0, 'AppScope/app.json5 missing bundleName');
}

function buildChecks() {
  const outDir = path.join(repoRoot, 'harmony', 'entry', 'build', 'default', 'outputs', 'default');
  let haps = [];
  if (fs.existsSync(outDir)) {
    haps = fs.readdirSync(outDir).filter((f) => f.toLowerCase().endsWith('.hap'));
  }
  check(haps.length >= 1, `no HAP found under harmony/entry/build/default/outputs/default (run harmony/build.ps1 first)`);
  for (const h of haps) {
    check(fs.statSync(path.join(outDir, h)).size > 0, `HAP ${h} is empty`);
  }
}

function grammarChecks() {
  for (const r of relationships) {
    const expected = `${r.source_name} --(${r.type})--> ${r.target_name}`;
    check(r.statement === expected,
      `relationship ${r.id} statement grammar mismatch:\n  expected "${expected}"\n  got      "${r.statement}"`);
    check(!!r.source_name && !!r.target_name, `relationship ${r.id} missing source_name/target_name`);
    check(!!r.name && String(r.name).length > 0, `relationship ${r.id} missing name`);
  }
}

function invariantsChecks() {
  const rootViews = views.filter((v) => v.view_name === 'SystemArchitecture');
  check(rootViews.length === 1, `expected exactly one top-level "SystemArchitecture", got ${rootViews.length}`);
  const memberIds = new Set();
  const memberRelIds = new Set();
  for (const v of views) {
    for (const id of (v.included_elements || [])) memberIds.add(id);
    for (const id of (v.included_relationships || [])) memberRelIds.add(id);
  }
  for (const e of elements) check(memberIds.has(e.id), `element "${e.id}" is in no view`);
  for (const r of relationships) check(memberRelIds.has(r.id), `relationship "${r.id}" is in no view`);
  for (const v of views) {
    check((v.included_elements || []).length <= 15,
      `view "${v.view_id}" has ${(v.included_elements || []).length} elements (>15)`);
  }
  const expected = {
    'view-stage-s4-plan': S4,
    'view-stage-s4-software': S4,
    'view-stage-s4-tests': S4,
    'view-stage-s4-gates': S4,
    'view-stage-s4-req-eval': S4,
  };
  for (const [vid, parent] of Object.entries(expected)) {
    const v = views.find((x) => x.view_id === vid);
    check(!!v && v.parent_element_id === parent, `${vid} must be mounted on ${parent}`);
  }
}

const anchors = {
  activities: activitiesChecks,
  software: softwareChecks,
  defect: defectChecks,
  tests: testsChecks,
  review: reviewChecks,
  reqeval: reqevalChecks,
  project: projectChecks,
  build: buildChecks,
  grammar: grammarChecks,
  invariants: invariantsChecks,
};

if (anchor === 'all') {
  Object.values(anchors).forEach((fn) => fn());
} else if (anchors[anchor]) {
  anchors[anchor]();
} else {
  console.error(`Unknown ARGO_TESTCASE_ANCHOR="${anchor}" (use ${Object.keys(anchors).join('|')}|all)`);
  process.exit(2);
}

if (failures.length) {
  console.error(`FAIL: ${failures.length} check(s) failed`);
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}
console.log(`PASS: IPD 阶段四 架构与设计实现支撑 acceptance checks ok (anchor=${anchor})`);
