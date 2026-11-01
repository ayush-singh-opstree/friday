# Part 7: UI/UX Design System and Screen Specifications

---

## Design Principles

1. **Clarity over density** — Show only what the user needs right now. Progressive disclosure for everything else.
2. **Relationships have texture** — Use warm, human colours. Avoid the cold grey of productivity tools.
3. **Speed is a feature** — Every interaction should feel instantaneous. No unnecessary confirmation steps.
4. **White space is intentional** — Breathing room signals importance. Dense screens signal overwhelm.
5. **Consistent affordances** — The same action always looks and feels the same across screens.

---

## Colour System

### Brand Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#4F6AF5` | Primary actions, active tabs, CTAs |
| `--color-primary-light` | `#EEF1FE` | Primary backgrounds, chips, hover states |
| `--color-primary-dark` | `#3B52C4` | Primary hover, pressed states |
| `--color-accent` | `#F5A623` | Attention scores, urgency accents, badges |
| `--color-success` | `#27AE60` | Completed commitments, synced state |
| `--color-warning` | `#F39C12` | Amber urgency indicator |
| `--color-danger` | `#E74C3C` | Overdue commitments, destructive actions |
| `--color-cold` | `#5DADE2` | Going-cold indicators |

### Neutral Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-bg-base` | `#FAFAFA` | App background |
| `--color-bg-card` | `#FFFFFF` | Card surfaces |
| `--color-bg-overlay` | `#F4F4F6` | Input backgrounds, secondary surfaces |
| `--color-border` | `#E8E8EC` | Dividers, card borders |
| `--color-text-primary` | `#1A1A2E` | Headings, primary text |
| `--color-text-secondary` | `#6B7280` | Labels, metadata, secondary text |
| `--color-text-tertiary` | `#9CA3AF` | Placeholders, disabled |
| `--color-text-inverse` | `#FFFFFF` | Text on dark backgrounds |

### Dark Mode Overrides

| Token | Light | Dark |
|---|---|---|
| `--color-bg-base` | `#FAFAFA` | `#0F0F1A` |
| `--color-bg-card` | `#FFFFFF` | `#1A1A2E` |
| `--color-text-primary` | `#1A1A2E` | `#F0F0F5` |
| `--color-border` | `#E8E8EC` | `#2A2A3E` |

---

## Typography

### Type Scale

| Token | Font | Size | Weight | Line Height | Usage |
|---|---|---|---|---|---|
| `--text-display` | Inter | 28px | 700 | 1.2 | Screen titles (Today, empty states) |
| `--text-heading-1` | Inter | 22px | 600 | 1.3 | Section headings, thread titles |
| `--text-heading-2` | Inter | 18px | 600 | 1.35 | Card titles, person names |
| `--text-heading-3` | Inter | 16px | 600 | 1.4 | Subsection labels, tab headers |
| `--text-body` | Inter | 15px | 400 | 1.5 | Body text, capture content |
| `--text-body-medium` | Inter | 15px | 500 | 1.5 | Emphasised body, commitment descriptions |
| `--text-small` | Inter | 13px | 400 | 1.4 | Metadata, dates, secondary labels |
| `--text-tiny` | Inter | 11px | 500 | 1.3 | Badges, status labels, caps-lock labels |
| `--text-mono` | 'JetBrains Mono' | 13px | 400 | 1.6 | Code, keyboard shortcuts |

### Font Loading
- Inter variable font, loaded from Google Fonts or self-hosted
- Fallback stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- JetBrains Mono only loaded if keyboard-shortcut UI is visible

---

## Spacing System

Based on a 4px base unit.

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Tight internal padding, icon gaps |
| `--space-2` | 8px | Input padding, chip padding |
| `--space-3` | 12px | List item vertical padding |
| `--space-4` | 16px | Card padding, section gap |
| `--space-5` | 20px | Section vertical spacing |
| `--space-6` | 24px | Large section gap |
| `--space-8` | 32px | Screen horizontal margin |
| `--space-10` | 40px | Major section breaks |
| `--space-16` | 64px | Empty state illustration spacing |

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 6px | Buttons, chips |
| `--radius-md` | 10px | Cards, inputs |
| `--radius-lg` | 16px | Modals, bottom sheets |
| `--radius-xl` | 24px | Floating elements |
| `--radius-full` | 9999px | Avatars, toggle pills |

---

## Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | Subtle card lift |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.10)` | Modals, bottom sheets |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | FAB, popovers |

---

## Component Library

### Button

```
Variants: primary | secondary | ghost | danger
Sizes: sm (32px h) | md (40px h) | lg (48px h)
States: default | hover | pressed | disabled | loading

Primary: bg=--color-primary, text=white, radius=--radius-sm
Secondary: bg=--color-primary-light, text=--color-primary, radius=--radius-sm
Ghost: bg=transparent, text=--color-primary, border=none
Danger: bg=--color-danger, text=white

Loading state: spinner replaces label text; button width locked to prevent layout shift
```

### Card

