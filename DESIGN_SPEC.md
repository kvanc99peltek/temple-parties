# Temple Parties - Design Specification

A complete design reference for recreating components in Figma.

---

## Color Palette

### Backgrounds
| Name | Hex | Usage |
|------|-----|-------|
| Black | `#000000` | Main background |
| Card BG | `#18181B` | Party cards, modals |
| Card BG Hover | `#27272A` | Hover states |

### Brand Colors
| Name | Hex | Usage |
|------|-----|-------|
| Purple | `#A855F7` | Primary buttons, logo, active tabs |
| Purple Light | `#B869F8` | Hover states |
| Purple Dark | `#9333EA` | Pressed states |
| Green | `#10B981` | "I'm Going" button |
| Green Dark | `#059669` | Green hover |
| Gold/Yellow | `#F59E0B` | "HYPED" badge |
| Orange | `#F97316` | Navigate button border |

### Text Colors
| Name | Hex | Usage |
|------|-----|-------|
| White | `#FFFFFF` | Primary text, headings |
| Gray 400 | `#A1A1AA` | Secondary text (host, address) |
| Gray 500 | `#71717A` | Disabled/muted text |

### Border Colors
| Name | Hex | Usage |
|------|-----|-------|
| Border | `#3F3F46` | Card borders, dividers |
| Border Light | `#52525B` | Input borders |

---

## Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Logo "TEMPLE PARTIES" | Georgia / Garamond | 28px | Bold |
| Party Title | System (SF Pro / Inter) | 20px | Semibold (600) |
| Category Badge | System | 12px | Medium (500) |
| Body Text (host, address) | System | 14px | Regular (400) |
| Button Text | System | 14px | Semibold (600) |
| Tab Text | System | 16px | Medium (500) |
| Doors Open Time | System | 14px | Regular (400) |

---

## Component Specifications

### Party Card
```
Width:          100% (max 576px)
Padding:        16px
Border Radius:  16px
Background:     #18181B
Border:         1px solid #3F3F46
Margin Bottom:  12px
```

**Internal Layout:**
- Category badge + HYPED badge (horizontal, 8px gap)
- Title (margin-top: 8px)
- Host text (margin-top: 4px)
- Address text (margin-top: 2px)
- Doors open row with clock icon (margin-top: 4px)
- Buttons row (margin-top: 12px, horizontal, 12px gap)

### Category Badge
```
Background:     #3F3F46
Text Color:     #A1A1AA
Font Size:      12px
Font Weight:    Medium (500)
Padding:        4px 12px
Border Radius:  9999px (pill)
Text Transform: Uppercase
```

### HYPED Badge
```
Background:     #F59E0B
Text Color:     #000000
Font Size:      12px
Font Weight:    Semibold (600)
Padding:        4px 12px
Border Radius:  9999px (pill)
```

### Going Button (Default State)
```
Height:         44px
Width:          Flexible (fill container)
Background:     #A855F7
Text Color:     #FFFFFF
Font Size:      14px
Font Weight:    Semibold (600)
Border Radius:  9999px (full)
Border:         None
```

### Going Button (Active/Going State)
```
Height:         44px
Background:     #10B981
Text Color:     #FFFFFF
Icon:           Checkmark (left of text)
```

### Navigate Button
```
Height:         44px
Width:          Flexible (fill container)
Background:     Transparent
Text Color:     #F97316
Font Size:      14px
Font Weight:    Semibold (600)
Border Radius:  9999px (full)
Border:         2px solid #F97316
```

### Day Tabs Container
```
Width:          100% (max 576px)
Padding:        0 16px
Gap:            12px (between tabs)
Margin:         16px 0
```

### Day Tab (Active)
```
Height:         48px
Width:          50% (flex: 1)
Background:     #A855F7
Text Color:     #FFFFFF
Font Size:      16px
Font Weight:    Medium (500)
Border Radius:  12px
Border:         None
```

### Day Tab (Inactive)
```
Height:         48px
Width:          50% (flex: 1)
Background:     Transparent
Text Color:     #A1A1AA
Font Size:      16px
Font Weight:    Medium (500)
Border Radius:  12px
Border:         1px solid #3F3F46
```

### Header
```
Height:         64px
Padding:        0 16px
Background:     #000000 (or transparent)
```

**Header Elements:**
- Logo: "TEMPLE PARTIES" in purple (#A855F7), Georgia font, bold
- Plus icon button: 24x24px, white
- Profile circle: 40x40px, purple background, white initial

### Bottom Navigation
```
Height:         64px
Background:     #18181B
Border Top:     1px solid #3F3F46
Position:       Fixed bottom
```

**Nav Items:**
- Icon: 24x24px
- Label: 12px, below icon
- Active color: #A855F7
- Inactive color: #71717A

---

## Shadows & Effects

### Purple Glow (for buttons on hover)
```
Box Shadow:     0 4px 20px rgba(168, 85, 247, 0.3)
```

### Purple Glow Large
```
Box Shadow:     0 8px 30px rgba(168, 85, 247, 0.4)
```

### Green Glow (for going button)
```
Box Shadow:     0 4px 16px rgba(16, 185, 129, 0.4)
```

### Gold Glow (for HYPED badge)
```
Box Shadow:     0 0 15px rgba(245, 158, 11, 0.5)
```

---

## Spacing System

| Name | Value | Usage |
|------|-------|-------|
| xs | 4px | Tight spacing, badge padding |
| sm | 8px | Between badge and title |
| md | 12px | Between cards, button gaps |
| lg | 16px | Card padding, section margins |
| xl | 24px | Large section spacing |
| 2xl | 32px | Page margins |

---

## Icons Used

- **Plus** (+): Add party button
- **User/Profile**: Account button
- **Clock**: Doors open time
- **Home**: Bottom nav
- **Map**: Bottom nav
- **Checkmark**: Going button (active state)
- **Navigation arrow**: Navigate button

---

## Screen Dimensions

### Mobile (Primary)
```
iPhone 14 Pro:  393 x 852
iPhone 14:      390 x 844
iPhone SE:      375 x 667
```

### Tablet
```
iPad Mini:      744 x 1133
iPad Pro 11":   834 x 1194
```

---

## Figma Quick Start

1. **Create a new Figma file**
2. **Add frames** for iPhone 14 Pro (393 x 852)
3. **Set frame background** to `#000000`
4. **Install fonts**: Inter (Google Fonts), Georgia (system)
5. **Create color styles** from the palette above
6. **Use Auto Layout** for all components
7. **Create components** for reusable elements (cards, buttons, badges)

### Recommended Layer Structure
```
📱 Home Screen
├── Header
│   ├── Logo
│   ├── Add Button
│   └── Profile Button
├── Day Tabs
│   ├── Friday Tab
│   └── Saturday Tab
├── Party List
│   ├── Party Card 1
│   ├── Party Card 2
│   └── Party Card 3
└── Bottom Nav
    ├── Home Tab
    └── Map Tab
```

---

## Screenshots to Capture

1. **Home - Friday view** (with parties)
2. **Home - Saturday view**
3. **Empty state** (no parties)
4. **Map view**
5. **Login modal**
6. **Add Party modal**
7. **Profile modal**
8. **Party card - Going state**
9. **Party card - Not going state**
10. **Party card - HYPED badge**

---

## Animation Notes (for prototyping)

| Animation | Duration | Easing |
|-----------|----------|--------|
| Fade in | 300ms | ease-out |
| Scale in | 300ms | ease-out |
| Slide up | 300ms | ease-out |
| Button click | 300ms | ease-out |
| Number pop | 300ms | ease-out |

---

*Generated from Temple Parties frontend codebase*
