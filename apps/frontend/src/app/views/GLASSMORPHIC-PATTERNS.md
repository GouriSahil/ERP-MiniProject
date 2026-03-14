# Glassmorphic Card Component Patterns - Quick Reference

## Overview
This document provides a quick reference for reusable glassmorphic component patterns used across the College ERP application (landing, auth, and dashboard views).

## Color Palette

```css
--purple-primary: #a855f7
--blue-primary:   #3b82f6
--pink-accent:    #ec4899
--bg-dark:        #0f172a
--bg-darker:      #020617
```

## Background Gradient

```css
background: linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%);
```

---

## 🎯 Core Glass Card Patterns

### Pattern 1: Standard Glass Card
**Use:** Stat cards, feature cards, general content

```css
.glass-card {
    background: linear-gradient(135deg, 
        rgba(255, 255, 255, 0.1), 
        rgba(255, 255, 255, 0.05)
    );
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 1.5rem;
}
```

### Pattern 2: High-Blur Glass Card
**Use:** Main containers, form cards, prominent sections

```css
.glass-card-high-blur {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 24px;
    padding: 2.5rem;
}
```

### Pattern 3: Subtle Glass Card
**Use:** Nested cards, info boxes

```css
.glass-card-subtle {
    background: linear-gradient(135deg, 
        rgba(255, 255, 255, 0.05), 
        rgba(255, 255, 255, 0.02)
    );
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem;
}
```

---

## 📊 Dashboard-Specific Patterns

### Glass Stat Card
```html
<div class="glass-stat-card">
    <div>
        <div class="stat-value-glass">{{ value }}</div>
        <div class="stat-label-glass">{{ label }}</div>
    </div>
    <div class="stat-icon-glass">
        <i class="{{ icon }}"></i>
    </div>
</div>
```

### Glass Section Card
```html
<div class="glass-section-card">
    <div class="glass-section-header">
        <h5>Title</h5>
    </div>
    <div class="glass-section-body">
        <!-- Content -->
    </div>
</div>
```

### Glass Activity Item
```html
<div class="glass-activity-item">
    <div class="glass-activity-icon">
        <i class="{{ icon }}"></i>
    </div>
    <div>
        <div class="glass-activity-text">{{ text }}</div>
        <div class="glass-activity-time">{{ time }}</div>
    </div>
</div>
```

---

## 🎨 UI Component Patterns

### Glass Button
```css
.glass-btn {
    background: linear-gradient(135deg, #a855f7, #3b82f6);
    border: none;
    border-radius: 10px;
    padding: 0.75rem 1.25rem;
    color: white;
    font-weight: 600;
    box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);
    transition: all 0.3s ease;
}

.glass-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(168, 85, 247, 0.4);
}
```

### Glass Badge
```css
.glass-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
}

.glass-badge-purple {
    background: rgba(168, 85, 247, 0.2);
    color: #a855f7;
}

.glass-badge-green {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
}

.glass-badge-blue {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
}
```

### Glass Alert
```css
.glass-info-alert {
    background: rgba(59, 130, 246, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 16px;
    padding: 1.25rem 1.5rem;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
}
```

---

## 🌊 Background Elements

### Animated Blobs
```html
<div class="dashboard-bg-animation">
    <div class="dashboard-blob dashboard-blob-1"></div>
    <div class="dashboard-blob dashboard-blob-2"></div>
    <div class="dashboard-blob dashboard-blob-3"></div>
</div>
```

```css
.dashboard-bg-animation {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    z-index: 0;
    pointer-events: none;
}

.dashboard-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.15;
}

@keyframes blobFloat {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
}
```

---

## 📝 Text Color Guidelines

| Purpose | Color |
|---------|-------|
| Primary text | `rgba(255, 255, 255, 0.9)` or `#ffffff` |
| Secondary text | `rgba(255, 255, 255, 0.7)` |
| Muted text | `rgba(255, 255, 255, 0.5)` |
| Placeholder | `rgba(255, 255, 255, 0.4)` |

---

## ✅ Implementation Checklist

When applying glassmorphic patterns to a new view:

- [ ] Add dark gradient background (`linear-gradient(135deg, #0f172a, #581c87, #0f172a)`)
- [ ] Add animated blob elements
- [ ] Replace white cards with appropriate glass-card variant
- [ ] Update all text colors to rgba white variants
- [ ] Replace buttons with glass-btn pattern
- [ ] Update badges to glass-badge variants
- [ ] Update alerts to glass-alert pattern
- [ ] Ensure hover effects and transitions work
- [ ] Test responsiveness on mobile devices
- [ ] Verify accessibility (contrast ratios)

---

## 🔧 Pattern Locations

| File | Patterns Used |
|------|---------------|
| `landing/landing.html` | Standard glass cards, stat cards, feature cards, CTA cards |
| `auth/login.html` | High-blur glass card for form, subtle cards for features |
| `auth/register.html` | High-blur glass card for form, join stats card |
| `dashboard/dashboard.html` | All dashboard-specific patterns (stat cards, section cards, activity items) |

---

## 📚 Additional Documentation

See `glassmorphic-pattern-guide.html` for:
- Complete CSS for all patterns
- Advanced patterns (gradient borders, input fields, etc.)
- Animation keyframes
- Troubleshooting tips
- Full usage examples

---

## Browser Compatibility Notes

- **Safari**: Requires `-webkit-backdrop-filter` prefix
- **Firefox**: Full support for `backdrop-filter`
- **Chrome/Edge**: Full support
- **Mobile**: Test on actual devices for best results

---

*Last updated: March 2026*
*College ERP Design System*
