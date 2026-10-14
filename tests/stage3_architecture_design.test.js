'use strict';
// Acceptance test for IPD 全量设计 阶段三 (1.9.3.3 / TR2) — 架构与系统设计.
//
// GIVEN the IDPDV demo intent graph
// WHEN  the stage-three (stage-s3) decomposition is inspected
// THEN  stage-s3 composes the three IPD 活动 (架构设计 / 系统设计 / 功能设计),
//       SR-00x --派生--> AR-00x (架构需求, allocated to HarmonyOS layers/部件),
//       功能 --Realization--> AR (需求-功能追溯; the workspace matrix forbids 需求 --派生--> 功能),
//       部件 --Association--> 逻辑元素 (矩阵方向为 Active→Passive, Composition 不合法),
//       功能 --派生--> 逻辑元素 / 实现元素, 逻辑元素 --派生--> 实现元素 --派生--> 软件单元,
//       each 功能 --归属于--> exactly ONE 部件 (functional-property axiom),
//       parts/functions/implementation elements carry controlled 质量属性 (DFX),
//       activity outputs follow the IPD override matrix (活动→需求 Realization,
//       活动→对象型资产 Access, 活动→行为 派生), and TR2 技术评审点 --评审--> AR,
//       and graph invariants still hold (single root view, full view membership, <=15 elements/view).
//
// Run whole:      node tests/stage3_architecture_design.test.js
// Run one anchor: ARGO_TESTCASE_ANCHOR=activities|requirements|functions|parts|logical|implementation|units|review|outputs|grammar|invariants

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

const S3 = 'stage-s3';
const ACTS = [
  ['act-s3-arch-design', '架构设计'],
  ['act-s3-sys-design', '系统设计'],
  ['act-s3-func-design', '功能设计'],
];
const AR_SR = [['ar-001', 'sr-001'], ['ar-002', 'sr-002'], ['ar-003', 'sr-003'], ['ar-004', 'sr-004']];
const ARS = AR_SR.map(([a]) => a);
const SRS = AR_SR.map(([, s]) => s);
const PARTS = ['part-data-persist', 'part-domain-state', 'part-arkui-view', 'part-platform-adapt'];
const FUNCS = ['func-task-crud', 'func-task-status', 'func-list-filter', 'func-stats'];
const LES = ['le-task-model', 'le-task-repository', 'le-task-list-viewmodel', 'le-task-list-page', 'le-task-stats-panel', 'le-platform-bridge'];
const IMPS = ['imp-task-model', 'imp-task-repository', 'imp-task-viewmodel', 'imp-task-list-page', 'imp-task-stats', 'imp-platform-bridge'];
const SUS = ['su-task-model', 'su-task-repository', 'su-task-viewmodel', 'su-task-list-page', 'su-task-stats', 'su-platform-bridge'];

function activitiesChecks() {
  const s3 = byId.get(S3);
  check(!!s3 && s3.type === 'IPD 阶段', 'missing IPD 阶段 stage-s3');
  for (const [id, name] of ACTS) {
    const el = byId.get(id);
    check(!!el && el.type === 'IPD 活动', `missing IPD 活动 "${name}" (${id})`);
    if (el) check(el.name === name, `活动 ${id} name expected "${name}", got "${el.name}"`);
    const c = relId('Composition', S3, id);
    check(!!c, `missing Composition stage-s3 -> ${name}`);
    if (c) {
      check(c.source_name === nameOf(S3) && c.target_name === name,
        `Composition ${id} must carry source_name/target_name`);
    }
  }
}

function requirementsChecks() {
  for (const [ar, sr] of AR_SR) {
    const el = byId.get(ar);
    check(!!el && el.type === '需求', `missing 需求 ${ar}`);
    if (el) {
      check(/^AR-00\d/.test(el.name), `AR ${ar} name must start with "AR-00x", got "${el.name}"`);
      check(!!el.description && el.description.length > 10, `AR ${ar} must state its allocation in description`);
    }
    check(!!relId('派生', sr, ar), `missing 派生 ${sr} -> ${ar}`);
    // Each AR must be derived from exactly one SR.
    const fromSr = ins('派生', ar).filter((r) => (byId.get(r.source_id) || {}).type === '需求');
    check(fromSr.length === 1, `AR ${ar} must be 派生 from exactly one SR (got ${fromSr.length})`);
  }
}

function functionsChecks() {
  check(ofType('功能').length >= 4, `expected >=4 功能, got ${ofType('功能').length}`);
  for (const id of FUNCS) {
    const el = byId.get(id);
    check(!!el && el.type === '功能', `missing 功能 ${id}`);
    // Function -> AR traceability. The workspace matrix forbids 需求 --派生--> 功能,
    // so the requirement-function link is modelled as 功能 --Realization--> AR.
    const realized = outs('Realization', id).filter((r) => (byId.get(r.target_id) || {}).type === '需求');
    check(realized.length >= 1, `功能 ${id} must Realization an AR (requirement-function trace)`);
    // functional-property axiom: each 功能 belongs to at most one 部件.
    const owners = outs('归属于', id);
    check(owners.length === 1, `功能 ${id} must have exactly one 归属于 部件 (functional axiom), got ${owners.length}`);
    if (owners.length === 1) {
      check((byId.get(owners[0].target_id) || {}).type === '部件',
        `功能 ${id} 归属于 target must be a 部件`);
    }
  }
}

