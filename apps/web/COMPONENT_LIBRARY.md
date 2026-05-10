# WhatsFresh Component Library

A comprehensive guide to the reusable component library for the WhatsFresh Astro application.

## Table of Contents

1. [Layout Components](#layout-components)
2. [Form Components](#form-components)
3. [Feedback Components](#feedback-components)
4. [Content Components](#content-components)
5. [Navigation Components](#navigation-components)
6. [Utilities](#utilities)
7. [Styling & Design System](#styling--design-system)

## Layout Components

### BaseLayout

The base layout wrapper for all pages.

```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro';
---

<BaseLayout title="Page Title">
  <!-- Page content -->
</BaseLayout>
```

**Props:**

- `title` (string): Browser tab title
- `description` (string, optional): Meta description

---

## Form Components

### FormInput

A text input component with label, validation error display, and accessible styling.

```astro
<FormInput
  id="email"
  name="email"
  label="Email Address"
  type="email"
  placeholder="you@example.com"
  required
  error={errors.email}
/>
```

**Props:**

- `label` (string, optional): Field label
- `type` (string): Input type (default: "text")
- `placeholder` (string, optional)
- `required` (boolean): Whether field is required
- `error` (string, optional): Error message to display
- `value` (string, optional): Input value
- `id` (string, optional): HTML id attribute
- `name` (string, optional): Form field name
- `class` (string, optional): Additional CSS classes

### DatePicker

A date input component for selecting dates.

```astro
<DatePicker
  id="purchaseDate"
  name="purchaseDate"
  label="Purchase Date"
  required
  error={errors.purchaseDate}
/>
```

**Props:**

- Same as FormInput, plus:
- `min` (string, optional): Minimum date (ISO format)
- `max` (string, optional): Maximum date (ISO format)

### Select

A dropdown select component with custom styling.

```astro
<Select
  id="category"
  name="category"
  label="Category"
  options={[
    { value: 'vegetables', label: '🥦 Vegetables' },
    { value: 'fruits', label: '🍎 Fruits' },
  ]}
  placeholder="Choose a category"
  required
/>
```

**Props:**

- `label` (string, optional)
- `options` (Option[]): Array of `{ value: string, label: string }`
- `placeholder` (string, optional): Placeholder option text
- `required` (boolean)
- `error` (string, optional)
- `value` (string, optional)
- `id` (string, optional)
- `name` (string, optional)
- `class` (string, optional)

### Checkbox

A styled checkbox input component.

```astro
<Checkbox
  id="subscribe"
  name="subscribe"
  label="Subscribe to notifications"
  checked={false}
/>
```

**Props:**

- `label` (string, optional)
- `checked` (boolean): Initial checked state
- `required` (boolean)
- `error` (string, optional)
- `id` (string, optional)
- `name` (string, optional)
- `value` (string, optional)
- `class` (string, optional)

### Radio

A radio button group component.

```astro
<Radio
  name="frequency"
  label="Reminder Frequency"
  options={[
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ]}
  value="daily"
/>
```

**Props:**

- `label` (string, optional)
- `options` (Option[]): Array of `{ value: string, label: string }`
- `required` (boolean)
- `error` (string, optional)
- `value` (string, optional): Selected option value
- `id` (string, optional)
- `name` (string, optional)
- `class` (string, optional)

### ImagePicker

A file input component for selecting images with drag-and-drop support.

```astro
<ImagePicker
  id="avatar"
  name="avatar"
  label="Upload Avatar"
  accept="image/*"
  required
/>
```

**Props:**

- `label` (string, optional)
- `required` (boolean)
- `error` (string, optional)
- `id` (string, optional)
- `name` (string, optional)
- `accept` (string): File MIME types (default: "image/\*")
- `class` (string, optional)

---

## Feedback Components

### Toast

A notification toast that auto-dismisses after 3 seconds.

```astro
<Toast
  message="Item added successfully"
  type="success"
  visible={showToast}
/>
```

**Props:**

- `message` (string): Toast content
- `type` ('success' | 'error' | 'info' | 'warning'): Toast type
- `duration` (number, optional): Auto-dismiss delay in ms (default: 3000)
- `visible` (boolean): Whether to show toast
- `onClose` (string, optional): JavaScript to run when closing

**Types & Icons:**

- `success` ✓ (green)
- `error` ✕ (red)
- `info` ℹ (blue)
- `warning` ⚠ (orange)

### Modal

A dialog/modal component with backdrop.

```astro
<Modal
  title="Delete Item?"
  visible={showModal}
  onClose="closeModal()"
  size="sm"
>
  <p>Are you sure you want to delete this item?</p>
  <button onclick="confirmDelete()">Delete</button>
</Modal>
```

**Props:**

- `title` (string, optional): Modal title
- `visible` (boolean): Whether modal is visible
- `onClose` (string, optional): JavaScript to run when modal closes
- `size` ('sm' | 'md' | 'lg'): Modal width (default: "md")
- `class` (string, optional): Additional CSS classes

### Spinner

A loading spinner component.

```astro
<Spinner size="md" color="var(--brand)" />
```

**Props:**

- `size` ('sm' | 'md' | 'lg'): Spinner size (default: "md")
- `color` (string): CSS color value (default: "var(--brand)")
- `class` (string, optional)

### ProgressBar

A progress indicator bar.

```astro
<ProgressBar
  value={75}
  max={100}
  label="Loading..."
  showLabel={true}
  color="brand"
  animated={true}
/>
```

**Props:**

- `value` (number): Current progress value
- `max` (number): Maximum value (default: 100)
- `label` (string, optional): Progress label
- `showLabel` (boolean): Show label and percentage
- `color` ('brand' | 'fresh' | 'soon' | 'urgent'): Progress color
- `size` ('sm' | 'md' | 'lg'): Bar height (default: "md")
- `animated` (boolean): Animated shimmer effect (default: true)
- `class` (string, optional)

### Skeleton

A loading skeleton/shimmer placeholder.

```astro
<Skeleton height="16px" width="100%" count={3} />
```

**Props:**

- `height` (string): Skeleton height (default: "20px")
- `width` (string): Skeleton width (default: "100%")
- `circle` (boolean): Circular skeleton for avatars
- `count` (number): Number of skeletons to render (default: 1)
- `className` (string, optional)

---

## Content Components

### Button

A versatile button component with multiple variants.

```astro
<Button
  variant="primary"
  size="lg"
  block
  onclick="handleClick()"
>
  Click Me
</Button>
```

**Props:**

- `variant` ('primary' | 'secondary' | 'ghost' | 'coral' | 'icon'): Button style
- `size` ('default' | 'lg'): Button size
- `block` (boolean): Full-width button
- `glass` (boolean): Frosted glass effect
- `href` (string, optional): Link href (renders as <a>)
- `class` (string, optional)
- `onclick` (string, optional): Click handler

**Variants:**

- `primary`: Brand color, solid background
- `secondary`: Subtle, secondary action
- `ghost`: Transparent with border
- `coral`: Accent color for destructive actions
- `icon`: Icon-only button

### Card

A content container component.

```astro
<Card variant="raised">
  <!-- Card content -->
</Card>
```

**Props:**

- `variant` ('flat' | 'raised' | 'standard'): Card style
- `class` (string, optional)

### ItemCard

A specialized card for displaying food items.

```astro
<ItemCard
  name="Broccoli"
  emoji="🥦"
  status="fresh"
  location="Fridge"
  daysUntilExpiry={7}
  onclick="goToItem()"
/>
```

**Props:**

- `name` (string): Item name
- `emoji` (string): Item emoji
- `status` ('fresh' | 'soon' | 'urgent' | 'expired'): Status indicator
- `location` (string): Where item is stored
- `daysUntilExpiry` (number): Days until item expires
- `onclick` (string, optional): Click handler

### StatCard

A card displaying a single statistic.

```astro
<StatCard
  value={42}
  label="Items Tracked"
  status="fresh"
/>
```

**Props:**

- `value` (number | string): The statistic value
- `label` (string): Statistic label
- `status` ('fresh' | 'soon' | 'urgent'): Color coding

### InsightCard

A card for displaying insights with gradient background.

```astro
<InsightCard
  eyebrow="Weekly Insight"
  title="Save $15.40"
  description="By eating what you have, you're saving money"
  icon="💰"
/>
```

**Props:**

- `eyebrow` (string): Small text above title
- `title` (string): Large title
- `description` (string): Description text
- `icon` (string): Emoji icon

### StreakCard

A card displaying a streak or achievement number.

```astro
<StreakCard number={12} label="Day Streak" />
```

**Props:**

- `number` (number): The streak/achievement number
- `label` (string): Label below the number

### TopBar

A sticky header component with title and action buttons.

```astro
<TopBar
  title="Items"
  subtitle="What you have"
  actions={[
    { icon: '🔍', onclick: 'openSearch()' },
    { icon: '⚙️', onclick: 'openSettings()' },
  ]}
/>
```

**Props:**

- `title` (string): Header title
- `subtitle` (string, optional): Subtitle text
- `actions` (Action[], optional): Array of `{ icon: string, onclick?: string }`

### TabBar

A fixed bottom navigation bar with 5 tabs.

```astro
<TabBar
  tabs={[
    { id: 'dashboard', label: 'Dashboard', icon: '📊', href: '/app/dashboard' },
    // ... more tabs
  ]}
  activeTab="dashboard"
/>
```

**Props:**

- `tabs` (Tab[]): Array of tabs with id, label, icon, href
- `activeTab` (string): Currently active tab id

### FAB

A floating action button.

```astro
<FAB onclick="openAddItem()">➕</FAB>
```

**Props:**

- `onclick` (string, optional): Click handler
- `href` (string, optional): Link href
- Slot content: Button text/emoji

---

## Utilities

### State Management (`src/lib/store.ts`)

Simple client-side state management with event-based reactivity.

```typescript
import { getState, setState, setLoading, setError, showToast } from '@/lib/store';

// Get current state
const state = getState();

// Update state
setState({ user: { id: '123', name: 'John' } });

// Use helper functions
setLoading(true);
setError('Something went wrong');
showToast('Success!', 'success');

// Listen to state changes
onStateChange((state) => {
  console.log('State changed:', state);
});
```

### API Service (`src/lib/api.ts`)

Async API operations with automatic loading, error, and toast handling.

```typescript
import { fetchItems, createItem, updateItemApi, deleteItem } from '@/lib/api';

// Fetch items
const items = await fetchItems();

// Create item
const newItem = await createItem({
  name: 'Broccoli',
  emoji: '🥦',
  status: 'fresh',
  days: 7,
  // ... other properties
});

// Update item
await updateItemApi(itemId, { status: 'urgent' });

// Delete item
await deleteItem(itemId);
```

### Animations (`src/lib/animations.ts`)

Utility functions for page transitions and animations.

```typescript
import { pageTransitionIn, slideIn, bounce, detectReducedMotion } from '@/lib/animations';

// Apply animation
pageTransitionIn(element, 300);
slideIn(element, 'up');
bounce(element);

// Check for reduced motion preference
if (!detectReducedMotion()) {
  // Apply animation
}
```

### Validation (`src/lib/validation.ts`)

Form validation utilities.

```typescript
import { validateField, validateForm, commonRules, isValidEmail } from '@/lib/validation';

// Validate single field
const error = validateField('user@example.com', commonRules.email);

// Validate entire form
const errors = validateForm(formData, {
  email: commonRules.email,
  password: commonRules.password,
  name: { required: true, minLength: 2 },
});

// Utility functions
isValidEmail('user@example.com');
isValidPassword('SecurePass123');
```

### Search & Filtering (`src/lib/search.ts`)

Search and filter utilities for lists.

```typescript
import { searchItems, filterItems, groupItems, sortItems, paginateItems } from '@/lib/search';

// Search items
const results = searchItems(items, 'broccoli', { threshold: 0.3 });

// Filter items
const fresh = filterItems(items, (item) => item.status === 'fresh');

// Group items
const byContainer = groupItems(items, 'container');

// Sort items
const sorted = sortItems(items, 'name', 'asc');

// Paginate items
const page1 = paginateItems(items, 1, 10);
```

### Dark Mode (`src/lib/dark-mode.ts`)

Dark mode management.

```typescript
import { initTheme, setTheme, getCurrentTheme, toggleTheme } from '@/lib/dark-mode';

// Initialize dark mode on app start
initTheme();

// Set theme
setTheme('dark'); // 'light' | 'dark' | 'auto'

// Get current effective theme
const theme = getCurrentTheme(); // 'light' | 'dark'

// Toggle theme
toggleTheme();
```

### Accessibility (`src/lib/a11y.ts`)

Accessibility utilities for WCAG compliance.

```typescript
import { initAccessibility, announceToScreenReader, makeKeyboardAccessible } from '@/lib/a11y';

// Initialize a11y features
initAccessibility();

// Announce to screen readers
announceToScreenReader('Item added successfully');

// Make element keyboard accessible
makeKeyboardAccessible(element);
```

### Analytics (`src/lib/analytics.ts`)

Event tracking and performance monitoring.

```typescript
import { analytics, performanceMonitor, trackAsyncOperation } from '@/lib/analytics';

// Initialize analytics
analytics.initialize(userId);

// Track events
analytics.trackEvent('item_added', { category: 'vegetables' });
analytics.trackPageView();
analytics.trackConversion('purchase', 29.99);

// Track timing
analytics.trackTiming('page_load', 1234);

// Performance monitoring
performanceMonitor.mark('start');
// ... operation
const duration = performanceMonitor.measure('operation', 'start');
```

### Error Handling (`src/lib/error-handler.ts`)

Comprehensive error handling system.

```typescript
import { errorHandler, AppError, withErrorHandling, retryWithBackoff } from '@/lib/error-handler';

// Handle errors
const error = errorHandler.handle(new Error('Something failed'), { component: 'ItemForm' });

// Async error handling
const { data, error } = await withErrorHandling(() => fetchItems(), { action: 'fetch_items' });

// Retry with exponential backoff
const result = await retryWithBackoff(() => fetchItems(), 3, 1000);
```

---

## Styling & Design System

### Design Tokens

All colors, spacing, and typography are defined as CSS custom properties in `globals.css`.

**Colors:**

- `--brand`: Primary brand color (#0E5C3A)
- `--coral`: Accent color for urgency (#FF6B47)
- `--honey`: Warmth and joy (#F4B942)
- `--fresh`, `--soon`, `--urgent`: Status colors
- `--t1`, `--t2`, `--t3`: Text colors (dark to light)
- `--bg`, `--raised`, `--sunken`: Surface colors

**Typography:**

- `.h1` - `.h3`: Heading styles
- `.body`: Body text
- `.caption`: Small captions
- `.eyebrow`: Very small labels

**Spacing:**

- Consistent 4px grid system
- Common values: 4px, 8px, 12px, 16px, 24px, 32px

**Border Radius:**

- `--r-xs`: 8px
- `--r-sm`: 12px
- `--r-md`: 16px
- `--r-lg`: 22px
- `--r-xl`: 32px
- `--r-full`: 9999px

**Shadows:**

- `--s-1`: Subtle shadow
- `--s-2`: Medium shadow
- `--s-3`: Large shadow
- `--s-glow`: Brand glow shadow

### CSS Classes

**Buttons:**

- `.btn-primary`: Primary button style
- `.btn-secondary`: Secondary button style
- `.btn-ghost`: Ghost button style
- `.btn-icon`: Icon button style

**Cards:**

- `.card`: Standard card
- `.card-raised`: Raised card style
- `.card-flat`: Flat card style

**Utilities:**

- `.scroll`: Smooth scrolling container
- `.serif`: Use Fraunces serif font
- `.glass`: Frosted glass effect

---

## Best Practices

1. **Use semantic HTML**: Components use proper ARIA roles and attributes
2. **Accessibility first**: All interactive elements are keyboard accessible
3. **Mobile-first**: Styles are optimized for mobile screens
4. **Error handling**: Always show meaningful error messages
5. **Loading states**: Provide feedback during async operations
6. **Validation**: Validate user input on both client and server
7. **Performance**: Use code splitting and lazy loading where possible
8. **Testing**: Write tests for critical user flows

---

## Examples

### Basic Form

```astro
---
import FormInput from '@/components/FormInput.astro';
import Select from '@/components/Select.astro';
import Button from '@/components/Button.astro';

const categories = [
  { value: 'vegetables', label: '🥦 Vegetables' },
  { value: 'fruits', label: '🍎 Fruits' },
];
---

<form>
  <FormInput
    label="Item Name"
    name="name"
    required
  />

  <Select
    label="Category"
    name="category"
    options={categories}
    required
  />

  <Button variant="primary" block>
    Add Item
  </Button>
</form>
```

### Item List with Search

```astro
---
import { searchItems } from '@/lib/search';
import ItemCard from '@/components/ItemCard.astro';

const query = Astro.url.searchParams.get('q') || '';
const results = query ? searchItems(items, query) : items;
---

<div>
  {results.map(({ item }) => (
    <ItemCard
      name={item.name}
      emoji={item.emoji}
      status={item.status}
      location={item.container}
      daysUntilExpiry={item.days}
    />
  ))}
</div>
```

---

For more information, see individual component files in `src/components/` and utility files in `src/lib/`.
