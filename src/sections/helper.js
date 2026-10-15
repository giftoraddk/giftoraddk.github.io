export const getStyleOpts = ({
	hueCustom,
	rounded = '0',
	blur = false,
	gradient = true,
	tint = '',
	total = 2,
	blobType = 'ellipse',
	colorful = false,
	deg = 135,
  distance = 86,
}) => {
	// hueCustom (0|1) là preset flat-bg: ép gradient/blur về false và dùng tint
	// làm màu nền đặc thay vì seed blob — xem quy ước tint tại svc-underlay.js render().
	const presetTint = {
		0: 'transparent',
		1: 'color-mix(in oklab, var(--color-base-300, #393939) 15%, transparent)',
	}[hueCustom];
	return {
		rounded,
		blur: presetTint ? false : blur,
		gradient: presetTint ? false : gradient,
		tint: presetTint || tint,
		total,
		blobType,
		colorful,
		deg,
    distance,
	};
};