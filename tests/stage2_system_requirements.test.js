'use strict';
// Acceptance test for IPD 全量设计 阶段二 (1.9.3.2 / TR1) — 系统需求分析.
//
// GIVEN the IDPDV demo intent graph
// WHEN  the stage-two (stage-s2) decomposition is inspected
// THEN  stage-s2 composes the three IPD 活动 (系统需求分析 / 构建·刷新全量功能 / 测试策略分析),
//       IR-00x --派生--> SR-00x, 场景 --覆盖--> 系统用例, SR --派生--> 特性/设计规格(SDR),
//       测试用例 --验证--> SR, activity outputs follow the IPD override matrix
//       (活动→需求 Realization, 活动→对象型资产 Access), and TR1 技术评审点 --评审--> SR,
//       and graph invariants still hold (single root view, full view membership, <=15 elements/view).
//
// Run whole:      node tests/stage2_system_requirements.test.js
// Run one anchor: ARGO_TESTCASE_ANCHOR=activities|requirements|usecases|features|testcases|review|outputs|grammar|invariants

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

const S2 = 'stage-s2';
const ACTS = [
  ['act-system-req', '系统需求分析'],
  ['act-build-features', '构建/刷新全量功能'],
  ['act-test-strategy', '测试策略分析'],
];
const SRS = ['sr-001', 'sr-002', 'sr-003', 'sr-004'];
const SCN_UC = [
  ['scn-add-edit', 'uc-create-edit'],
  ['scn-complete', 'uc-complete'],
  ['scn-list-filter', 'uc-list-filter'],
  ['scn-stats', 'uc-stats'],
];
const FEATS = ['feat-task-crud', 'feat-task-status', 'feat-list-filter', 'feat-stats'];
const SDRS = ['sdr-001', 'sdr-002'];
const TCS = ['tc-001', 'tc-002', 'tc-003', 'tc-004'];

function activitiesChecks() {
  const s2 = byId.get(S2);
  check(!!s2 && s2.type === 'IPD 阶段', 'missing IPD 阶段 stage-s2');
  for (const [id, name] of ACTS) {
    const el = byId.get(id);
    check(!!el && el.type === 'IPD 活动', `missing IPD 活动 "${name}" (${id})`);
    if (el) check(el.name === name, `活动 ${id} name expected "${name}", got "${el.name}"`);
    const c = relId('Composition', S2, id);
    check(!!c, `missing Composition stage-s2 -> ${name}`);
    if (c) {
      check(c.source_name === nameOf(S2) && c.target_name === name,
        `Composition ${id} must carry source_name/target_name`);
    }
  }
}

function requirementsChecks() {
  // IR -> SR derivation.
  check(!!relId('派生', 'ir-001', 'sr-001'), 'missing 派生 IR-001 -> SR-001');
  check(!!relId('派生', 'ir-001', 'sr-002'), 'missing 派生 IR-001 -> SR-002');
  check(!!relId('派生', 'ir-002', 'sr-003'), 'missing 派生 IR-002 -> SR-003');
  check(!!relId('派生', 'ir-002', 'sr-004'), 'missing 派生 IR-002 -> SR-004');

  for (const id of SRS) {
    const el = byId.get(id);
    check(!!el && el.type === '需求', `missing 需求 ${id}`);
    if (el) {
      check(/^SR-00\d/.test(el.name), `SR ${id} name must start with "SR-00x", got "${el.name}"`);
      check(!!el.description && el.description.length > 10, `SR ${id} must state its scope in description`);
    }
    // Every SR must be derived from some IR.
    const fromIr = relationships.filter((r) => r.type === '派生' && r.target_id === id
      && (byId.get(r.source_id) || {}).type === '需求');
    check(fromIr.length >= 1, `SR ${id} must be 派生 from an IR`);
  }
}

function usecasesChecks() {
  const ucs = ofType('用例');
  check(ucs.length >= 4, `expected >=4 用例, got ${ucs.length}`);
  for (const [scn, uc] of SCN_UC) {
    const el = byId.get(uc);
    check(!!el && el.type === '用例', `missing 用例 ${uc}`);
    check(!!relId('覆盖', scn, uc), `missing 覆盖 ${nameOf(scn)} -> ${nameOf(uc)}`);
  }
  for (const uc of ucs) {
    const covered = relationships.some((r) => r.type === '覆盖' && r.target_id === uc.id);
    check(covered, `用例 ${uc.name} is not covered by any 场景`);
  }
}

