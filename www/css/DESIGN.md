# Design System Document: Repertório

## 1. Overview & Creative North Star: "The Orchestrated Gallery"

The creative direction for this design system is **"The Orchestrated Gallery."** We are moving away from the "utility app" aesthetic and toward a high-end editorial experience. Music is an art form of depth and resonance; the interface must reflect this through sophisticated layering, rhythmic spacing, and a rejection of the "boxy" web.

Instead of a rigid grid, we embrace **intentional asymmetry** and **tonal depth**. We treat the screen as a stage where the content (the repertoire) is the performer, and the UI is the atmospheric lighting and architecture surrounding it. By utilizing deep navy tones against ethereal light surfaces, we create a high-contrast environment that feels both authoritative and breathable.

---

## 2. Colors: Tonal Depth over Structural Lines

This system utilizes a "No-Line" philosophy. Traditional 1px borders are clumsy; they interrupt the user's flow. Instead, we define space through **Tonal Transitions**.

### Color Palette Reference
- **Primary Focus:** `primary` (#000666) and `primary_container` (#1a237e).
- **Surface Hierarchy:** `surface` (#fbf8ff) to `surface_container_highest` (#e4e1ea).
- **Accents:** `tertiary` (#705d00) provides high-contrast focus for gold-standard repertoire or featured items.

### The "No-Line" Rule
Prohibit the use of 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts. For example, a `surface_container_low` card sitting on a `surface` background creates a natural, soft boundary that feels premium.

### The Glass & Gradient Rule
To move beyond "out-of-the-box" Material Design, all floating elements (like player controls or navigation bars) should utilize **Glassmorphism**. 
- **Effect:** Apply `surface` at 80% opacity with a 16px to 24px backdrop-blur. 
- **Signature Texture:** Use a subtle linear gradient for primary CTAs, transitioning from `primary` (#000666) at the top-left to `primary_container` (#1a237e) at the bottom-right. This adds "soul" and dimension.

---

## 3. Typography: The Manrope Editorial

We have selected **Manrope** for its modern, geometric structure and excellent legibility. It bridges the gap between the technical precision of a musical score and the warmth of a luxury brand.

- **Display (Large/Mid):** Used for artist names or repertoire titles. Tracking should be set to -2% to feel tight and custom.
- **Headlines:** Use `headline-sm` for section titles (e.g., "Recently Played"). These should always be in `on_surface` to maintain authority.
- **Body:** `body-lg` is your workhorse. Ensure a line height of 1.5x to maintain an "editorial" feel, preventing the text from looking like a data-heavy spreadsheet.
- **Labels:** `label-sm` should be used sparingly for metadata (BPM, Key, Duration). Use `on_surface_variant` to deprioritize them visually.

---

## 4. Elevation & Depth: The Layering Principle

We achieve hierarchy through **Tonal Layering** rather than traditional drop shadows. Think of the UI as stacked sheets of fine, semi-translucent paper.

- **The Stack:**
    1. Base: `surface`
    2. Content Grouping: `surface_container_low`
    3. Active Interaction/Cards: `surface_container_highest`
- **Ambient Shadows:** When a "floating" element is necessary (e.g., a floating action button for "Add Song"), use a shadow with a 32px blur, 0px offset, and 6% opacity. The shadow color must be a tint of `primary` (#000666), not pure black, to keep the depth "ambient."
- **Ghost Borders:** If an element requires more definition (e.g., an input field), use the `outline_variant` token at **15% opacity**. Never use 100% opaque outlines.

---

## 5. Components

### Buttons
- **Primary:** Rounded `full` (pill-shape). Uses the Signature Texture gradient. Typography: `label-md`, white, uppercase with 0.05rem letter spacing.
- **Secondary:** Transparent background with a `Ghost Border` and `primary` text.
- **Tertiary:** No background, no border. Purely typographic.

### Cards & Music Lists
- **Rule:** Forbid divider lines between list items. 
- **Execution:** Use vertical white space (16px/1rem) and subtle background shifts on hover (`surface_container_high`). 
- **Asymmetry:** For album/track cards, use a slightly larger corner radius on the top-left (`xl`: 1.5rem) and the standard radius (`md`: 0.75rem) on the others to create a signature "editorial" look.

### Input Fields
- **Style:** Use the `surface_container_low` background with no border. 
- **Focus State:** Transitions to `surface_container_highest` with a 1px `primary` ghost border at 20% opacity.

### Repertoire-Specific Components
- **The Progress Bar (Player):** Use `primary` for the active track and `outline_variant` (20% opacity) for the remaining track. The "knob" should be a `tertiary` (#705d00) accent to make it pop.
- **Key/BPM Tags:** Use `secondary_container` with `on_secondary_container` text. Roundedness should be `sm` (0.25rem) to differentiate them from action chips.

---

## 6. Do’s and Don’ts

### Do:
- **Do** use whitespace as a functional tool. If a screen feels crowded, increase the spacing before adding a line.
- **Do** use the `tertiary` gold accent for high-value interactions like "Mastered" or "Favorite."
- **Do** leverage `surface_bright` for areas that need to capture the user's eye immediately.

### Don’t:
- **Don’t** use pure black (#000000) for shadows or text. It breaks the "Orchestrated Gallery" sophistication.
- **Don’t** use standard 4px or 8px rounded corners for everything. Mix `xl` (1.5rem) for containers and `full` for interactive buttons to create visual rhythm.
- **Don’t** use dividers. If the content isn't clearly separated, your tonal shifts are too subtle. Increase the contrast between `surface` and `surface_container`.

---

## 7. Roundedness Scale Reference
- **xl (1.5rem):** Main content containers, Hero cards.
- **lg (1rem):** Secondary cards, Modals.
- **md (0.75rem):** Standard component default.
- **full (9999px):** Buttons, Search bars, Chips.