import type { FnSpec } from '../types.ts';
import { HANDOFF_RULE, NOT_MATERIAL_RULE, ONE_PER_LINE, EVIDENCE_RULE } from './shared.ts';

/** Technology & Intelligence (spec §16, §27): BUSINESS NEED → REQUIREMENTS → FEASIBILITY → ARCHITECTURE → BUILD / INTEGRATE → TEST → MONITOR. */
export const TECHNOLOGY: FnSpec = {
  fn: 'technology', kind: 'pipeline',
  title: { vi: 'Công nghệ & Dữ liệu', en: 'Technology & Intelligence' },
  description: {
    vi: 'Phần mềm, dữ liệu, AI và tự động hoá phục vụ đúng bài toán kinh doanh — yêu cầu hệ thống, kiến trúc, bảo mật và kế hoạch triển khai.',
    en: 'Software, data, AI and automation that serve the business problem — system requirements, architecture, security and rollout plan.',
  },
  output: null,
  needs: ['context'],
  uses: ['product.spec', 'marketing.demand', 'commercial.offer', 'ops.package'],
  produces: [{
    kind: 'tech.package', dest: ['operations', 'quality', 'finance'],
    objective: 'Technology Package: the business need it serves, the system and data requirements, the architecture and automation, security, the rollout with its tests and monitoring, and its cost drivers.',
    fields: ['businessNeed', 'systemRequirements', 'dataRequirements', 'architecture', 'automationDesign', 'securityRequirements', 'implementationPlan', 'testMonitoring', 'techCost'],
    sections: {
      decisions: ['architecture'], requirements: ['systemRequirements', 'dataRequirements', 'securityRequirements'],
      acceptance_criteria: ['testMonitoring'], assumptions: ['techCost'],
    },
  }],
  steps: [
    {
      id: 1, key: 'requirements', vi: 'Yêu cầu hệ thống', en: 'System requirements', type: 'text', knowledge: true,
      role: 'a CTO and solution architect for the {sector} sector',
      task: `Technology does not decide the business problem: it takes the problem, the requirements, the process, the data and the constraints, and decides the technical solution. Start from the business need of 1 TOPIC. ${HANDOFF_RULE} ${NOT_MATERIAL_RULE}`,
      calls: [{
        key: 'requirements', vi: 'Nhu cầu & yêu cầu', en: 'Need & requirements',
        maxTokens: 1000, temperature: 0.4, dependsOn: [],
        contextKeys: ['artifact.context', 'artifact.product.spec', 'artifact.ops.package', 'artifact.marketing.demand'],
        fields: [
          { key: 'businessNeed', vi: 'Nhu cầu kinh doanh', en: 'Business need', desc: 'The business problem technology must serve here and what success looks like — max 2 sentences. Start from the systems {sector} businesses usually run ({techPatterns}) before proposing anything new.' },
          { key: 'systemRequirements', vi: 'Yêu cầu hệ thống', en: 'System requirements', desc: `Max 6 functional requirements, 1 per line, each testable. ${ONE_PER_LINE}` },
          { key: 'dataRequirements', vi: 'Yêu cầu dữ liệu', en: 'Data requirements', desc: `Max 5 lines: the data to capture, its source, its owner and what it is used for. ${ONE_PER_LINE}` },
        ],
      }],
    },
    {
      id: 2, key: 'architecture', vi: 'Kiến trúc', en: 'Architecture', type: 'text',
      role: 'a solution architect and security engineer',
      task: 'Based on the approved requirements below (do not skip them), choose the simplest architecture that meets them — prefer configuring or buying proven tools over custom builds unless a requirement rules them out — and secure it. Name tool CATEGORIES, not vendors, unless the context names one.',
      calls: [
        {
          key: 'architecture', vi: 'Kiến trúc & tự động hoá', en: 'Architecture & automation',
          maxTokens: 1100, temperature: 0.4, dependsOn: [], contextKeys: ['businessNeed', 'systemRequirements', 'dataRequirements', 'artifact.ops.package'],
          fields: [
            { key: 'architecture', vi: 'Kiến trúc', en: 'Architecture', desc: `Max 6 lines: the components, buy/configure/build for each and why, and how they integrate. ${ONE_PER_LINE}` },
            { key: 'automationDesign', vi: 'AI & tự động hoá', en: 'AI & automation', desc: `Max 4 lines, 1 per automation: "trigger → action → where a human checks it" — or "No automation needed yet" with 1 reason. ${ONE_PER_LINE}` },
          ],
        },
        {
          key: 'security', vi: 'Bảo mật', en: 'Security',
          maxTokens: 700, temperature: 0.3, dependsOn: [], contextKeys: ['systemRequirements', 'dataRequirements'],
          fields: [{ key: 'securityRequirements', vi: 'Yêu cầu bảo mật', en: 'Security requirements', desc: `Max 5 lines: access control, personal-data protection, secrets and backups, and the compliance rules that apply. ${ONE_PER_LINE}` }],
        },
      ],
    },
    {
      id: 3, key: 'plan', vi: 'Triển khai', en: 'Rollout plan', type: 'text',
      role: 'a technical delivery lead',
      task: 'Based on the approved requirements and architecture below (do not skip them), plan the rollout, how it is tested and monitored, and what it costs to run. Costs not given in the context are assumptions — say so in the wording.',
      calls: [{
        key: 'plan', vi: 'Kế hoạch triển khai', en: 'Rollout',
        maxTokens: 1100, temperature: 0.4, dependsOn: [], contextKeys: ['systemRequirements', 'architecture', 'automationDesign', 'securityRequirements'],
        fields: [
          { key: 'implementationPlan', vi: 'Kế hoạch triển khai', en: 'Implementation plan', desc: `Max 6 numbered phases (build/configure → integrate → test → deploy), each with its deliverable. ${ONE_PER_LINE}` },
          { key: 'testMonitoring', vi: 'Kiểm thử & giám sát', en: 'Testing & monitoring', desc: `Max 5 lines: the tests that must pass before go-live and the metrics monitored after it. ${ONE_PER_LINE}` },
          { key: 'techCost', vi: 'Chi phí công nghệ', en: 'Technology cost', desc: `The setup and running cost drivers and the ROI assumptions — max 4 lines. ${EVIDENCE_RULE} ${ONE_PER_LINE}` },
        ],
      }],
    },
  ],
};
