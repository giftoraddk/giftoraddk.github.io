# Design Specification: Modern SaaS Bento UI

## 1. Overview
This design system follows a **Modern SaaS / Bento Grid** aesthetic. It prioritizes clarity, whitespace, and a friendly yet professional atmosphere through large corner radiuses and a clean color palette.

## 2. Visual Style & Principles
*   **Layout Strategy:** Component-based "Bento" grid. Elements are encapsulated in cards with distinct shadows or borders.
*   **Corner Radius:** 
    *   **Large (Cards/Buttons):** 16px - 24px (gives a soft, approachable feel).
    *   **Medium (Inputs):** 12px - 16px.
*   **Shadows:** Soft, diffused drop shadows (e.g., `0 4px 20px rgba(0,0,0,0.05)`) to create depth without harsh lines.
*   **Spacing:** Generous inner padding (typically 24px) for card components.

## 3. Color Palette
*   **Primary:** `#0080FF` (Electric Blue) - Used for primary CTAs and active states.
*   **Success:** `#22C55E` (Green) - Used for confirmation or positive indicators.
*   **Danger/Destructive:** `#EF4444` (Red) - Used for delete actions or warnings.
*   **Neutral/Backgrounds:**
    *   **App Background:** `#F8F9FA` (Very light gray).
    *   **Card Background:** `#FFFFFF` (Pure white).
    *   **Borders/Dividers:** `#E5E7EB` (Light gray stroke).
*   **Typography Colors:**
    *   **Heading:** `#111827` (Near black).
    *   **Body:** `#4B5563` (Dark gray).
    *   **Muted/Label:** `#9CA3AF` (Light gray).

## 4. Typography
*   **Font Family:** Sans-serif (Inter, Roboto, or SF Pro).
*   **Weights:** Regular (400), Medium (500), Semi-Bold (600).
*   **Scale:**
    *   **H1:** 24px / 32px line-height (Semi-Bold).
    *   **Body:** 14px / 20px line-height (Regular).
    *   **Small/Muted:** 12px / 16px line-height (Regular).

## 5. UI Components
### 5.1 Buttons
*   **Primary:** Solid background (`#0080FF`), white text. High-contrast.
*   **Secondary/Outline:** Transparent background, gray or blue border.
*   **Social Auth:** Light gray background (`#F3F4F6`), centered icons (Google/Apple).

### 5.2 Form Elements
*   **Inputs:** Large height (~48px), rounded corners, clear labels above the field.
*   **Toggles:** Smooth animation, blue when active.
*   **OTP/Verification:** Individual square/rounded cells for each digit.

### 5.3 Feedback & Notifications
*   **Modals:** Centered, large radius, prominent buttons for decision-making (e.g., Save vs. Discard).
*   **Progress Bars/Sliders:** Thin tracks with large, easy-to-grab handles.

## 6. Iconography
*   **Style:** Minimalist line icons or soft filled icons.
*   **Color:** Matches the text or primary color depending on context.
