'use strict';
// Acceptance test for the IPD-demo seed process model (element idpdv-project).
// GIVEN the IDPDV demo workspace WHEN the intent graph is inspected
// THEN it declares the four IPD 全量设计 stages, their review gates, the
// project context (source Android app -> target HarmonyOS system), and the
// stage-progression / gate-release triggering chain.
// Run whole:      node tests/ipd_flow_seed.test.js
// Run one anchor: ARGO_TESTCASE_ANCHOR=structure|flow node tests/ipd_flow_seed.test.js

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const graph = JSON.parse(fs.readFileSync(path.join(repoRoot, 'design', 'KG', 'SystemArchitecture.json'), 'utf8'));
const elements = graph.elements || [];
const relationships = graph.relationships || [];
const views = graph.views || [];
const byId = new Map(elements.map((e) => [e.id, e]));
const anchor = (process.env.ARGO_TESTCASE_ANCHOR || 'all').trim();

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };
const ofType = (t) => elements.filter((e) => e.type === t);
const nameOf = (id) => (byId.get(id) || {}).name;
const relExists = (type, s, t) => relationships.some((r) => r.type === type && nameOf(r.source_id) === s && nameOf(r.target_id) === t);

function structureChecks() {
  const stages = ofType('IPD 阶段');
  check(stages.length >= 4, `expected >=4 "IPD 阶段", got ${stages.length}`);
  for (const n of ['领域分析与方案设计', '系统需求分析', '架构与系统设计', '架构与设计实现支撑']) {
    check(stages.some((s) => s.name.includes(n)), `missing IPD stage containing "${n}"`);
  }

  for (const g of ['Charter 决策评审点', 'TR1 技术评审点', 'TR2 技术评审点', 'TR4A 技术评审点', 'TR5 技术评审点', 'TR6 技术评审点']) {
    check(elements.some((e) => e.name === g), `missing review point "${g}"`);
  }
  check(ofType('决策评审点').length >= 1, 'missing a 决策评审点 (decision review point)');
  check(ofType('技术评审点').length >= 5, 'missing 技术评审点 (technical review points) — expect TR1..TR6');

  check(!!byId.get('idpdv-project'), 'missing project anchor element idpdv-project');
  check(elements.some((e) => e.name.includes('architecture-samples')), 'missing the source Android app element');
  check(ofType('目标系统').length >= 1, 'missing the target system (目标系统 = HarmonyOS app)');

  // Every element/relationship must belong to at least one view; exactly one root view.
  const rootViews = views.filter((v) => v.view_name === 'SystemArchitecture');
  check(rootViews.length === 1, `expected exactly one top-level view "SystemArchitecture", got ${rootViews.length}`);
  const memberIds = new Set();
  const memberRelIds = new Set();
  for (const v of views) {
    for (const id of (v.included_elements || [])) memberIds.add(id);
    for (const id of (v.included_relationships || [])) memberRelIds.add(id);
  }
  for (const e of elements) check(memberIds.has(e.id), `element "${e.id}" is in no view`);
  for (const r of relationships) check(memberRelIds.has(r.id), `relationship "${r.id}" is in no view`);
  for (const v of views) check((v.included_elements || []).length <= 15, `view "${v.view_id}" exceeds 15 elements`);
}

function flowChecks() {
  check(relExists('Triggering', '1 领域分析与方案设计（1.9.3.1 / Charter）', '2 系统需求分析（1.9.3.2 / TR1）'), 'missing stage progression S1->S2');
  check(relExists('Triggering', '2 系统需求分析（1.9.3.2 / TR1）', '3 架构与系统设计（1.9.3.3 / TR2）'), 'missing stage progression S2->S3');
  check(relExists('Triggering', '3 架构与系统设计（1.9.3.3 / TR2）', '4 架构与设计实现支撑（1.9.3.4 / TR4A·TR5·TR6）'), 'missing stage progression S3->S4');
  check(relExists('Triggering', 'Charter 决策评审点', '2 系统需求分析（1.9.3.2 / TR1）'), 'missing gate release Charter->S2');
  check(relExists('Triggering', 'TR2 技术评审点', '3 架构与系统设计（1.9.3.3 / TR2）'), 'missing gate release TR2->S3');
  check(relExists('Triggering', 'TR4A 技术评审点', '4 架构与设计实现支撑（1.9.3.4 / TR4A·TR5·TR6）'), 'missing gate release TR4A->S4');
  check(relExists('Association', 'IDPDV demo 项目（开源安卓应用移植为鸿蒙应用）', '源 Android 应用：android/architecture-samples（Todo，Apache-2.0）'), 'missing project->source linkage');
  check(relExists('Association', 'IDPDV demo 项目（开源安卓应用移植为鸿蒙应用）', '目标系统：鸿蒙应用（HarmonyOS / ArkTS·ArkUI）'), 'missing project->target linkage');
}

if (anchor === 'structure') structureChecks();
else if (anchor === 'flow') flowChecks();
else { structureChecks(); flowChecks(); }

if (failures.length) {
  console.error(`FAIL: ${failures.length} check(s) failed`);
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}
console.log('PASS: IDPDV demo seed process-model acceptance checks ok');
