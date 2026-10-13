'use strict';
// Acceptance test for IPD 全量设计 阶段一 (1.9.3.1 / Charter) — 领域分析与方案设计.
//
// GIVEN the IDPDV demo intent graph
// WHEN  the stage-one (stage-s1) decomposition is inspected
// THEN  stage-s1 composes the three IPD 活动 (利益相关者需求分析 / 领域分析 / 方案设计),
//       those activities output a 领域架构, 关键场景 and RR/IR 需求 (Access/Realization),
//       the 领域架构 composes its 4 关键场景 and is reviewed by the Charter 决策评审点 (评审),
//       requirements chain RR-001 --派生--> IR-001/IR-002 --派生--> 场景,
//       a source-app portability capability baseline (业务功能 --Association--> 领域架构) exists, and
//       graph invariants still hold (single root view, full view membership, <=15 elements/view).
//
// Run whole:      node tests/stage1_domain_analysis.test.js
// Run one anchor: ARGO_TESTCASE_ANCHOR=activities|domain|requirements|capabilities|grammar|invariants

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
const rel = (type, s, t) =>
  relationships.find((r) => r.type === type && nameOf(r.source_id) === s && nameOf(r.target_id) === t);
const relId = (type, sid, tid) =>
  relationships.find((r) => r.type === type && r.source_id === sid && r.target_id === tid);

const S1 = 'stage-s1';
const S1_NAME = nameOf(S1);
const ACT_STAKEHOLDER = 'act-stakeholder-req';
const ACT_DOMAIN = 'act-domain-analysis';
const ACT_SOLUTION = 'act-solution-design';
const DOM_ARCH = 'dom-arch-todo';
const SRC_APP = 'idpdv-src-app';

function activitiesChecks() {
  check(!!byId.get(S1), 'missing stage-s1 element');
  const acts = [ACT_STAKEHOLDER, ACT_DOMAIN, ACT_SOLUTION];
  const expected = ['利益相关者需求分析', '领域分析', '方案设计'];
  acts.forEach((id, i) => {
    const el = byId.get(id);
    check(!!el && el.type === 'IPD 活动', `missing IPD 活动 "${expected[i]}" (${id})`);
    if (el) check(el.name === expected[i], `活动 ${id} name expected "${expected[i]}", got "${el.name}"`);
    const c = relId('Composition', S1, id);
    check(!!c, `missing Composition stage-s1 -> ${expected[i]}`);
    if (c) {
      check(c.source_name === S1_NAME && c.target_name === expected[i],
        `Composition ${id} must carry source_name/target_name`);
    }
  });
}

function domainChecks() {
  const dom = byId.get(DOM_ARCH);
  check(!!dom && dom.type === '领域架构', 'missing 领域架构 element dom-arch-todo');
  const scenarios = ofType('场景');
  check(scenarios.length >= 3, `expected >=3 场景, got ${scenarios.length}`);

  // Activity outputs use Access/Realization.
  const acc = relId('Access', ACT_DOMAIN, DOM_ARCH);
  check(!!acc, 'missing Access 领域分析 -> 待办任务管理领域架构 (activity output)');
  const relStake = rel('Realization', '利益相关者需求分析', (byId.get('rr-001') || {}).name);
  check(!!relStake, 'missing Realization 利益相关者需求分析 -> RR-001 (activity output)');
  const relSol1 = relId('Realization', ACT_SOLUTION, 'ir-001');
  const relSol2 = relId('Realization', ACT_SOLUTION, 'ir-002');
  check(!!relSol1 && !!relSol2, '方案设计 must realize IR-001 and IR-002');
  // 领域分析 accesses each scenario it produces.
  for (const scn of scenarios) {
    check(!!relId('Access', ACT_DOMAIN, scn.id), `missing Access 领域分析 -> ${scn.name}`);
  }
  // The 领域架构 composes its key 场景 (domain owns its scenarios).
  if (dom) {
    for (const scn of scenarios) {
      check(!!relId('Composition', DOM_ARCH, scn.id),
        `missing Composition 待办任务管理领域架构 -> ${scn.name}`);
    }
  }
  // Charter 决策评审点 reviews the domain architecture at the stage gate.
  check(!!relId('评审', 'rp-charter', DOM_ARCH),
    'missing 评审 Charter 决策评审点 -> 待办任务管理领域架构');
}

function requirementsChecks() {
  const rr = byId.get('rr-001');
  const ir1 = byId.get('ir-001');
  const ir2 = byId.get('ir-002');
  check(!!rr && rr.type === '需求' && /^RR-001/.test(rr.name), 'missing RR-001 原始需求');
  check(!!ir1 && ir1.type === '需求' && /^IR-001/.test(ir1.name), 'missing IR-001 初始需求');
  check(!!ir2 && ir2.type === '需求' && /^IR-002/.test(ir2.name), 'missing IR-002 初始需求');

  check(!!relId('派生', 'rr-001', 'ir-001'), 'missing 派生 RR-001 -> IR-001');
  check(!!relId('派生', 'rr-001', 'ir-002'), 'missing 派生 RR-001 -> IR-002');

  const ir1Scns = relationships.filter((r) => r.type === '派生' && r.source_id === 'ir-001'
    && (byId.get(r.target_id) || {}).type === '场景');
  const ir2Scns = relationships.filter((r) => r.type === '派生' && r.source_id === 'ir-002'
    && (byId.get(r.target_id) || {}).type === '场景');
  check(ir1Scns.length >= 1, 'IR-001 must derive at least one 场景');
  check(ir2Scns.length >= 1, 'IR-002 must derive at least one 场景');
}

function capabilitiesChecks() {
  const caps = ofType('业务功能');
  check(caps.length >= 3, `expected >=3 业务功能 capability baseline items, got ${caps.length}`);
  for (const c of caps) {
    check(!!relId('Association', SRC_APP, c.id),
      `missing Association 源应用 -> ${c.name} in capability baseline`);
  }
  const dom = byId.get(DOM_ARCH);
  if (dom) {
    for (const c of caps) {
      check(!!relId('Association', c.id, DOM_ARCH), `capability ${c.name} must Associate the 领域架构`);
    }
  }
}

function grammarChecks() {
  // Every relationship statement must be exactly "source --(type)--> target" (names).
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
  // New sub-views must be mounted on their parent elements.
  const v1 = views.find((v) => v.view_id === 'view-stage-s1-domain');
  const v2 = views.find((v) => v.view_id === 'view-srcapp-capability-baseline');
  check(!!v1 && v1.parent_element_id === S1, 'view-stage-s1-domain must be mounted on stage-s1');
  check(!!v2 && v2.parent_element_id === SRC_APP, 'view-srcapp-capability-baseline must be mounted on idpdv-src-app');
}

const anchors = {
  activities: activitiesChecks,
  domain: domainChecks,
  requirements: requirementsChecks,
  capabilities: capabilitiesChecks,
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
console.log(`PASS: IPD 阶段一 领域分析与方案设计 acceptance checks ok (anchor=${anchor})`);
