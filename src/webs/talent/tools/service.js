// src/webs/talent/tools/service.js
//
// Domain `talent` — re-export hub: conductor cơ bản + toàn bộ business logic (talent profile, job,
// proposal/negotiation/deal state machine, Xu ledger, escrow, contact masking, review/trust score).
// Leaf domain (docs/new_feature.md §0) — không import từ bay/pay/socials. Mỗi khái niệm sống trong
// collection Firestore RIÊNG (talents/jobs/proposals/walletTxns/reviews), dùng chung field
// vocabulary của docs/SCHEMA.rst — xem docs/new_feature.md §1.1 cho lý do (không phải 1 bảng
// `records` chung, khác giả định ban đầu).

import { createService } from '@/services/crud.js';
import { make, get, patch, all, subscribe, sift } from '@/services/conductor.js';
import { STAGE, SUB_STATUS, XU_COSTS, PROPOSAL_EXPIRE_WINDOW_MS } from './constant.js';

export { make, get, patch, all, subscribe, sift, STAGE, SUB_STATUS };

// ── Collections ──────────────────────────────────────────────────────────────────────────────
const _talentSvc   = () => createService('talents');
const _jobSvc      = () => createService('jobs');
const _proposalSvc = () => createService('proposals');
const _walletSvc   = () => createService('walletTxns');
const _reviewSvc   = () => createService('reviews');
const _userSvc     = () => createService('users', '', 'auth');
const _invoiceSvc  = () => createService('invoices', '', 'invoices');

// ── Audit trail (actors) — bản sao _comActors() của src/webs/auth/svc-admin.js ─────────────────
function _appendActor(existing, userId, action) {
    const entry = `${userId}~${new Date().toISOString()}~${action}`;
    const entries = (existing || '').split('|').filter(Boolean);
    entries.push(entry);
    return entries.slice(-9).join('|');
}

function _parseMeta(row) {
    return typeof row?.meta === 'string' ? JSON.parse(row.meta || '{}') : (row?.meta ?? {});
}

/** Flow _patchMeta: id + guard/patchFn -> row.meta patched (read-modify-write, bản sao
 *  _patchInvoiceMeta() của src/webs/pay/tools/service.js — crud.js's update() không deep-merge
 *  JSONB, xem docs/CRUD.rst). guard(meta,row) false -> no-op (null). */
async function _patchMeta(svc, id, guard, patchFn, extra = {}) {
    const row = await svc.findById(id); // [1] CHECK: load hiện trạng
    if (!row) return null;
    const curMeta = _parseMeta(row);
    if (guard && !guard(curMeta, row)) return null; // [1.a] guard từ chối -> no-op
    const patch = typeof patchFn === 'function' ? patchFn(curMeta, row) : patchFn; // [2] PROCESS
    const meta = { ...curMeta, ...patch };
    const now = await svc.now();
    try {
        await svc.update(id, { meta, updated_at: now, ...extra }); // [3] EXECUTE
    } catch (err) {
        console.error('[talent] _patchMeta error:', err);
        return null;
    }
    return { ...row, meta, updated_at: now, ...extra }; // [4] RETURN
}

