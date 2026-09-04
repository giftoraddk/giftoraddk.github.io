// src/webs/talent/tools/constant.js
//
// Domain `talent` độc lập hoàn toàn (leaf domain, xem hook/new_feature.md §0) — không import từ
// domain nào khác (`bay`/`pay`/`socials`).

// `proposal.meta.stage` — negotiation + deal + execution gộp 1 record, xem hook/new_feature.md §2.2.
export const STAGE = ['proposed', 'negotiating', 'accepted', 'declined', 'in_progress', 'submitted', 'completed', 'reviewed'];

// `proposal.meta.subStatus` — song song với STAGE, không thay thế. `null` = không có ngoại lệ nào.
export const SUB_STATUS = ['cancel_requested', 'cancelled', 'disputed', 'refunded', 'expired'];

// `proposal.meta.escrow` — trạng thái vận hành của tiền giữ (KHÁC `invoice.status`, xem §1.8/§2.3).
export const ESCROW = ['held', 'released', 'refunded'];

// Không phản hồi trong 48h ở stage 'proposed'/'negotiating' -> tự expire, xem hook/new_feature.md §2.2.
export const PROPOSAL_EXPIRE_WINDOW_MS = 48 * 60 * 60 * 1000;

// Bảng giá Xu — giả định, cần A/B test sau (xem hook/new_feature.md §3.3/§13.5).
export const XU_COSTS = {
    send_proposal: 50,
    hire_request: 100,
    unlock_contact: 100,
    featured_request: 200,
};

// `talent.status`
export const TALENT_STATUS = ['draft', 'active', 'inactive', 'archived'];

// `job.status`
export const JOB_STATUS = ['draft', 'published', 'closed', 'expired', 'cancelled'];

// `wallet_txn.meta.type`
export const WALLET_TXN_TYPE = ['topup', 'spend', 'refund'];

export const TXT_STD = {
    vi: {
        notEnoughXu: 'Không đủ Xu — vui lòng nạp thêm.',
        buyXu: 'Mua Xu',
        sendProposal: 'Gửi đề nghị',
        counterOffer: 'Đề xuất lại',
        accept: 'Chấp nhận',
        decline: 'Từ chối',
        unlockContact: 'Mở thông tin liên hệ',
        markInProgress: 'Bắt đầu công việc',
        submitWork: 'Nộp bàn giao',
        confirmCompleted: 'Xác nhận hoàn thành',
        openDispute: 'Báo cáo tranh chấp',
        submitReview: 'Gửi đánh giá',
    },
    en: {
        notEnoughXu: 'Not enough Xu — please top up.',
        buyXu: 'Buy Xu',
        sendProposal: 'Send proposal',
        counterOffer: 'Counter offer',
        accept: 'Accept',
        decline: 'Decline',
        unlockContact: 'Unlock contact',
        markInProgress: 'Start work',
        submitWork: 'Submit work',
        confirmCompleted: 'Confirm completed',
        openDispute: 'Open dispute',
        submitReview: 'Submit review',
    },
};
