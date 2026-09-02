/**
 * Smart Popover Component - Thư viện popover thông minh
 * Tự động điều chỉnh vị trí và giữ vị trí cuối cùng khi trigger bị khuất
 */

class SmartPopover {
	constructor() {
		this.popovers = new Map();
		this.observer = null;
		this.init();
	}

	init() {
		this.initObserver();
		document.querySelectorAll('[data-popover]').forEach((trigger) => this.createPopover(trigger));
		document.addEventListener('click', (e) => this.handleOutsideClick(e));
		window.addEventListener('resize', () => this.updateAllPositions());
		window.addEventListener('scroll', () => this.updateAllPositions(), true);
	}

	initObserver() {
		this.observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					const instance = this.popovers.get(entry.target.getAttribute('data-popover'));
					if (!instance) return;

					instance.isVisible = entry.isIntersecting;

					if (!entry.isIntersecting && instance.isOpen) {
						// Trigger bị khuất - tắt popover
						this.freezePosition(instance);
					}
				});
			},
			{ threshold: 0.1 }
		);
	}

	/**
	 * General method to create both tooltip and popover
	 * type: 'tooltip' | 'popover'
	 */
	createFloating(trigger, options = {}) {
		let popover,
			id,
			isTooltip = options.type === 'tooltip';

		if (isTooltip) {
			// Create tooltip element
			popover = document.createElement('div');
			popover.className = 'tip';
			popover.textContent = options.content || '';
			id = `tip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		} else {
			// Use existing popover element
			id = trigger.getAttribute('data-popover');
			popover = document.getElementById(id);
			if (!popover) return;
		}

		const instance = {
			trigger,
			popover,
			id,
			isOpen: false,
			isVisible: true,
			action: trigger.getAttribute('data-action') || (isTooltip ? 'hover' : 'click'),
			placement: trigger.getAttribute('data-placement') || (isTooltip ? 'top' : null),
			offset: parseInt(trigger.getAttribute('data-offset')) || (isTooltip ? 4 : 8),
			lastPosition: null,
		};

		this.popovers.set(id, instance);
		this.setupEvents(instance);

		if (isTooltip) {
			trigger.appendChild(popover);
		} else {
			this.setupStyles(popover);
			// Ensure popover is inside trigger initially
			if (popover.parentElement !== trigger) {
				trigger.appendChild(popover);
			}
		}

		this.observer.observe(trigger);
	}

	createPopover(trigger) {
		const tipContent = trigger.getAttribute('data-tip');
		if (tipContent) {
			this.createFloating(trigger, { type: 'tooltip', content: tipContent });
		} else {
			this.createFloating(trigger, { type: 'popover' });
		}
	}

	setupStyles(popover) {
		Object.assign(popover.style, {
			position: 'relative',
			zIndex: '1000',
			display: 'none',
		});
	}

	setupEvents(instance) {
		const { trigger, action } = instance;

		if (action === 'hover') {
			trigger.addEventListener('mouseenter', () => this.show(instance.id));
			trigger.addEventListener('mouseleave', () => this.hide(instance.id));
		} else {
			trigger.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.toggle(instance.id);
			});
		}
	}

	show(id) {
		const instance = this.popovers.get(id);
		if (!instance || instance.isOpen) return;

		instance.isOpen = true;

		// Khôi phục position fixed khi mở popover
		Object.assign(instance.popover.style, {
			position: 'fixed',
			zIndex: '1000',
			display: 'block',
		});

		// Di chuyển popover về body nếu đang ở trong trigger
		if (instance.popover.parentElement === instance.trigger) {
			document.body.appendChild(instance.popover);
		}

		this.updatePosition(instance);
		instance.trigger.classList.add('popover-active');
	}

	hide(id) {
		const instance = this.popovers.get(id);
		if (!instance || !instance.isOpen) return;

		instance.isOpen = false;

		// Ẩn popover
		instance.popover.style.display = 'none';

		// Di chuyển popover về trigger nếu đang ở body
		if (instance.popover.parentElement === document.body) {
			instance.trigger.appendChild(instance.popover);
		}

		instance.trigger.classList.remove('popover-active');
	}

	toggle(id) {
		const instance = this.popovers.get(id);
		if (!instance) return;
		instance.isOpen ? this.hide(id) : this.show(id);
	}

	updatePosition(instance) {
		if (instance.popover.style.position !== 'fixed') return; // Chỉ cập nhật khi position fixed

		const { trigger, popover, offset, placement } = instance;
		const triggerRect = trigger.getBoundingClientRect();
		const popoverRect = popover.getBoundingClientRect();
		const viewport = { width: window.innerWidth, height: window.innerHeight };

		let finalPlacement;

		// Nếu có placement được chỉ định
		if (placement) {
			// Kiểm tra xem placement có khả thi không
			if (this.isPlacementFeasible(placement, triggerRect, popoverRect, viewport)) {
				finalPlacement = placement;
			} else {
				// Nếu không khả thi, tự động tính toán placement tối ưu
				finalPlacement = this.getOptimalPlacement(triggerRect, popoverRect, viewport);
			}
		} else {
			// Không có placement được chỉ định, tự động tính toán
			finalPlacement = this.getOptimalPlacement(triggerRect, popoverRect, viewport);
		}

		const position = this.calculatePosition(triggerRect, popoverRect, finalPlacement, offset);
		const adjustedPosition = this.adjustToViewport(position, popoverRect, viewport);

		// Lưu vị trí cuối cùng khi trigger còn visible
		if (instance.isVisible) {
			instance.lastPosition = { ...adjustedPosition };
		}

		Object.assign(popover.style, {
			top: `${adjustedPosition.top}px`,
			left: `${adjustedPosition.left}px`,
		});
	}

	freezePosition(instance) {
		// Khi trigger bị khuất, tắt popover luôn
		this.hide(instance.id);
	}

	getOptimalPlacement(triggerRect, popoverRect, viewport) {
		const spaces = {
			bottom: viewport.height - triggerRect.bottom,
			top: triggerRect.top,
			right: viewport.width - triggerRect.right,
			left: triggerRect.left,
		};

		const required = {
			bottom: popoverRect.height + 8,
			top: popoverRect.height + 8,
			right: popoverRect.width + 8,
			left: popoverRect.width + 8,
		};

		// Ưu tiên: bottom > top > right > left
		const priorities = ['bottom', 'top', 'right', 'left'];

		for (const placement of priorities) {
			if (spaces[placement] >= required[placement]) {
				return placement;
			}
		}

		// Fallback: chọn hướng có nhiều không gian nhất
		return Object.entries(spaces).reduce((a, b) => (spaces[a] > spaces[b] ? a : b))[0];
	}

	// Method mới để kiểm tra xem placement có khả thi không
	isPlacementFeasible(placement, triggerRect, popoverRect, viewport) {
		const spaces = {
			bottom: viewport.height - triggerRect.bottom,
			top: triggerRect.top,
			right: viewport.width - triggerRect.right,
			left: triggerRect.left,
		};

		const required = {
			bottom: popoverRect.height + 8,
			top: popoverRect.height + 8,
			right: popoverRect.width + 8,
			left: popoverRect.width + 8,
		};

		return spaces[placement] >= required[placement];
	}

	calculatePosition(triggerRect, popoverRect, placement, offset) {
		let top, left;

		switch (placement) {
			case 'top':
				top = triggerRect.top - popoverRect.height - offset;
				left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
				break;
			case 'bottom':
				top = triggerRect.bottom + offset;
				left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
				break;
			case 'left':
				top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2;
				left = triggerRect.left - popoverRect.width - offset;
				break;
			case 'right':
				top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2;
				left = triggerRect.right + offset;
				break;
			default:
				top = triggerRect.bottom + offset;
				left = triggerRect.left;
		}

		return { top, left };
	}

	adjustToViewport(position, popoverRect, viewport) {
		let { top, left } = position;

		// Điều chỉnh theo chiều ngang
		if (left < 0) left = 0;
		else if (left + popoverRect.width > viewport.width) {
			left = viewport.width - popoverRect.width;
		}

		// Điều chỉnh theo chiều dọc
		if (top < 0) top = 0;
		else if (top + popoverRect.height > viewport.height) {
			top = viewport.height - popoverRect.height;
		}

		return { top, left };
	}

	updateAllPositions() {
		this.popovers.forEach((instance) => {
			if (instance.isOpen && instance.isVisible && instance.popover.style.position === 'fixed') {
				this.updatePosition(instance);
			}
		});
	}

	handleOutsideClick(e) {
		this.popovers.forEach((instance) => {
			if (instance.isOpen && !instance.trigger.contains(e.target) && !instance.popover.contains(e.target)) {
				this.hide(instance.id);
			}
		});
	}

	addPopover(trigger) {
		this.createPopover(trigger);
	}

	removePopover(id) {
		const instance = this.popovers.get(id);
		if (instance) {
			this.hide(id);
			this.observer.unobserve(instance.trigger);
			this.popovers.delete(id);
		}
	}

	destroy() {
		this.popovers.forEach((instance) => {
			this.observer.unobserve(instance.trigger);
		});
		this.popovers.clear();
		this.observer.disconnect();
	}

	/**
	 * Public function to hide popover(s)
	 * @param {string} [id] - Optional popover ID. If not provided, hide all popovers
	 */
	hidePopover(id = null) {
		if (id) {
			// Hide specific popover by ID
			this.hide(id);
		} else {
			// Hide all popovers
			this.popovers.forEach((instance) => {
				this.hide(instance.id);
			});
		}
	}
}

document.addEventListener('astro:page-load', function () {
	// Khởi tạo
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => {
			window.Popover = new SmartPopover();
		});
	} else {
		window.Popover = new SmartPopover();
	}
});
