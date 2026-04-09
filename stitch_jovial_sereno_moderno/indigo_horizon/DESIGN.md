# Design System Specification: Editorial Serenity

## 1. Overview & Creative North Star: "The Elevated Perspective"
This design system moves beyond the rigid, utilitarian nature of standard Material Design 3. Our Creative North Star is **"The Elevated Perspective"**—a philosophy that treats digital interfaces like a high-end editorial layout. 

While we utilize the functional logic of M3, we reject the "template" look. We achieve a premium feel through **intentional asymmetry**, **exaggerated white space**, and **tonal layering**. The goal is to create an environment that feels motivating and serene, guiding the user’s focus through soft depth and sophisticated typography rather than loud borders or cluttered grids. We don't just display data; we curate an experience.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule
The palette is rooted in a vibrant yet calming Indigo core, supported by a lush, organic Tertiary green for motivational feedback.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. Boundaries must be defined solely through:
1. **Background Color Shifts:** Placing a `surface-container-low` component on a `surface` background.
2. **Subtle Tonal Transitions:** Using depth to imply edges.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine paper. Use the surface tiers to create "nested" importance:
*   **Base Layer:** `surface` (#f9f5ff) — The canvas.
*   **Sectional Layer:** `surface-container-low` (#f3eeff) — Large layout blocks.
*   **Active Component Layer:** `surface-container-highest` (#ddd9ff) — To highlight focus areas.
*   **Floating Elements:** `surface-container-lowest` (#ffffff) — Reserved for cards that need the most "lift."

### The "Glass & Gradient" Rule
To escape the "flat" look of standard UI:
*   **Glassmorphism:** Use `surface-container-lowest` at 70% opacity with a `24px` backdrop blur for floating headers or navigation rails.
*   **Signature Gradients:** For primary CTAs, use a linear gradient (135°) from `primary` (#4555a8) to `primary-container` (#96a5ff). This provides a "glow" that flat colors cannot replicate.

---

## 3. Typography: Editorial Authority
We utilize **Plus Jakarta Sans** for its geometric clarity and modern, open counters. The hierarchy is designed to feel like a premium magazine.

*   **Display (lg/md/sm):** Use for "Hero" moments. Tighten letter-spacing by `-0.02em` to create a bold, authoritative look.
*   **Headlines & Titles:** These are your navigational anchors. Ensure `headline-lg` has ample breathing room above it—at least double the spacing used below it—to create an asymmetrical, editorial rhythm.
*   **Body (lg/md/sm):** Optimized for high legibility. Use `on-surface-variant` (#595781) for long-form body text to reduce eye strain and maintain a serene contrast ratio.
*   **Labels:** Always uppercase with `+0.05em` letter-spacing to distinguish them from functional body text.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are a fallback, not a standard. We communicate hierarchy through light and density.

*   **The Layering Principle:** Instead of a shadow, place a `surface-container-lowest` (#ffffff) card on a `surface-container-low` (#f3eeff) background. The slight shift in brightness creates a "soft lift."
*   **Ambient Shadows:** If a floating state is required (e.g., a Modal or FAB), use a custom shadow:
    *   `y: 8px, blur: 24px, color: rgba(44, 42, 81, 0.06)` (A tinted version of `on-surface`).
*   **The "Ghost Border":** If a border is required for accessibility (e.g., input fields), use `outline-variant` (#aca8d7) at **15% opacity**. Never use 100% opaque lines.
*   **Softened Geometry:** Adhere to the `xl` (1.5rem/24px) radius for all cards. This large radius softens the interface, making it feel approachable and "human."

---

## 5. Components: Style & Intent

### Buttons
*   **Primary:** Gradient-filled (Primary to Primary-Container) with `full` (9999px) radius. No shadow.
*   **Secondary:** `surface-container-high` background with `primary` text.
*   **Tertiary:** Text-only, but with an increased `font-weight: 600` for clear intent.

### Input Fields
*   **Surface:** `surface-container-lowest`.
*   **Border:** "Ghost Border" (15% `outline-variant`).
*   **Active State:** The border transitions to 100% `primary` but only at 1px thickness to maintain elegance.

### Cards & Lists
*   **The Divider Ban:** Vertical lines are forbidden. Separate list items using `16px` of vertical white space or a very subtle background tint change on hover.
*   **Asymmetric Cards:** For "Motivating" content, try using slightly asymmetric padding (e.g., `32px` on top, `24px` on sides) to break the grid and feel custom-crafted.

### Progress & Motivation (The "Success" System)
*   **Tertiary Tokens:** Use `tertiary` (#176a21) for progress bars and completion states. 
*   **The Glow:** Active progress indicators should have a subtle `tertiary-container` outer glow to symbolize energy and achievement.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use "Optical Centering." Sometimes a button label looks better slightly higher than the mathematical center.
*   **Do** embrace "Negative Space." If a screen feels crowded, remove a container rather than shrinking the text.
*   **Do** use `surface-dim` for inactive or "backgrounded" states to push them into the distance visually.

### Don't:
*   **Don't** use pure black (#000000) for text. Always use `on-surface` (#2c2a51) to maintain the indigo-tinted serenity.
*   **Don't** use standard M3 "Elevated" shadows. They are too heavy for this "Editorial" aesthetic.
*   **Don't** use a divider line between a header and a body. Use a change in background color or a significant typographic jump.
*   **Don't** use the `error` color for anything other than critical, destructive actions. Use `primary-dim` for "warning" states to keep the mood serene.