```
bg: --color-bg-card
border: 1px solid --color-border
border-radius: --radius-md
padding: --space-4
shadow: --shadow-sm

Hover state: shadow transitions to --shadow-md (150ms ease)
Active state: slight scale down (0.98) + shadow-sm
```

### Thread Card (specialised card)

```
Layout:
  [Attention indicator bar — 4px left border, coloured by score band]
  [Row 1: Thread title (heading-2) | Attention score badge]
  [Row 2: Person avatar cluster (up to 3) | Last interaction date]
  [Row 3: Open commitments count | Attention reason text (small)]
  [Row 4 (if going cold): Cold indicator chip]

Attention indicator colours:
  Low: --color-border (grey)
  Medium: --color-primary
  High: --color-accent
  Critical: --color-danger
```

### Chip / Tag

```
Height: 24px
Padding: 4px 10px
Border-radius: --radius-full
Font: --text-tiny (11px, 500)

Variants:
  Note: bg=#EEF1FE, text=#4F6AF5
  Action: bg=#FFF3E0, text=#E67E22
  Decision: bg=#E8F5E9, text=#27AE60
  Question: bg=#FCE4EC, text=#E91E63
  Going Cold: bg=#E3F2FD, text=#1565C0
```

### Input

```
Height: 44px (text inputs), auto (textareas)
Padding: 12px 14px
Border: 1px solid --color-border
Border-radius: --radius-md
Background: --color-bg-overlay
Font: --text-body

Focus state: border-color=--color-primary, box-shadow: 0 0 0 3px rgba(79,106,245,0.15)
Error state: border-color=--color-danger
```

### Bottom Sheet / Modal

```
Overlay: rgba(0,0,0,0.4), backdrop-filter: blur(4px)
Sheet: bg=--color-bg-card, border-radius: --radius-lg --radius-lg 0 0
Handle bar: 4px × 32px, bg=--color-border, centred at top
Animation: spring (damping 0.7, stiffness 300) from bottom
Max-height: 80vh
```

### Avatar

```
Sizes: 24px | 32px | 40px | 48px
Shape: circle (border-radius: --radius-full)
Fallback: initials on --color-primary-light background, --color-primary text
Cluster (3 avatars): -8px overlap, right-to-left stacking
```

### Attention Score Badge

```
Size: 28px × 28px circle
Font: --text-tiny, weight 700
Colour: score band colour (Low=grey, Medium=primary, High=accent, Critical=danger)
Background: band colour at 15% opacity
```

### Urgency Indicator (Commitments)

```
Shape: 8px circle, positioned left of commitment row
Green (>=3 days or no date): #27AE60
Amber (<=48h): #F39C12
Red (overdue): #E74C3C
Animated pulse on red only (2s infinite)
```

---

## Screen Blueprints

### Today View

```
┌─────────────────────────────────────────┐
│ Threadwise                    🔍  🔔     │  ← Top bar
├─────────────────────────────────────────┤
│ Good morning, Meera                      │  ← Greeting (display text)
│ Tuesday, 15 July                        │
├─────────────────────────────────────────┤
│ NEEDS YOUR ATTENTION                    │  ← Section header (tiny, caps)
│ ┌──────────────────────────────────────┐ │
│ │ ▌ Fintech Co.               [85] 🔴  │ │  ← Thread card (critical)
│ │   Aditya · 10 days ago · 2 open      │ │
│ │   1 overdue · 1 due tomorrow         │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ ▌ Investor Z                [65] 🟠  │ │
│ │   Rahul · 22 days ago · 0 open       │ │
│ │   No contact in 22 days              │ │
│ └──────────────────────────────────────┘ │
│ [+ 3 more]                              │
├─────────────────────────────────────────┤
│ DUE TODAY                               │
│ ○ Send revised proposal · Fintech Co.   │  ← Commitment row (red)
├─────────────────────────────────────────┤
│ GOING COLD                              │
│ ← [Startup Y] [Design Partner] →        │  ← Horizontal scroll
├─────────────────────────────────────────┤
│ Today  Threads  People  Commitments     │  ← Tab bar
│              [+]                        │  ← FAB
└─────────────────────────────────────────┘
```

### Thread Detail — Timeline Tab

```
┌─────────────────────────────────────────┐
│ ← Fintech Co.               [85] ⋮       │  ← Header
│   Aditya Joshi · CFO at Fintech Co.     │  ← People chips
├─────────────────────────────────────────┤
│ [Timeline] [Commitments] [People] [Brief]│  ← Tab bar
├─────────────────────────────────────────┤
│ 15 Jul                                  │  ← Date separator
│ ┌──────────────────────────────────────┐ │
│ │ 📝 NOTE          14:32              │ │
│ │ Budget approved for Q3. Aditya gave  │ │
│ │ green light for expanded scope.      │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ ⚡ ACTION         14:35             │ │
│ │ Send updated timeline by Friday      │ │
│ │ → Commitment created                 │ │
│ └──────────────────────────────────────┘ │
│ 10 Jul                                  │
│ ┌──────────────────────────────────────┐ │
│ │ ✅ COMPLETED      11:00             │ │
│ │ Shared initial proposal              │ │
│ │ "Aditya loved the approach"          │ │
│ └──────────────────────────────────────┘ │
│              [+]                        │  ← FAB (pre-assigns thread)
└─────────────────────────────────────────┘
```

