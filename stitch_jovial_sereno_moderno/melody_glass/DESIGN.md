# Design System Specification: The Melodic Editorial

## 1. Overview & Creative North Star
**The Creative North Star: "The Digital Curator"**
This design system moves away from the clinical, "utility-first" feel of standard sheet music software. Instead, it adopts a **High-End Editorial** aesthetic. It treats a musician’s repertoire not as a list of files, but as a curated gallery. 

The system achieves a "serene yet energetic" personality by balancing vast amounts of whitespace (breathing room) with intentional asymmetry. We break the traditional grid by overlapping elements—such as a floating glass card partially obscuring a large, high-contrast display title—to create a sense of rhythm and depth. The goal is to make the user feel like they are interacting with a premium physical magazine that has come to life.

---

## 2. Colors
Our palette avoids harsh contrasts, opting instead for a tonal "wash" that reduces eye strain during long practice sessions while using vibrant accents to highlight creative energy.

### Core Palette
- **Primary (The Anchor):** `#425ca3` (Deep Serene Blue). Used for core branding and primary actions.
- **Secondary (The Calm):** `#2a6a57` (Mint Forest). Used for organizational elements and success states.
- **Tertiary (The Spark):** `#a53c30` (Coral Energy). Used sparingly for high-energy callouts, recording indicators, or "favorite" actions.
- **Surface & Background:** Base background starts at `#f8f9ff` (Ice Blue), providing a cool, modern foundation.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined through:
1.  **Background Shifts:** Use `surface-container-low` for secondary sections sitting on a `surface` background.
2.  **Tonal Transitions:** Define areas by shifting from `surface` to `surface-variant`.

### The "Glass & Gradient" Rule
To elevate the UI beyond a standard template, use **Glassmorphism** for floating controllers (metronomes, tuners, or playback bars). 
- **Recipe:** Apply `surface` color at 60% opacity with a `24px` backdrop blur.
- **Signature Textures:** Use a subtle linear gradient from `primary` to `primary-container` on major CTAs to give them a "convex," tactile feel.

---

## 3. Typography
We utilize a pairing of **Plus Jakarta Sans** for expressive headers and **Manrope** for functional clarity. This combination balances youthful energy with professional readability.

| Level | Token | Font Family | Size | Character |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Plus Jakarta Sans | 3.5rem | Bold, editorial, asymmetric placement. |
| **Headline** | `headline-md` | Plus Jakarta Sans | 1.75rem | Assertive, used for category titles. |
| **Title** | `title-lg` | Manrope | 1.375rem | Semi-bold, for song titles. |
| **Body** | `body-lg` | Manrope | 1rem | High legibility for lyrics/notes. |
| **Label** | `label-md` | Manrope | 0.75rem | Uppercase with 5% tracking for metadata. |

---

## 4. Elevation & Depth
In this system, depth is a matter of **Tonal Layering**, mimicking physical sheets of paper stacked on a light table.

*   **The Layering Principle:** 
    *   Base: `surface`
    *   Sectioning: `surface-container-low`
    *   Floating Cards: `surface-container-lowest` (pure white) to create a natural "pop" against the tinted background.
*   **Ambient Shadows:** For high-priority floating elements, use a shadow with a 40px blur, 0% spread, and 6% opacity using the `on-surface` tint. It should feel like a soft glow, not a drop shadow.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline-variant` at **15% opacity**. Never use 100% opaque lines.
*   **Roundedness Scale:**
    *   **Default:** `1rem` (16px) for standard cards.
    *   **Large/XL:** `2rem` to `3rem` (32px - 48px) for hero containers and search bars to reinforce the "soft/youthful" vibe.

---

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary-dim`), `xl` roundedness, white text. 
*   **Secondary:** `surface-container-highest` fill with `primary` text. No border.
*   **Tertiary:** Ghost style. No fill, no border. Text only in `primary` with an underline on hover.

### Cards & Lists
*   **Sheet Music Cards:** Use `surface-container-lowest` with a `md` (1.5rem) corner radius. **Never use dividers.** Separate list items using `1.5rem` of vertical white space or a subtle shift to `surface-container-low` on hover.
*   **Selection Chips:** Use `secondary-container` for active states. Use `full` roundedness (pills).

### Input Fields
*   **Text Inputs:** Soft `surface-variant` backgrounds with `none` or `ghost` borders. The focus state should be a subtle glow, not a heavy stroke.

### Contextual Components (Music Specific)
*   **The "Floating Maestro":** A glassmorphic playback bar that floats at the bottom of the screen. Use `backdrop-blur` and a `surface` tint.
*   **Annotation Chips:** Small, `tertiary-fixed` (Coral) chips used to mark "Difficulty" or "Mood" on a score without cluttering the visual field.

---

## 6. Do’s and Don’ts

### Do
*   **DO** use intentional asymmetry. Place a large `display-lg` title on the left and let the content flow naturally around it.
*   **DO** prioritize whitespace. If a screen feels "busy," increase the padding between containers to at least `2rem`.
*   **DO** use "surface-tint" for subtle background washes to keep the app feeling serene.

### Don’t
*   **DON’T** use black (`#000000`). Our darkest color is `on-surface` (`#2d333b`), which maintains a softer, more organic feel.
*   **DON’T** use 1px dividers to separate songs in a list. Use negative space.
*   **DON’T** use standard "Material Design" shadows. Keep them diffused and tinted.
*   **DON’T** cram information. If a piece of metadata isn't essential, hide it behind a "more" icon to maintain the calm atmosphere.