// crud.js's .listen() trả Promise<unsubscribe> — bọc đồng bộ hoá lại, bản sao _syncUnsub() của
// src/webs/pay/tools/service.js (mọi call site coi listenXxx() như trả thẳng 1 hàm unsub).
function _syncUnsub(listenPromise) {
    let unsub = null;
    let cancelled = false;
    listenPromise.then((fn) => { if (cancelled) fn(); else unsub = fn; });
    return () => { cancelled = true; unsub?.(); unsub = null; };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// TALENT PROFILE — docs/new_feature.md §1.2
// ═══════════════════════════════════════════════════════════════════════════════════════════

/** Flow createTalentProfile: userId + form -> talent record mới (status: 'draft'). */
export async function createTalentProfile(userId, form = {}) {
    if (!userId) throw new Error('[talent] createTalentProfile: missing userId'); // [1] CHECK
    const svc = _talentSvc();
    const now = await svc.now();
    const doc = { // [2] PROCESS
        mode: 'talent', user_id: userId,
        title: form.title ?? '', description: form.description ?? '', content: form.content ?? '',
        tags: form.tags ?? '', pics: form.pics ?? '',
        pricing: form.pricing ?? '', score: '0~0',
        status: 'draft', scope: 'public', secure: '',
        actors: _appendActor('', userId, 'created'),
        meta: {
            category: form.category ?? '', subCategory: form.subCategory ?? '',
            experienceYears: form.experienceYears ?? 0,
            availability: form.availability ?? 'available',
            hoursPerWeek: form.hoursPerWeek ?? '', workMode: form.workMode ?? 'remote',
            location: form.location ?? '', languages: form.languages ?? [],
            avatarUrl: form.avatarUrl ?? '', // snapshot của users.avatar — dùng cho card grid (không join collection)
            ratings: { quality: 0, communication: 0, deadline: 0, professional: 0, value: 0 },
            stats: { completedJobs: 0, totalProjects: 0, completionRate: 0, reviewRate: 0, repeatClients: 0 },
            verification: { professional: false, transaction: false, transactionCount: 0, topRated: false },
            trustScore: 0,
            contact: form.contact ?? { phone: '', email: '', zalo: '', whatsapp: '', telegram: '' },
            workHistory: form.workHistory ?? [],
        },
        created_at: now, updated_at: now,
    };
    return svc.create(doc); // [3][4] EXECUTE + RETURN
}

/** Flow updateTalentProfile: talentId + userId + patch -> talent đã cập nhật. Quyền (chủ sở hữu /
 *  admin) do component check trước khi gọi — hàm này chỉ ghi DB. `patch.meta` được merge (không
 *  ghi đè) vào meta hiện có, đúng convention read-modify-write JSONB. */
export async function updateTalentProfile(talentId, userId, patchFields = {}) {
    const svc = _talentSvc();
    const row = await svc.findById(talentId);
    if (!row) return null;
    const now = await svc.now();
    const { meta: metaPatch, ...rest } = patchFields;
    const nextMeta = metaPatch ? { ..._parseMeta(row), ...metaPatch } : undefined;
    const data = {
        ...rest, ...(nextMeta ? { meta: nextMeta } : {}),
        actors: _appendActor(row.actors, userId, 'updated'), updated_at: now,
    };
    await svc.update(talentId, data);
    return { ...row, ...data };
}

export function publishTalentProfile(talentId, userId) {
    return updateTalentProfile(talentId, userId, { status: 'active' });
}

// Directory grid card dispatch 'view-profile' qua cell-action (web-cell.js) — nghe SYNCHRONOUS
// (không await trước) đúng convention docs/ARCHITECT.rst, gọi 1 lần từ <script> của
// src/pages/talent/index.astro|[category].astro (page không có orchestrator svc-* nào luôn mount
// để tự bind như svc-pay.js/svc-bay.js làm).
let _navBound = false;
export function bindDirectoryNav() {
    if (_navBound) return;
    _navBound = true;
    document.addEventListener('cell-action', (e) => {
        const { action, info } = e.detail ?? {};
        if (action === 'view-profile' && info?.id) window.location.href = `/talent/profile/${info.id}`;
    });
}

// 2 định danh KHÁC NHAU xuyên suốt domain này — đừng lẫn: `talentId` (id document `talents`, dùng
// cho URL /talent/profile/[id] + CRUD trực tiếp) vs `talentUserId`/`meta.talentId` (users.id, dùng
// làm khoá liên kết trong proposal/review vì employerId cũng luôn là users.id).
export function findTalentById(talentId) { return _talentSvc().findById(talentId); }

export function loadTalentReviews(talentId) {
    return _reviewSvc().findAll({ filters: { 'meta.talentId': talentId }, sortBy: 'created_at', order: 'desc' });
}

export function findTalentByUserId(userId) {
    return _talentSvc().findAll({ filters: { user_id: userId } }).then((rows) => rows[0] ?? null);
}

/** Flow verifyTalent: moderator/admin (capability `talents.approve`, xem docs/new_feature.md §6.2)
 *  approve -> talent.meta.verification.professional = true. */
export async function verifyTalent(talentId, moderatorId, { verifiedByOrg = '' } = {}) {
    const svc = _talentSvc();
    const row = await svc.findById(talentId);
    if (!row) return null;
    const meta = { ..._parseMeta(row), verification: { ..._parseMeta(row).verification, professional: true, verifiedBy: moderatorId, verifiedByOrg } };
    const now = await svc.now();
    await svc.update(talentId, { meta, actors: _appendActor(row.actors, moderatorId, 'verified'), updated_at: now });
    return meta;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// JOB — docs/new_feature.md §1.3/§2.1
// ═══════════════════════════════════════════════════════════════════════════════════════════

export async function createJob(employerId, form = {}) {
    const svc = _jobSvc();
    const now = await svc.now();
    return svc.create({
        mode: 'job', user_id: employerId,
        title: form.title ?? '', description: form.description ?? '', content: form.content ?? '',
        tags: form.tags ?? '', pricing: form.pricing ?? '',
        status: 'draft',
        actors: _appendActor('', employerId, 'created'),
        meta: {
            category: form.category ?? '', subCategory: form.subCategory ?? '',
            jobType: form.jobType ?? 'hourly', hoursPerWeek: form.hoursPerWeek ?? '',
            durationWeeks: form.durationWeeks ?? 0, startDate: form.startDate ?? '',
            talentId: form.talentId ?? '', proposalCount: 0, hiredProposalId: '',
        },
        created_at: now, updated_at: now,
    });
}

export async function publishJob(jobId, employerId) {
    const svc = _jobSvc();
    const row = await svc.findById(jobId);
    if (!row) return null;
    const now = await svc.now();
    await svc.update(jobId, { status: 'published', actors: _appendActor(row.actors, employerId, 'published'), updated_at: now });
    return { ...row, status: 'published', updated_at: now };
}

/** Flow closeJob: đánh dấu job đã có Deal — KHÔNG chứa lifecycle thương lượng (sống ở proposal). */
export async function closeJob(jobId, hiredProposalId) {
    const svc = _jobSvc();
    const row = await svc.findById(jobId);
    if (!row) return null;
    const meta = { ..._parseMeta(row), hiredProposalId };
    const now = await svc.now();
    await svc.update(jobId, { status: 'closed', meta, updated_at: now });
    return { ...row, status: 'closed', meta, updated_at: now };
}

export function findJobById(jobId) { return _jobSvc().findById(jobId); }
export function loadEmployerJobs(employerId) { return _jobSvc().findAll({ filters: { user_id: employerId } }); }

// ═══════════════════════════════════════════════════════════════════════════════════════════
// PROPOSAL / NEGOTIATION / DEAL — meta.stage state machine, docs/new_feature.md §1.4/§2.2
// ═══════════════════════════════════════════════════════════════════════════════════════════

const _patchProposalMeta = (id, guard, patchFn, extra) => _patchMeta(_proposalSvc(), id, guard, patchFn, extra);
const _historyEntry = (actor, action, fields = {}) => ({ actor, action, ts: new Date().toISOString(), ...fields });
const _isNegotiable = (meta) => ['proposed', 'negotiating'].includes(meta.stage) && !meta.subStatus;
// UI chỉ ẨN nút theo isTalent/isEmployer (cosmetic) — mọi mutation THẬT phải tự xác minh actorId là
// 1 trong 2 bên của ĐÚNG proposal đó ở tầng service (nếu không, ai biết/đoán proposalId cũng gọi
// được thẳng các hàm export bên dưới qua console/client sửa đổi).
const _isParty = (meta, actorId) => !!actorId && (actorId === meta.talentId || actorId === meta.employerId);

/** Flow createProposal: employerId + talentId + offer -> proposal (stage:'proposed'). Component
 *  phải gọi spendXu('send_proposal') THÀNH CÔNG trước khi gọi hàm này — 2 side-effect tách rời để
 *  component tự xử lý lỗi từng bước (không hoàn Xu ngầm nếu tạo proposal lỗi ở tầng này). */
export async function createProposal(employerId, talentId, offer = {}) {
    if (!employerId || !talentId) throw new Error('[talent] createProposal: missing ids');
    const svc = _proposalSvc();
    const now = await svc.now();
    return svc.create({
        mode: 'proposal', user_id: employerId,
        title: offer.title || 'Đề nghị thuê trực tiếp',
        pricing: `${offer.rate ?? 0}~~${offer.unit ?? 'hour'}`,
        quantity: offer.hoursPerWeek ?? 0,
        status: 'open',
        actors: _appendActor('', employerId, 'created'),
        meta: {
            jobId: offer.jobId ?? '', talentId, employerId,
            stage: 'proposed', subStatus: null,
            history: [_historyEntry(employerId, 'proposed', {
                rate: offer.rate ?? 0, hoursPerWeek: offer.hoursPerWeek ?? 0,
                weeks: offer.weeks ?? 0, message: offer.message ?? '',
            })],
            deal: null, escrow: null, invoiceId: '',
            contactUnlockedAt: null, completedAt: null, reviewedAt: null,
        },
        created_at: now, updated_at: now,
    });
}

export function counterOffer(proposalId, actorId, offer = {}) {
    return _patchProposalMeta(
        proposalId,
        (meta) => _isNegotiable(meta) && _isParty(meta, actorId),
        (meta) => ({
            stage: 'negotiating',
            history: [...meta.history, _historyEntry(actorId, 'countered', {
                rate: offer.rate ?? 0, hoursPerWeek: offer.hoursPerWeek ?? 0,
                weeks: offer.weeks ?? 0, message: offer.message ?? '',
            })],
        }),
    );
}

/** Flow acceptProposal: chốt Deal từ entry cuối của history — meta.deal chỉ được set ở đây. */
export function acceptProposal(proposalId, actorId) {
    return _patchProposalMeta(
        proposalId,
        (meta) => _isNegotiable(meta) && _isParty(meta, actorId),
        (meta) => {
            const last = meta.history[meta.history.length - 1];
            const weeks = last.weeks ?? 0;
            return {
                stage: 'accepted',
                history: [...meta.history, _historyEntry(actorId, 'accepted')],
                deal: {
                    rate: last.rate, hoursPerWeek: last.hoursPerWeek, weeks,
                    startDate: new Date().toISOString().slice(0, 10), scope: last.message ?? '',
                    estimatedTotal: (last.rate ?? 0) * (last.hoursPerWeek ?? 0) * weeks,
                },
            };
        },
        { status: 'accepted' },
    );
}

export function declineProposal(proposalId, actorId, reason = '') {
    return _patchProposalMeta(
        proposalId,
        (meta) => _isNegotiable(meta) && _isParty(meta, actorId),
        (meta) => ({ stage: 'declined', history: [...meta.history, _historyEntry(actorId, 'declined', { message: reason })] }),
        { status: 'declined' },
    );
}

// Không cho huỷ khi deal đã completed/reviewed (tiền đã escrow/giải ngân) — trước đây guard chỉ
// check `!meta.subStatus` nên 1 bên có thể "huỷ" ngược 1 deal đã xong việc.
export function cancelProposal(proposalId, actorId, reason = '') {
    return _patchProposalMeta(
        proposalId,
        (meta) => !meta.subStatus && !['completed', 'reviewed'].includes(meta.stage) && _isParty(meta, actorId),
        (meta) => ({ subStatus: 'cancelled', history: [...meta.history, _historyEntry(actorId, 'cancelled', { message: reason })] }),
        { status: 'cancelled' },
    );
}

// Chỉ Talent được bắt đầu công việc (Employer chỉ xác nhận thanh toán trước đó).
export function markInProgress(proposalId, actorId) {
    return _patchProposalMeta(
        proposalId,
        (meta) => meta.stage === 'accepted' && !meta.subStatus && actorId === meta.talentId,
        (meta) => ({ stage: 'in_progress', history: [...meta.history, _historyEntry(actorId, 'in_progress')] }),
    );
}

// Chỉ Talent được nộp bàn giao.
export function submitWork(proposalId, actorId, note = '') {
    return _patchProposalMeta(
        proposalId,
        (meta) => meta.stage === 'in_progress' && !meta.subStatus && actorId === meta.talentId,
        (meta) => ({ stage: 'submitted', history: [...meta.history, _historyEntry(actorId, 'submitted', { message: note })] }),
    );
}

// Chỉ Employer được xác nhận hoàn thành (người trả tiền mới có quyền chốt đã nhận đủ việc).
export function confirmCompleted(proposalId, actorId) {
    return _patchProposalMeta(
        proposalId,
        (meta) => meta.stage === 'submitted' && !meta.subStatus && actorId === meta.employerId,
        (meta) => ({ stage: 'completed', completedAt: new Date().toISOString(), history: [...meta.history, _historyEntry(actorId, 'completed')] }),
    );
}

/** capability `proposals.manage_status` (admin) mới được resolve dispute — xem docs/new_feature.md §6.2.
 *  Guard cũ chặn stage 'cancelled' — giá trị đó KHÔNG BAO GIỜ xuất hiện ở `meta.stage` (huỷ là
 *  subStatus, xem cancelProposal), nên check nhầm field khiến 1 proposal đã huỷ vẫn mở dispute
 *  được. Sửa lại check đúng `subStatus`, và chặn luôn dispute trùng lặp. */
export function openDispute(proposalId, actorId, reason = '') {
    return _patchProposalMeta(
        proposalId,
        (meta) => meta.stage !== 'declined' && !['cancelled', 'disputed'].includes(meta.subStatus) && _isParty(meta, actorId),
        (meta) => ({ subStatus: 'disputed', history: [...meta.history, _historyEntry(actorId, 'disputed', { message: reason })] }),
    );
}

/** Auto-expire polling — gọi từ component (_dcMaybeAutoExpire trong svc-proposal.js), không cron
 *  (site tĩnh), cùng kỹ thuật autoConfirmReceived() của webs/pay. */
export async function maybeAutoExpireProposal(proposalId) {
    const svc = _proposalSvc();
    const row = await svc.findById(proposalId);
    if (!row) return null;
    const meta = _parseMeta(row);
    if (!['proposed', 'negotiating'].includes(meta.stage) || meta.subStatus) return null;
    const last = meta.history?.[meta.history.length - 1];
    const lastTs = last ? new Date(last.ts).getTime() : 0;
    if (Date.now() - lastTs < PROPOSAL_EXPIRE_WINDOW_MS) return null;
    return _patchProposalMeta(proposalId, null, { subStatus: 'expired' }, { status: 'expired' });
}

export function findProposalById(proposalId) { return _proposalSvc().findById(proposalId); }

export function listenProposal(proposalId, onNext, onError) {
    return _syncUnsub(_proposalSvc().listen({}, (rows) => onNext(rows.find((r) => r.id === proposalId) ?? null), onError));
}

export function loadTalentProposals(talentId) { return _proposalSvc().findAll({ filters: { 'meta.talentId': talentId } }); }
export function loadEmployerProposals(employerId) { return _proposalSvc().findAll({ filters: { 'meta.employerId': employerId } }); }

// ═══════════════════════════════════════════════════════════════════════════════════════════
// XU (CREDIT) SYSTEM — docs/new_feature.md §3, tách biệt hoàn toàn với escrow (§ dưới)
// ═══════════════════════════════════════════════════════════════════════════════════════════

export function findUserById(userId) { return _userSvc().findById(userId); }

export async function getXuBalance(userId) {
    const row = await _userSvc().findById(userId);
    return Number(_parseMeta(row).xuBalance || 0);
}

/** Flow spendXu: userId + action -> { ok, balance }. Không throw khi thiếu Xu — trả { ok:false }
 *  để component tự hiện CTA "Mua Xu" (docs/new_feature.md §3.3, §8 nguyên tắc UX). */
export async function spendXu(userId, action, refId = '') {
    const cost = XU_COSTS[action];
    if (!cost) throw new Error(`[talent] spendXu: unknown action "${action}"`); // [1] CHECK
    const userSvc = _userSvc();
    const user = await userSvc.findById(userId);
    const meta = _parseMeta(user);
    const balance = Number(meta.xuBalance || 0);
    if (balance < cost) return { ok: false, balance };
    const balanceAfter = balance - cost; // [2] PROCESS
    const walletSvc = _walletSvc(); // [3] EXECUTE
    await walletSvc.create({
        mode: 'wallet_txn', user_id: userId, status: 'active',
        meta: { type: 'spend', amount: -cost, reason: action, refId, balanceAfter },
        created_at: await walletSvc.now(),
    });
    await userSvc.update(userId, { meta: { ...meta, xuBalance: balanceAfter } });
    return { ok: true, balance: balanceAfter }; // [4] RETURN
}

// Chỉ cộng/trừ users.meta.xuBalance (read-modify-write) — KHÔNG tạo wallet_txn, dùng bởi mọi hàm
// credit/debit bên dưới để tránh trùng logic tính balanceAfter.
async function _adjustBalance(userId, delta) {
    const userSvc = _userSvc();
    const user = await userSvc.findById(userId);
    const meta = _parseMeta(user);
    const balanceAfter = Number(meta.xuBalance || 0) + delta;
    await userSvc.update(userId, { meta: { ...meta, xuBalance: balanceAfter } });
    return balanceAfter;
}

/** Admin-only — credit NGAY LẬP TỨC + tạo 1 wallet_txn 'active' mới (dùng khi admin tự nạp Xu cho
 *  user, KHÔNG phải flow user tự yêu cầu — xem requestTopUp()/approveTopUp() bên dưới cho flow đó,
 *  tách riêng để user client không tự cấp Xu miễn phí được). */
async function _creditXu(userId, amount, type, reason, refId = '') {
    const balanceAfter = await _adjustBalance(userId, amount);
    const walletSvc = _walletSvc();
    await walletSvc.create({
        mode: 'wallet_txn', user_id: userId, status: 'active',
        meta: { type, amount, reason, refId, balanceAfter },
        created_at: await walletSvc.now(),
    });
    return { balance: balanceAfter };
}

export const topUpXu = (userId, amount, note = 'topup') => _creditXu(userId, amount, 'topup', note);
export const refundXu = (userId, amount, refId = '') => _creditXu(userId, amount, 'refund', 'refund', refId);

/** Flow requestTopUp: user tự tạo yêu cầu nạp Xu — CHƯA cộng balance, chỉ tạo wallet_txn
 *  status:'pending'. Admin xác minh chuyển khoản thật rồi gọi approveTopUp() để cộng thật
 *  (tách 2 hàm để user client không tự cấp Xu miễn phí được, xem docs/new_feature.md §3.2/§9). */
export async function requestTopUp(userId, amount, note = '') {
    const walletSvc = _walletSvc();
    return walletSvc.create({
        mode: 'wallet_txn', user_id: userId, status: 'pending',
        meta: { type: 'topup', amount, reason: note, refId: '', balanceAfter: null },
        created_at: await walletSvc.now(),
    });
}

/** Flow approveTopUp: admin (capability `walletTxns.manage_status`) xác nhận đã nhận tiền -> cộng
 *  thật vào users.meta.xuBalance + đánh dấu ĐÚNG wallet_txn pending đó thành 'active' (không tạo
 *  row mới — khác _creditXu). */
export async function approveTopUp(txnId, adminId) {
    const walletSvc = _walletSvc();
    const txn = await walletSvc.findById(txnId);
    if (!txn || txn.status !== 'pending') return null;
    const meta = _parseMeta(txn);
    const balance = await _adjustBalance(txn.user_id, meta.amount);
    await walletSvc.update(txnId, { status: 'active', meta: { ...meta, balanceAfter: balance, approvedBy: adminId } });
    return { balance };
}

export function loadWalletHistory(userId) {
    return _walletSvc().findAll({ filters: { user_id: userId }, sortBy: 'created_at', order: 'desc' });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// ESCROW (invoice) — docs/new_feature.md §1.8/§2.3, tái dùng invoices collection của webs/pay
// ═══════════════════════════════════════════════════════════════════════════════════════════

/** Flow issueEscrowInvoice: proposal (stage:'accepted') -> invoice 'issued' + proposal.meta.escrow
 *  = 'held'. seller/buyer theo format docs/SCHEMA.rst §"seller format"/"buyer format". */
export async function issueEscrowInvoice(proposalId, actorId, { seller = {}, buyer = {}, vatRate = 0 } = {}) {
    const proposal = await _proposalSvc().findById(proposalId); // [1] CHECK
    const meta = _parseMeta(proposal);
    if (!proposal || meta.stage !== 'accepted' || actorId !== meta.employerId) return null;
    const { deal } = meta;
    const amount = deal.rate * deal.hoursPerWeek * deal.weeks; // [2] PROCESS
    const vatAmount = amount * vatRate;
    const total = amount + vatAmount;
    const invoiceSvc = _invoiceSvc(); // [3] EXECUTE
    const now = await invoiceSvc.now();
    const invoice = await invoiceSvc.create({
        issued_at: now, user_id: buyer.userId ?? '', order_id: proposalId,
        status: 'issued', currency: 'VND',
        seller: [seller.accountName, seller.accountNo, seller.bankOrMomo, seller.name,
            seller.phone, seller.address, seller.email, seller.taxCode ?? '', seller.userId ?? ''].join('~'),
        buyer: [buyer.name, buyer.phone, buyer.address, buyer.email, buyer.taxCode ?? '', buyer.userId ?? ''].join('~'),
        items: [proposal.title, deal.rate, 'hour', deal.hoursPerWeek * deal.weeks, 0, amount, vatRate, vatAmount].join('~'),
        summary: `${amount}~${vatAmount}~${total}`,
        meta: {},
    });
    await _patchProposalMeta(proposalId, null, { escrow: 'held', invoiceId: invoice.id });
    return invoice; // [4] RETURN
}

// Chưa có UI gọi 2 hàm này (Phase 2 — dispute resolution admin, xem docs/new_feature.md §6.2) —
// vẫn nhận `actorId` và xác minh là 1 bên của đúng proposal đó, không để hở API cho việc thêm UI
// sau này vô tình quên guard.
export function releaseEscrow(proposalId, actorId) {
    return _patchProposalMeta(proposalId, (meta) => meta.escrow === 'held' && meta.stage === 'completed' && _isParty(meta, actorId), { escrow: 'released' });
}

export function refundEscrow(proposalId, actorId) {
    return _patchProposalMeta(proposalId, (meta) => meta.escrow === 'held' && _isParty(meta, actorId), { escrow: 'refunded' });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CONTACT MASKING — docs/new_feature.md §5, tái dùng records.scope/secure (ACL sẵn có)
// ═══════════════════════════════════════════════════════════════════════════════════════════

const _maskPhone = (phone) => (!phone || phone.length <= 3 ? phone || '' : `${phone.slice(0, 3)} *** *** ${phone.slice(-3)}`);
const _maskEmail = (email) => {
    if (!email || !email.includes('@')) return '';
    const [name, domain] = email.split('@');
    return `${name[0] ?? ''}***@${domain}`;
};

/** Trả contact đã mask hoặc thật tuỳ `canRead` — component tự gọi canReadContact() trước. */
export function maskContact(contact = {}, canRead) {
    if (canRead) return contact;
    return {
        phone: _maskPhone(contact.phone), email: _maskEmail(contact.email),
        zalo: contact.zalo ? '••••••••' : '', whatsapp: contact.whatsapp ? '••••••••' : '', telegram: contact.telegram ? '••••••••' : '',
    };
}

/** ACL check đúng format docs/SCHEMA.rst §"secure format" (entries cách nhau ','). Chủ sở hữu luôn
 *  đọc được contact của chính mình. */
export function canReadContact(currentUserId, talentRow) {
    if (!currentUserId) return false;
    if (talentRow?.user_id === currentUserId) return true;
    return (talentRow?.secure || '').split(',').filter(Boolean).some((entry) => {
        const [id, acts = ''] = entry.split('~');
        return id === currentUserId && acts.split('|').includes('read');
    });
}

/** Flow unlockContact: employer đã trả Xu (unlock_contact) hoặc escrow đã issued -> talent.secure
 *  += '<employerId>~read'. Component tự gọi spendXu('unlock_contact') TRƯỚC nếu chưa có escrow. */
export async function unlockContact(talentUserId, employerId, proposalId) {
    // `talentUserId` = users.id của Talent (khớp meta.talentId trong proposal/review, KHÔNG
    // phải id document `talents` — 2 định danh khác nhau, xem findTalentById vs findTalentByUserId).
    const talent = await findTalentByUserId(talentUserId);
    if (!talent) return null;
    if (canReadContact(employerId, talent)) return talent; // đã mở sẵn — no-op
    const secure = [talent.secure, `${employerId}~read`].filter(Boolean).join(',');
    await _talentSvc().update(talent.id, { secure });
    if (proposalId) await _patchProposalMeta(proposalId, null, { contactUnlockedAt: new Date().toISOString() });
    return { ...talent, secure };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// REVIEW & TRUST SCORE — docs/new_feature.md §1.5/§4
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * Flow submitReview: RegisterReview -> UserResponse
 */
export async function submitReview(employerId, proposalId, { rating, comment = '', breakdown = {} } = {}) {
    // [1] CHECK: điều kiện hợp lệ ở tầng service, không chỉ UI (docs/new_feature.md §1.5)
    const proposal = await _proposalSvc().findById(proposalId);
    if (!proposal) throw new Error('[talent] submitReview: proposal not found');
    const pMeta = _parseMeta(proposal);
    if (pMeta.stage !== 'completed') throw new Error('[talent] submitReview: proposal chưa completed');
    if (pMeta.employerId !== employerId) throw new Error('[talent] submitReview: sai employer');
    const existing = await _reviewSvc().findAll({ filters: { 'meta.proposalId': proposalId } });
    if (existing.length) throw new Error('[talent] submitReview: proposal đã có review');

    // [2] PROCESS
    const talentId = pMeta.talentId;

    // [3] EXECUTE
    const reviewSvc = _reviewSvc();
    const now = await reviewSvc.now();
    await reviewSvc.create({
        mode: 'review', user_id: employerId, content: comment, score: `${rating}~1`,
        meta: { proposalId, talentId, employerId, breakdown },
        created_at: now, updated_at: now,
    });
    await _patchProposalMeta(proposalId, null, { stage: 'reviewed', reviewedAt: now });
    await recomputeTalentStats(talentId);

    // [4] RETURN
    return { talentId };
}

const _avgOf = (obj) => {
    const vals = Object.values(obj).filter((v) => typeof v === 'number');
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
};

function _computeTrustScore(meta) {
    const v = meta.verification ?? {};
    const s = meta.stats ?? {};
    return Math.round(
        (v.professional ? 30 : 0) +
        Math.min(s.completedJobs ?? 0, 25) +
        (meta.ratings ? (_avgOf(meta.ratings) / 5) * 20 : 0) +
        (s.reviewRate ?? 0) * 10 +
        Math.min(s.repeatClients ?? 0, 5) +
        4, // account history — placeholder cố định MVP, xem docs/new_feature.md §4.4
    );
}

/** Flow recomputeTalentStats: đọc lại toàn bộ review + proposal của 1 talent, tính lại
 *  ratings/stats/verification/trustScore — KHÔNG cộng dồn thủ công (docs/new_feature.md §1.2). */
export async function recomputeTalentStats(talentUserId) {
    // `talentUserId` = users.id (khớp meta.talentId lưu trong proposal/review) — KHÔNG phải id
    // document `talents`, xem unlockContact() cho cùng lưu ý.
    const talent = await findTalentByUserId(talentUserId);
    if (!talent) return null;

    const reviews = await _reviewSvc().findAll({ filters: { 'meta.talentId': talentUserId } });
    const proposals = await _proposalSvc().findAll({ filters: { 'meta.talentId': talentUserId } });

    const dims = ['quality', 'communication', 'deadline', 'professional', 'value'];
    const ratings = {};
    dims.forEach((d) => {
        const vals = reviews.map((r) => _parseMeta(r).breakdown?.[d]).filter((v) => typeof v === 'number');
        ratings[d] = vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0;
    });

    const stageOf = (p) => _parseMeta(p).stage;
    const reviewedCount = proposals.filter((p) => stageOf(p) === 'reviewed').length;
    const completedCount = proposals.filter((p) => ['completed', 'reviewed'].includes(stageOf(p))).length;
    const employerIds = new Set(proposals.map((p) => _parseMeta(p).employerId));
    // `reviewRate` = tỷ lệ job completed ĐÃ ĐƯỢC REVIEW — schema hiện KHÔNG có due-date/deadline
    // nên không thể tính "đúng hạn" thật; đặt tên đúng bản chất số liệu, tránh hiểu nhầm SLA.
    const stats = {
        completedJobs: completedCount, totalProjects: proposals.length,
        completionRate: proposals.length ? completedCount / proposals.length : 0,
        reviewRate: completedCount ? reviewedCount / completedCount : 0,
        repeatClients: Math.max(0, proposals.length - employerIds.size),
    };

    const talentMeta = _parseMeta(talent);
    const verification = {
        ...talentMeta.verification,
        transaction: reviewedCount >= 1, transactionCount: reviewedCount,
        topRated: _avgOf(ratings) >= 4.8 && reviewedCount >= 10,
    };

    const meta = { ...talentMeta, ratings, stats, verification };
    meta.trustScore = _computeTrustScore(meta);

    const talentSvc = _talentSvc();
    await talentSvc.update(talent.id, {
        score: `${_avgOf(ratings).toFixed(1)}~${reviews.length}`, meta, updated_at: await talentSvc.now(),
    });
    return meta;
}
