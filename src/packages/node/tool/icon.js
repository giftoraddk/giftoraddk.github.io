// A node's `icon` is either an Iconify name ('ri:add-box-line' — rendered with <iconify-icon>) or an image URL.
export const ICON_NAME = /^[a-z0-9-]+:[a-z0-9-]+$/i;

export const isIconName = (icon) => typeof icon === 'string' && ICON_NAME.test(icon);
