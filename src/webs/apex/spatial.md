
# Design System: Modern Glassmorphism Streaming Interface

## 1. Design Vision & Philosophy
This design system aims to create an immersive, futuristic, and high-depth user experience for streaming platforms. It combines the tactile feel of **Glassmorphism** with the organized structure of **Bento Grids**, emphasizing visual hierarchy through transparency and blur.

## 2. Core Visual Language

### Glassmorphism Principles
*   **Backdrop Blur:** 24px to 40px to create a soft, "frosted" look that separates layers without losing context.
*   **Transparency (Fill):** White or light grey at 5-15% opacity.
*   **Borders:** 1px solid stroke with 10-20% white opacity. This "inner glow" or "rim light" is crucial for defining shapes on dark backgrounds.
*   **Layering:** Elements should feel like they are floating at different Z-indexes.

### Layout (Bento Grid)
*   **Container Corner Radius:** Large, consistent rounding (24px - 32px).
*   **Grid Structure:** Use non-uniform but mathematically aligned cells. Primary content takes larger spans, while secondary metadata fits into smaller, supporting tiles.
*   **Spacing:** Generous gutters (16px - 24px) to let the background gradients breathe between cards.

## 3. Design Tokens

### Color Palette
*   **Primary Background:** Deep, dark gradients (e.g., #0F0F0F to #1A1A1A).
*   **Accent Colors:** Dynamic, derived from movie poster key art (vibrant reds, cyans, oranges).
*   **Text (Primary):** #FFFFFF (High contrast).
*   **Text (Secondary):** #FFFFFF with 60% opacity or Light Grey (#B0B0B0).

### Typography
*   **Family:** Modern Sans-serif (e.g., *Plus Jakarta Sans*, *Inter*, or *Montserrat*).
*   **Headlines:** Semi-bold to Bold, tracking -1%, 24pt+.
*   **Body:** Regular, 14pt - 16pt, increased line height (1.5) for readability on blurred backgrounds.

## 4. UI Components

### Movie Cards
*   **Static State:** Minimalist with just the title and a subtle play indicator.
*   **Hover State:** Increase scale slightly (1.02x), intensify the border glow, and reveal metadata (rating, duration).

### Navigation (Sidebar)
*   **Width:** Narrow (64px - 80px) for icon-only or standard (240px) for labels.
*   **Material:** Semi-transparent glass to allow the background wallpaper to peek through.

## 5. Implementation Best Practices
1.  **High-Quality Assets:** Use high-resolution, vibrant imagery as the "light source" behind the glass layers.
2.  **Readability First:** Always ensure WCAG contrast ratios for text. If the background is too busy, increase the fill opacity of the glass container.
3.  **Motion:** Use subtle transitions for glass panels (ease-in-out) to simulate physical weight and transparency shifts.

---

# Design System Documentation: Cinematic Glass & Bento Grid

## 1. Overview & Creative North Star

This design system is built to transform the traditional movie-watching interface into an immersive, editorial experience. We are moving away from the "catalog" feel of legacy streaming platforms and toward **"The Atmospheric Gallery."**



Our Creative North Star is **Cinematic Immersion**. The UI should never feel like a barrier between the user and the content; instead, it should act as a sophisticated, frosted lens that reacts to the vibrant colors of the films themselves. By utilizing a high-end Bento Grid layout, we create intentional asymmetry that guides the eye toward featured content while maintaining a disciplined, premium structure.



## 2. Colors & Surface Philosophy

The palette is rooted in a deep, obsidian base to allow cinematic content to breathe and "pop."



### Surface Hierarchy & The "No-Line" Rule

To achieve a high-end editorial feel, **this design system prohibits the use of 1px solid borders for sectioning.** Conventional lines create visual clutter. Instead, boundaries must be defined through:

* **Tonal Transitions:** Shifting from `surface` (#0e0e0e) to `surface_container_low` (#131313) to define distinct areas.

* **Nesting:** Depth is created by "stacking" layers. A `surface_container_high` card should sit atop a `surface_container` background, creating a natural, soft separation.



### The Glass & Gradient Rule

Floating elements (such as the navigation sidebar or the play controller) must utilize **Glassmorphism**. Use semi-transparent variants of `surface_variant` with a heavy backdrop-blur (20px–40px).

* **Signature Textures:** For primary actions, move beyond flat colors. Apply a subtle linear gradient transitioning from `primary` (#69daff) to `primary_container` (#00cffc) at a 135-degree angle to provide a "lit from within" glow.



## 3. Typography

The typography strategy relies on the interplay between the authoritative **Plus Jakarta Sans** for display and the functional, high-legibility **Manrope** for metadata.



* **Editorial Impact:** Use `display-lg` (3.5rem) in Plus Jakarta Sans for hero movie titles. The tight kerning and bold weight convey a "theatrical poster" aesthetic.

* **Functional Clarity:** Metadata (duration, genre, year) should utilize `label-md` (0.75rem) in Manrope.

* **Visual Hierarchy:** Titles and headings should always be `on_surface` (#ffffff), while secondary descriptions should drop to `on_surface_variant` (#adaaaa) to ensure the user's focus remains on the primary narrative.



## 4. Elevation & Depth

In this design system, elevation is an atmospheric property, not a structural one.



* **Tonal Layering:** Achieve hierarchy by stacking containers. For example, the "Continue Watching" rail should sit on a `surface_container_low` (#131313) strip, while individual movie cards use `surface_container_highest` (#262626).

* **Ambient Shadows:** When a card needs to "float" (e.g., a hover state), use an extra-diffused shadow.

* *Value:* Offset: 0 20px, Blur: 40px.

* *Color:* Use `on_surface` at 5% opacity or, ideally, a tinted version of the movie’s primary color at 8% opacity to mimic light reflecting off a screen.

* **The Ghost Border:** If accessibility requires a border, use the `outline_variant` (#484847) at a 15% opacity max. This is a "Ghost Border"—present for the eye to find, but never enough to interrupt the flow.



## 5. Components



### Pill-Shaped Buttons

All buttons must use the `full` roundedness token (9999px).

* **Primary Button:** `primary` (#69daff) background with `on_primary` (#004a5d) text. These should feel like glowing orbs of interaction.

* **Secondary/Glass Button:** A semi-transparent `surface_variant` background with a backdrop blur. This allows the movie artwork to peek through the button itself.



### The Bento Cards

Cards are the heart of the streaming experience.

* **Radius:** Use `lg` (2rem) for standard cards and `xl` (3rem) for the main container housing the grid.

* **Separation:** Forbid divider lines. Use vertical white space and the `surface_container` tiers to create separation.

* **Content Overlay:** Gradient overlays on cards should transition from `transparent` to `surface_container_lowest` (#000000) at 60% opacity to ensure text legibility over movie posters.



### Search & Inputs

The search bar should be treated as a "hollowed-out" surface. Use `surface_container_highest` (#262626) with a subtle inner shadow to give it a recessed, tactile feel.



## 6. Do's and Don'ts



### Do:

* **Do** use asymmetrical Bento Grid layouts (e.g., one 2x2 card next to two 1x1 cards) to create visual interest.

* **Do** utilize the vibrant `secondary` (#ac89ff) and `tertiary` (#ff6b98) tokens for categories like "Trending" or "Live" to inject energy into the dark interface.

* **Do** apply `backdrop-filter: blur()` to any element that sits over a movie image.



### Don't:

* **Don't** use 100% opaque, high-contrast borders. It breaks the "Atmospheric Gallery" illusion.

* **Don't** use standard "drop shadows" with 0 blur. Shadows must be soft, large, and ambient.

* **Don't** crowd the interface. If a layout feels tight, increase the spacing and let the `background` (#0e0e0e) provide the necessary breathing room.

---