function featuresChecks() {
  check(ofType('特性').length >= 4, `expected >=4 特性, got ${ofType('特性').length}`);
  check(ofType('设计规格').length >= 2, `expected >=2 设计规格, got ${ofType('设计规格').length}`);
  for (const id of SRS) {
    const feats = relationships.filter((r) => r.type === '派生' && r.source_id === id
      && (byId.get(r.target_id) || {}).type === '特性');
    const sdrs = relationships.filter((r) => r.type === '派生' && r.source_id === id
      && (byId.get(r.target_id) || {}).type === '设计规格');
    check(feats.length >= 1, `SR ${id} must derive at least one 特性`);
    check(sdrs.length >= 1, `SR ${id} must derive at least one 设计规格(SDR)`);
  }
  for (const id of FEATS.concat(SDRS)) {
    const el = byId.get(id);
    check(!!el, `missing element ${id}`);
    const fromSr = relationships.some((r) => r.type === '派生' && r.target_id === id
      && (byId.get(r.source_id) || {}).type === '需求');
    check(fromSr, `${id} must be 派生 from an SR`);
  }
}

function testcasesChecks() {
  const tcs = ofType('测试用例');
  check(tcs.length >= 4, `expected >=4 测试用例, got ${tcs.length}`);
  const verifiedSrs = new Set();
  for (const tc of tcs) {
    const ver = relationships.filter((r) => r.type === '验证' && r.source_id === tc.id
      && (byId.get(r.target_id) || {}).type === '需求');
    check(ver.length >= 1, `测试用例 ${tc.name} must 验证 at least one SR`);
    for (const v of ver) verifiedSrs.add(v.target_id);
  }
  for (const id of SRS) {
    check(verifiedSrs.has(id), `SR ${id} has no 测试用例 verifying it`);
  }
}

function reviewChecks() {
  const tr1 = byId.get('rp-tr1');
  check(!!tr1 && tr1.type === '技术评审点', 'missing 技术评审点 rp-tr1');
  for (const id of SRS) {
    const rev = relId('评审', 'rp-tr1', id);
    check(!!rev, `missing 评审 TR1 技术评审点 -> ${nameOf(id)}`);
    if (rev) {
      check(rev.source_name === nameOf('rp-tr1') && rev.target_name === nameOf(id),
        `评审 ${id} must carry source_name/target_name`);
    }
  }
}

function outputsChecks() {
  // 活动→需求 = Realization.
  for (const id of SRS) {
    check(!!relId('Realization', 'act-system-req', id), `missing Realization 系统需求分析 -> ${nameOf(id)}`);
  }
  // 活动→对象型资产 = Access.
  for (const id of FEATS.concat(SDRS)) {
    check(!!relId('Access', 'act-build-features', id), `missing Access 构建/刷新全量功能 -> ${nameOf(id)}`);
  }
  for (const id of TCS) {
    check(!!relId('Access', 'act-test-strategy', id), `missing Access 测试策略分析 -> ${nameOf(id)}`);
  }
  for (const [, uc] of SCN_UC) {
    check(!!relId('Access', 'act-system-req', uc), `missing Access 系统需求分析 -> ${nameOf(uc)}`);
  }
}

function grammarChecks() {
  for (const r of relationships) {
    const expected = `${r.source_name} --(${r.type})--> ${r.target_name}`;
    check(r.statement === expected,
      `relationship ${r.id} statement grammar mismatch:\n  expected "${expected}"\n  got      "${r.statement}"`);
    check(!!r.source_name && !!r.target_name, `relationship ${r.id} missing source_name/target_name`);
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
    'view-stage-s2-system-req': S2,
    'view-stage-s2-usecases': S2,
    'view-stage-s2-features-sdr': S2,
    'view-stage-s2-testcases': S2,
  };
  for (const [vid, parent] of Object.entries(expected)) {
    const v = views.find((x) => x.view_id === vid);
    check(!!v && v.parent_element_id === parent, `${vid} must be mounted on ${parent}`);
  }
}

const anchors = {
  activities: activitiesChecks,
  requirements: requirementsChecks,
  usecases: usecasesChecks,
  features: featuresChecks,
  testcases: testcasesChecks,
  review: reviewChecks,
  outputs: outputsChecks,
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
console.log(`PASS: IPD 阶段二 系统需求分析 acceptance checks ok (anchor=${anchor})`);