function partsChecks() {
  const parts = ofType('部件');
  check(parts.length >= 4, `expected >=4 部件, got ${parts.length}`);
  for (const id of PARTS) {
    const el = byId.get(id);
    check(!!el && el.type === '部件', `missing 部件 ${id}`);
    if (el) {
      const qa = (el.attributes || []).filter((a) => a.name === '质量属性');
      check(qa.length >= 1, `部件 ${id} must carry at least one 质量属性 (DFX)`);
    }
    // Each 部件 owns logical elements via Association (Composition Active→Passive is not matrix-legal).
    const members = outs('Association', id).filter((r) => (byId.get(r.target_id) || {}).type === '逻辑元素');
    check(members.length >= 1, `部件 ${id} must Associate at least one 逻辑元素`);
  }
}

function logicalChecks() {
  const les = ofType('逻辑元素');
  check(les.length >= 6, `expected >=6 逻辑元素, got ${les.length}`);
  for (const id of LES) {
    check((byId.get(id) || {}).type === '逻辑元素', `missing 逻辑元素 ${id}`);
    // Each logical element is derived from at least one 功能.
    const fromFunc = ins('派生', id).filter((r) => (byId.get(r.source_id) || {}).type === '功能');
    check(fromFunc.length >= 1, `逻辑元素 ${id} must be 派生 from a 功能`);
    // ... and is associated with a 部件.
    const fromPart = ins('Association', id).filter((r) => (byId.get(r.source_id) || {}).type === '部件');
    check(fromPart.length >= 1, `逻辑元素 ${id} must be Assigned to a 部件`);
    // 逻辑元素 --派生--> 实现元素.
    const impls = outs('派生', id).filter((r) => (byId.get(r.target_id) || {}).type === '实现元素');
    check(impls.length >= 1, `逻辑元素 ${id} must 派生 at least one 实现元素`);
  }
}

function implementationChecks() {
  const imps = ofType('实现元素');
  check(imps.length >= 6, `expected >=6 实现元素, got ${imps.length}`);
  for (const id of IMPS) {
    const el = byId.get(id);
    check(!!el && el.type === '实现元素', `missing 实现元素 ${id}`);
    const fromLe = ins('派生', id).filter((r) => (byId.get(r.source_id) || {}).type === '逻辑元素');
    check(fromLe.length >= 1, `实现元素 ${id} must be 派生 from a 逻辑元素`);
    const fromFunc = ins('派生', id).filter((r) => (byId.get(r.source_id) || {}).type === '功能');
    check(fromFunc.length >= 1, `实现元素 ${id} must also be 派生 from a 功能`);
    if (el) {
      const qa = (el.attributes || []).filter((a) => a.name === '质量属性');
      check(qa.length >= 1, `实现元素 ${id} must carry at least one 质量属性 (DFX)`);
    }
  }
}

function unitsChecks() {
  const sus = ofType('软件单元');
  check(sus.length >= 6, `expected >=6 软件单元, got ${sus.length}`);
  for (const id of SUS) {
    check((byId.get(id) || {}).type === '软件单元', `missing 软件单元 ${id}`);
    const fromImp = ins('派生', id).filter((r) => (byId.get(r.source_id) || {}).type === '实现元素');
    check(fromImp.length >= 1, `软件单元 ${id} must be 派生 from an 实现元素`);
  }
}

function reviewChecks() {
  const tr2 = byId.get('rp-tr2');
  check(!!tr2 && tr2.type === '技术评审点', 'missing 技术评审点 rp-tr2');
  for (const id of ARS) {
    const rev = relId('评审', 'rp-tr2', id);
    check(!!rev, `missing 评审 TR2 技术评审点 -> ${nameOf(id)}`);
    if (rev) {
      check(rev.source_name === nameOf('rp-tr2') && rev.target_name === nameOf(id),
        `评审 ${id} must carry source_name/target_name`);
    }
  }
}

function outputsChecks() {
  // 活动→需求 = Realization.
  for (const id of ARS) {
    check(!!relId('Realization', 'act-s3-arch-design', id), `missing Realization 架构设计 -> ${nameOf(id)}`);
    check(!!relId('Realization', 'act-s3-sys-design', id), `missing Realization 系统设计 -> ${nameOf(id)}`);
  }
  // 活动→对象型资产 = Access.
  for (const id of LES) {
    check(!!relId('Access', 'act-s3-arch-design', id), `missing Access 架构设计 -> ${nameOf(id)}`);
  }
  for (const id of IMPS) {
    check(!!relId('Access', 'act-s3-sys-design', id), `missing Access 系统设计 -> ${nameOf(id)}`);
  }
  // 活动→行为 = 派生.
  for (const id of FUNCS) {
    check(!!relId('派生', 'act-s3-func-design', id), `missing 派生 功能设计 -> ${nameOf(id)}`);
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
    'view-stage-s3-plan': S3,
    'view-stage-s3-parts-functions': S3,
    'view-stage-s3-logical': S3,
    'view-stage-s3-implementation': S3,
    'view-stage-s3-software-units': S3,
    'view-stage-s3-function-map': S3,
  };
  for (const [vid, parent] of Object.entries(expected)) {
    const v = views.find((x) => x.view_id === vid);
    check(!!v && v.parent_element_id === parent, `${vid} must be mounted on ${parent}`);
  }
}

const anchors = {
  activities: activitiesChecks,
  requirements: requirementsChecks,
  functions: functionsChecks,
  parts: partsChecks,
  logical: logicalChecks,
  implementation: implementationChecks,
  units: unitsChecks,
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
console.log(`PASS: IPD 阶段三 架构与系统设计 acceptance checks ok (anchor=${anchor})`);