### Quick Capture Modal

```
┌─────────────────────────────────────────┐
│ ▬                                       │  ← Handle bar
├─────────────────────────────────────────┤
│                                         │
│ ┌──────────────────────────────────────┐ │
│ │ What's on your mind?                 │ │  ← Text input (auto-focus)
│ │                                      │ │
│ └──────────────────────────────────────┘ │
│                                         │
│ [📝 Note] [⚡ Action] [✓ Decision] [? Question] │  ← Type chips
│                                         │
│ Thread: [Fintech Co. ▾]                 │  ← Thread selector
│                                         │
│ 💡 This looks like a commitment — Create one? │  ← Smart detection chip
│                                         │
│              [Save]                     │  ← Primary button
└─────────────────────────────────────────┘
```

### Pre-Meeting Brief

```
┌─────────────────────────────────────────┐
│ ← Pre-Meeting Brief              ↗ Share│
├─────────────────────────────────────────┤
│ Fintech Co. — Budget Review             │  ← Meeting title
│ Today · 3:00 PM · 45 min               │  ← Meeting details
│ Aditya Joshi · Priya Mehta              │  ← Attendees (linked)
├─────────────────────────────────────────┤
│ LAST CONTACT                            │
│ 10 Jul · Budget discussion, scope sign- │
│ off for Q3 expansion                    │
├─────────────────────────────────────────┤
│ OPEN COMMITMENTS                        │
│ 🔴 Send updated timeline — due today    │
│ 🟢 Schedule design review — due 20 Jul  │
├─────────────────────────────────────────┤
│ RECENT CONTEXT                          │
│ "Budget approved for Q3…" (15 Jul)      │
│ "Aditya wants API spec by Monday" (12 J)│
├─────────────────────────────────────────┤
│ TALKING POINTS                          │
│ • Confirm timeline after scope change   │
│ • Discuss design review scheduling      │
│ + Add your own…                         │
├─────────────────────────────────────────┤
│ [Regenerate]              [Copy Brief]  │
└─────────────────────────────────────────┘
```

---

## Motion and Animation Principles

1. **Purpose-driven**: Animations communicate state change, not decorate.
2. **Spring physics**: Use spring curves (not linear/ease) for most transitions — feels natural and alive.
3. **Duration budget**: UI transitions 150–300ms; data loading 200–500ms; celebration 300–600ms.
4. **Reduce motion**: All animations respect `prefers-reduced-motion: reduce`.

### Standard Transitions

| Element | Animation | Duration | Curve |
|---|---|---|---|
| Bottom sheet open | Translate Y: 100% → 0% | 280ms | Spring (stiffness 300, damping 28) |
| Bottom sheet close | Translate Y: 0% → 100% | 220ms | Ease-out |
| Card enter (list) | Opacity 0→1 + Y translate 16px→0 | 200ms | Ease-out |
| Card exit (archive) | Opacity 1→0 + X translate 0→-100% | 250ms | Ease-in |
| FAB scale on press | Scale 1→0.92 | 100ms | Ease-out |
| Tab switch | Cross-fade content | 150ms | Ease |
| Commitment complete | Check circle fill + card Y translate to completed | 300ms | Spring |
| Score badge update | Number slot-machine roll | 500ms | Ease-in-out |

---

## Responsive Behaviour

### Breakpoints

| Name | Min Width | Layout |
|---|---|---|
| Mobile | 0px | Single column, bottom tab bar |
| Tablet | 768px | Two-column (list + detail side panel) |
| Desktop | 1280px | Three-column (nav + list + detail) |

### Mobile Layout (primary)
- Bottom tab bar with 4 tabs + FAB in centre
- Thread detail opens as full-screen push
- Modals as bottom sheets

### Tablet Layout
- Left sidebar: tab navigation (40px wide icons)
- Centre panel: list view (320px)
- Right panel: thread detail or empty state

### Desktop Layout
- Left sidebar: tab navigation with labels (240px)
- Centre panel: list view (360px)
- Right panel: thread detail (fills remaining)
- Bottom sheets become centred modals

---

## Iconography

Using **Phosphor Icons** (outline weight for most, fill weight for active states).

| Icon | Usage |
|---|---|
| `HouseSimple` | Today tab |
| `Thread` | Threads tab |
| `Users` | People tab |
| `CheckSquare` | Commitments tab |
| `MagnifyingGlass` | Search |
| `Bell` | Notifications |
| `Plus` | FAB, new actions |
| `Lightning` | Action type |
| `Note` | Note type |
| `Checks` | Decision type |
| `Question` | Question type |
| `Snowflake` | Going cold |
| `Timer` | Smart Snooze |
| `Robot` | AI-generated content |
| `ArrowCounterClockwise` | Regenerate summary |
| `CopySimple` | Copy to clipboard |
| `Archive` | Archive thread |
| `Trash` | Delete |
| `DotsThreeVertical` | More options |

