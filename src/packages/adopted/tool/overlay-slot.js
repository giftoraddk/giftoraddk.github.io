// Slot name shared by the three layers a `light: true` overlay passes through:
// <svc-node> light child → <svc-node> shadow slot (forwarded) → <svc-popover> panel slot.
export const overlaySlotName = (nodeId) => `overlay-${nodeId}`;

export const isLightOverlay = (overlay) => overlay?.type === 'component' && overlay.light === true;
