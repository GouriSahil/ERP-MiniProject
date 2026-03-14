# Modern Styles Utilities

Shared CSS patterns extracted from the landing page for consistent UI across all views.

## 📁 File Location
```
apps/frontend/src/app/views/shared/modern-styles.css
```

## 🎨 Features Included

### 1. CSS Custom Properties (Variables)
- **Purple-Blue Theme Colors**: Primary purple (#a855f7), secondary blue (#3b82f6), accent pink (#ec4899)
- **Neutral Colors**: Dark backgrounds (#0f172a, #020617), text whites, muted and dim colors
- **Pre-defined Gradients**: Primary, purple, blue, cyan, success, and hero gradients
- **Glassmorphism Variables**: Background, borders, blur strengths
- **Shadows**: Glow effects with different intensities
- **Border Radius**: Consistent rounded corners (sm to full)

### 2. Glassmorphism Classes
```css
.glassmorphism           /* Standard glass effect */
.glassmorphism-strong    /* Stronger glass effect with more blur */
.glassmorphism-card      /* Card style with hover effect */
.glassmorphism-light     /* Light glass for badges/inline elements */
```

### 3. Gradient Text
```css
.text-gradient           /* Purple to blue gradient */
.text-gradient-purple    /* Purple gradient */
.text-gradient-blue      /* Blue gradient */
```

### 4. Gradient Backgrounds
```css
.bg-gradient-primary     /* Purple to blue */
.bg-gradient-purple      /* Purple gradient */
.bg-gradient-blue        /* Blue gradient */
.bg-gradient-hero        /* Hero section gradient */
.bg-gradient-dark        /* Dark gradient */
```

### 5. Floating Cards
```css
.floating-card           /* Animated floating card */
.floating-card-delay-1   /* 1s delay */
.floating-card-delay-2   /* 2s delay */
.floating-card-delay-3   /* 3s delay */
```

### 6. Modern Buttons
```css
.btn-modern              /* Primary gradient button */
.btn-modern-secondary    /* Glass secondary button */
.btn-modern-lg           /* Large button variant */
```

### 7. Badges
```css
.badge-modern            /* Purple badge */
.badge-modern-blue       /* Blue badge */
.badge-modern-success    /* Green badge */
```

### 8. Icon Wrappers
```css
.icon-wrapper            /* Transparent gradient wrapper */
.icon-wrapper-purple     /* Solid purple gradient */
.icon-wrapper-blue       /* Solid blue gradient */
.icon-wrapper-lg         /* Large size (60px) */
.icon-wrapper-xl         /* Extra large (70px) */
```

### 9. Animations
```css
/* Keyframe Animations */
@keyframes blob          /* Blob movement */
@keyframes float         /* Floating up/down */
@keyframes pulse         /* Opacity pulsing */
@keyframes fadeInUp      /* Fade in and move up */
@keyframes scaleIn       /* Scale up on appear */
@keyframes slideInLeft   /* Slide from left */
@keyframes slideInRight  /* Slide from right */

/* Animation Utilities */
.animate-fade-in-up
.animate-scale-in
.animate-slide-in-left
.animate-slide-in-right
.animate-blob
.animate-float
.animate-pulse
.pulse
.pulse-slow
```

### 10. Blob Animation
```css
.blob                    /* Animated blob base */
.blob-1                  /* Purple blob */
.blob-2                  /* Blue blob (2s delay) */
.blob-3                  /* Pink blob (4s delay) */
```

### 11. Section Backgrounds
```css
.section-dark            /* Dark background (#0f172a) */
.section-darker          /* Even darker (#020617) */
.section-with-gradient   /* Hero gradient background */
.section-with-radial     /* Radial glow effect */
```

### 12. Card Components
```css
.stat-card              /* Statistics card with hover */
.feature-card           /* Feature card with overlay effect */
.step-card              /* Step/process card */
.step-number            /* Number circle with variants */
```

### 13. CTA Section
```css
.cta-card               /* Call-to-action card */
.cta-title
.cta-subtitle
```

### 14. Text Utilities
```css
.text-white
.text-muted             /* 70% opacity white */
.text-dim               /* 50% opacity white */
.text-primary           /* Purple color */
.text-secondary         /* Blue color */
.text-success           /* Green color */
```

### 15. Social Proof Elements
```css
.user-avatars           /* Avatar container */
.avatar                 /* Individual avatar */
.avatar-gradient-1      /* Purple-pink gradient */
.avatar-gradient-2      /* Blue-cyan gradient */
.avatar-gradient-3      /* Green-teal gradient */
.avatar-gradient-4      /* Orange-red gradient */
.stars                  /* Yellow star rating */
```

### 16. Hover Effects
```css
.hover-lift             /* Move up on hover */
.hover-lift-lg          /* Move up more on hover */
.hover-glow             /* Add glow shadow */
```

### 17. Transitions
```css
.transition-all         /* 0.3s ease */
.transition-slow        /* 0.5s ease */
.transition-transform   /* Transform only */
```

## 🚀 Usage Examples

### Including in HTML
```html
<link rel="stylesheet" href="shared/modern-styles.css">
```

### Glassmorphism Card
```html
<div class="glassmorphism-card">
  <div class="icon-wrapper icon-wrapper-purple">
    <i class="fas fa-star"></i>
  </div>
  <h3 class="text-white">Feature Title</h3>
  <p class="text-muted">Description goes here...</p>
</div>
```

### Gradient Hero Section
```html
<section class="section-with-gradient">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>
  <div class="relative z-1">
    <h1 class="text-gradient">Hero Title</h1>
    <button class="btn btn-modern">Get Started</button>
  </div>
</section>
```

### Feature Card with Icon
```html
<div class="feature-card">
  <div class="icon-wrapper icon-wrapper-purple icon-wrapper-lg">
    <i class="fas fa-rocket"></i>
  </div>
  <h3 class="feature-title">Feature Name</h3>
  <p class="text-muted">Feature description...</p>
</div>
```

### Animated Floating Card
```html
<div class="floating-card floating-card-delay-1">
  <div class="text-white">
    <p>Stat Value</p>
    <p class="text-primary">98%</p>
  </div>
</div>
```

### Step/Process Cards
```html
<div class="step-card">
  <div class="step-number step-number-purple">
    <span>1</span>
  </div>
  <h4 class="step-title">Step Title</h4>
  <p class="step-description">Step description...</p>
</div>
```

### Badge with Icon
```html
<div class="badge-modern">
  <i class="fas fa-sparkles"></i>
  <span>New Feature</span>
</div>
```

## 🎯 Design System Colors

### Primary Palette
- **Purple**: #a855f7 (primary), #7c3aed (dark), #c084fc (light)
- **Blue**: #3b82f6 (secondary), #2563eb (dark), #60a5fa (light)
- **Pink**: #ec4899 (accent), #f472b6 (light)

### Neutral Palette
- **Dark BG**: #0f172a, #020617
- **Text**: #ffffff (100%), rgba(255,255,255,0.7) (70%), rgba(255,255,255,0.5) (50%)

### Functional Colors
- **Success**: #22c55e (green), #10b981 (light green)
- **Rating**: #fbbf24 (yellow/gold)

## 📐 Responsive Breakpoints
The CSS includes responsive utilities that work with Tailwind's breakpoints:
- `max-width: 768px` - Mobile adjustments included

## 🔧 Browser Support
- Uses `-webkit-` prefixes for backdrop-filter (Safari support)
- Modern CSS features with fallbacks
- Tested on Chrome, Firefox, Safari, Edge

## 📝 Migration from Landing Page
This file consolidates all inline styles from `landing.html` (lines 140-530) into reusable utility classes. Replace inline `<style>` blocks with these utility classes for consistency.

## 🔗 Related Files
- `landing/landing.html` - Source of extracted patterns
- `auth/login.html` - Can use these styles
- `auth/register.html` - Can use these styles
- `dashboard/dashboard.html` - Can use these styles
- `dashboard/profile.html` - Can use these styles
