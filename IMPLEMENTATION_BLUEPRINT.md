# WhatsForLunch: Full Implementation Blueprint

## Match HTML Demo + Working Features (Phase 3+)

**Status**: Foundation complete (Phase 1-2) → Ready for Screen Implementation (Phase 3)
**Current Tests**: 260+ passing ✅
**Foundation**: Design system, tokens, components, typography all in place ✅

---

## EXECUTIVE SUMMARY

You have a **production-ready design system**. The HTML demo shows exactly what every screen should look like. Your task: build each screen in React to pixel-match the demo while connecting real APIs.

**The Screens You Need to Build** (19 total):

### Auth Flows (4)

1. Splash Screen
2. Onboarding (3-slide carousel)
3. Auth (email/password login)
4. Magic Link Confirmation

### Main App (15)

5. **Dashboard** - Hero stats, insights, streak, recent items, FAB
6. **Items List** - Search, filter tabs, item cards, pull-to-refresh
7. **Add Item** - Form with dropdowns, date pickers
8. **Item Detail** - Large icon, info rows, action buttons
9. **Recipes** - Category tabs, recipe cards with match indicators
10. **Recipe Detail** - Image, ingredients, instructions
11. **Scan** - Camera view, QR frame, shutter button
12. **Scan Results** - Processed barcode data, save options
13. **Analytics** - Charts, metrics, trends
14. **Achievements** - Badge grid, progress, streak
15. **Containers** - Household storage locations
16. **Shopping List** - Shared checklist with categories
17. **Notifications** - Alert feed, dismissable
18. **Settings** - Profile, preferences, household, legal links
19. **Household** - Members, invitations, sharing

---

## PART 1: THE DESIGN FOUNDATION (Already Done ✅)

### What You Have Ready

```
✅ Theme System (apps/mobile/src/theme/tokens.ts)
  - 50+ colors extracted from app.html
  - Typography system (h1-h4, body, caption, eyebrow)
  - Spacing scale (4px-72px)
  - Shadows (s-1 through s-glow)
  - Border radii (xs-full)
  - Gradients

✅ Component Library (apps/mobile/src/components/ui/)
  - Button (primary, secondary, ghost, coral, icon variants)
  - Card (standard, ItemCard, InsightCard, StreakCard, StatCard)
  - Navigation (TopBar, TabBar)
  - FAB
  - IconButton
  - Form components (basic)

✅ Fonts
  - Inter (primary, 400-900 weights)
  - Fraunces (serif, 500-800 weights) for headlines/stats
```

### Key Design Details from HTML Demo

```
Colors Extracted:
  Brand: #0E5C3A (primary green)
  Status: Fresh (#1F9956), Soon (#E08F1B), Urgent (#E0392B), Expired (#6B6B6B)
  Backgrounds: #FAF6EE (warm cream), #FFFFFF (raised)
  Text: #0F1A11 (primary), #4D5A4F (secondary), #7B8580 (tertiary)

Spacing Pattern:
  - Cards: 18px padding
  - Content margins: 22px horizontal
  - Section gaps: 8-16px
  - Item card icon: 52×52px in 14px padding

Animation Details:
  - Button press: scale 0.97 (0.15s quick easing)
  - Card press: scale 0.98
  - Screen transitions: 0.45s ease
  - Shadows transition: 0.2s
  - FAB spring: cubic-bezier(0.34,1.56,0.64,1)

Status Colors in Context:
  Fresh: #1F9956 text + #E0F4E8 background + gradient stripe
  Soon: #E08F1B text + #FCEFD3 background
  Urgent: #E0392B text + #FBE0DD background
  Expired: #6B6B6B text + #ECECEC background
```

---

## PART 2: SCREEN-BY-SCREEN IMPLEMENTATION GUIDE

### Priority 1: Core User Flow (Weeks 1-2)

#### 1. **Splash Screen** ⏱️ 2-3 hours

**File**: `apps/mobile/app/(auth)/splash.tsx`

Visual from demo:

- Gradient bg: 135deg from #2A4A3A to #1A3A2A
- Emoji: 🍽️ (90px, animated float)
- Title: "WhatsFresh" (Fraunces, 42px, 800 weight)
- Tagline: "Track what's fresh. Reduce waste. Cook smart." (16px, 500 weight)
- Fade out animation after 2-3s

Implementation:

```tsx
export function SplashScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      // Navigate to onboarding or auth
    }, 2500);
  }, []);

  return (
    <YStack f={1} jc="center" ai="center" bg="linear-gradient(135deg, #2A4A3A 0%, #1A3A2A 100%)">
      <Text fontSize={90} animation="float">
        🍽️
      </Text>
      <Text fontFamily="$serif" fontSize={42} fw={800} color="white" letterSpacing={-1.8}>
        WhatsFresh
      </Text>
      <Text fontSize={16} color="rgba(255,255,255,0.9)" fw={500}>
        Track what's fresh. Reduce waste. Cook smart.
      </Text>
    </YStack>
  );
}
```

**What to Connect**: Auth state check — if logged in, go to dashboard; else go to onboarding

---

#### 2. **Onboarding Screen** ⏱️ 4-5 hours

**File**: `apps/mobile/app/(auth)/onboarding.tsx`

Visual from demo:

- 3 slides (carousel with dots indicator)
- Slide 1: "Track What's Fresh" (🌱 in gradient circle)
- Slide 2: "Reduce Waste" (📊 in gradient)
- Slide 3: "Cook Smarter" (👨‍🍳 in gradient)
- Dots indicator at bottom (active = 28px wide, animated)
- Action buttons: "Next" / "Get Started"

Implementation:

```tsx
export function OnboardingScreen() {
  const [slide, setSlide] = useState(0);

  const slides = [
    {
      emoji: '🌱',
      title: "Track What's Fresh",
      text: 'Know exactly what you have and when it expires',
      gradient: 'to-brand-glow',
      emoji_bg: 'onboard-art.green',
    },
    // ... slide 2, 3
  ];

  return (
    <YStack f={1} bg={tokens.color.bg}>
      {/* Slide carousel */}
      <YStack f={1} jc="center" ai="center" px={32}>
        <Circle size={240} bg={slides[slide].gradient}>
          <Text fontSize={110}>{slides[slide].emoji}</Text>
        </Circle>
        <Text fontFamily="$serif" fontSize={36} fw={800} mt={36} ta="center">
          {slides[slide].title}
        </Text>
        <Text fontSize={17} color={tokens.color.t2} mt={14} ta="center" maxWidth={320}>
          {slides[slide].text}
        </Text>
      </YStack>

      {/* Dots */}
      <XStack jc="center" gap={6} pb={24}>
        {slides.map((_, i) => (
          <Circle
            key={i}
            size={slide === i ? 28 : 8}
            bg={slide === i ? tokens.color.brand : tokens.color.b2}
            animation="all"
            dur={300}
          />
        ))}
      </XStack>

      {/* Buttons */}
      <XStack px={28} pb={32} gap={10}>
        <Button flex={1} variant="secondary" onPress={() => setSlide(slide - 1)}>
          Back
        </Button>
        <Button flex={1} variant="primary" onPress={() => setSlide(slide + 1) || navigateToAuth()}>
          {slide === 2 ? 'Get Started' : 'Next'}
        </Button>
      </XStack>
    </YStack>
  );
}
```

**What to Connect**: Navigation to auth screen on "Get Started"

---

#### 3. **Auth Screen** ⏱️ 3-4 hours

**File**: `apps/mobile/app/(auth)/auth.tsx`

Visual from demo:

- Gradient bg: 180deg from --brand-tint (0%) to --bg (60%)
- Logo: 🍽️ (64px, floating animation)
- App name: "WhatsFresh" (Fraunces, 38px, 800, brand color)
- Tagline: "Track what's fresh. Reduce waste. Cook smart." (16px, 500, secondary text)
- Email input field
- "Continue with Email" button (brand primary)
- Divider line with "or"
- "Continue with Apple" button (black)
- "Continue with Google" button (white with border)
- Error message area

Implementation:

```tsx
export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      const response = await authService.sendMagicLink(email);
      // Navigate to magic link screen
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <YStack
      f={1}
      bg="linear-gradient(180deg, var(--brand-tint) 0%, var(--bg) 60%)"
      px={28}
      pt={60}
      pb={32}
    >
      {/* Brand section */}
      <YStack ai="center" mb={48}>
        <Text fontSize={64} mb={12} animation="float">
          🍽️
        </Text>
        <Text
          fontFamily="$serif"
          fontSize={38}
          fw={800}
          color={tokens.color.brand}
          letterSpacing={-1.2}
        >
          WhatsFresh
        </Text>
        <Text fontSize={16} color={tokens.color.t2} fw={500}>
          Track what's fresh. Reduce waste. Cook smart.
        </Text>
      </YStack>

      {/* Form */}
      <YStack f={1} gap={12}>
        <YStack gap={8} mb={12}>
          <Label
            fontSize={13}
            fw={700}
            color={tokens.color.t2}
            textTransform="uppercase"
            letterSpacing={0.2}
          >
            Email
          </Label>
          <TextInput
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
            style={styles.input}
          />
        </YStack>

        {error && (
          <Text color={tokens.color.urgent} fontSize={14}>
            {error}
          </Text>
        )}

        <Button variant="primary" fullWidth loading={loading} onPress={handleContinue}>
          Continue with Email
        </Button>

        {/* Divider */}
        <XStack ai="center" gap={12} my={24}>
          <Line flex={1} height={1} bg={tokens.color.b1} />
          <Text
            fontSize={12}
            color={tokens.color.t3}
            fw={600}
            letterSpacing={0.5}
            textTransform="uppercase"
          >
            Or
          </Text>
          <Line flex={1} height={1} bg={tokens.color.b1} />
        </XStack>

        <Button
          variant="secondary"
          fullWidth
          startIcon="🍎"
          onPress={() => authService.signInWithApple()}
        >
          Continue with Apple
        </Button>
        <Button
          variant="secondary"
          fullWidth
          startIcon="🔍"
          onPress={() => authService.signInWithGoogle()}
        >
          Continue with Google
        </Button>
      </YStack>
    </YStack>
  );
}
```

**What to Connect**:

- authService.sendMagicLink(email)
- authService.signInWithApple()
- authService.signInWithGoogle()
- Navigate to magic link screen on success

---

#### 4. **Magic Link Screen** ⏱️ 2-3 hours

**File**: `apps/mobile/app/(auth)/magic-link.tsx`

Visual from demo:

- Check-in message: "Check your email for a magic link"
- Email display: "you@example.com"
- "Didn't receive it?" link with resend button
- Loading spinner animation
- Auto-open link if clicked from email client

Implementation:

```tsx
export function MagicLinkScreen({ email }: { email: string }) {
  const [resending, setResending] = useState(false);
  const router = useRouter();

  // Listen for deep link from email
  useEffect(() => {
    const handleDeepLink = ({ url }) => {
      const token = new URL(url).searchParams.get('token');
      if (token) {
        completeAuth(token);
      }
    };

    const subscription = linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  const handleResend = async () => {
    setResending(true);
    try {
      await authService.sendMagicLink(email);
      // Show toast: "Link sent!"
    } finally {
      setResending(false);
    }
  };

  return (
    <YStack f={1} bg={tokens.color.bg} jc="center" ai="center" px={28}>
      <YStack ai="center" ta="center">
        <Circle size={140} bg={tokens.color.brandSoft} mb={24}>
          <Text fontSize={64}>✉️</Text>
        </Circle>
        <Text fontFamily="$serif" fontSize={22} fw={700} mb={8}>
          Check your email
        </Text>
        <Text fontSize={15} color={tokens.color.t2} mb={24}>
          We sent a magic link to {email}
        </Text>
        <Text fontSize={15} color={tokens.color.t2} mb={24}>
          Click the link in your email to log in
        </Text>
        <Button variant="ghost" onPress={handleResend} disabled={resending}>
          {resending ? 'Sending...' : "Didn't receive? Send again"}
        </Button>
      </YStack>
    </YStack>
  );
}
```

**What to Connect**:

- authService.sendMagicLink(email) for resend
- Deep link handler for email magic link click
- Token verification on app open

---

### Priority 2: Main Dashboard Flow (Weeks 2-3)

#### 5. **Dashboard Screen** ⏱️ 5-6 hours

**File**: `apps/mobile/app/(main)/dashboard.tsx`

Visual from demo:

- TopBar: "WhatsFresh" title + subtitle "Track what's fresh" + settings icon
- Hero Stats Grid (3 columns):
  - Fresh count (green number, Fraunces 32px)
  - Soon count (orange number)
  - Urgent count (red number)
- Insight Card: Gradient bg (brand → brand-light), white text, "You're doing great", icon
- Streak Card: Coral→honey gradient, fire emoji, "7 Day Streak"
- Recent Items Section: List of ItemCards (5-6 items)
- FAB: "+" button positioned bottom-right

Implementation:

```tsx
export function DashboardScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState({ fresh: 0, soon: 0, urgent: 0 });
  const [streak, setStreak] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = SyncEngine.subscribe('dashboard', async () => {
      const freshItems = await ItemsService.getItems({ status: 'fresh' });
      const soonItems = await ItemsService.getItems({ status: 'soon' });
      const urgentItems = await ItemsService.getItems({ status: 'urgent' });

      setStats({
        fresh: freshItems.length,
        soon: soonItems.length,
        urgent: urgentItems.length,
      });

      // Fetch recent items
      const all = await ItemsService.getRecentItems(5);
      setItems(all);

      // Fetch streak
      const streakDays = await ProfileService.getStreak();
      setStreak(streakDays);
    });

    return () => unsubscribe();
  }, []);

  return (
    <YStack f={1} bg={tokens.color.bg}>
      {/* Top Bar */}
      <TopBar
        title="WhatsFresh"
        subtitle="Track what's fresh"
        actions={[{ icon: '⚙️', onPress: () => router.push('/settings') }]}
      />

      {/* Scrollable content */}
      <ScrollView showsVerticalScrollIndicator={false} pb={120}>
        {/* Hero Stats */}
        <XStack gap={10} px={22} my={16}>
          <StatCard type="fresh" number={stats.fresh} label="Fresh" />
          <StatCard type="soon" number={stats.soon} label="Soon" />
          <StatCard type="urgent" number={stats.urgent} label="Urgent" />
        </XStack>

        {/* Insight Card */}
        <InsightCard
          eyebrow="This Week"
          title="You're Doing Great"
          text={`No waste in ${streak} days`}
          icon="🌱"
          mx={22}
          mb={16}
        />

        {/* Streak Card */}
        <StreakCard count={streak} label="Day Streak" mx={22} mb={16} />

        {/* Recent Items */}
        <YStack px={22}>
          <Text fontSize={20} fw={700} mb={14}>
            Recent Items
          </Text>
          {items.map((item) => (
            <ItemCard
              key={item.id}
              status={item.status}
              icon={item.emoji}
              name={item.name}
              meta={`${item.container} • ${formatDate(item.addedDate)}`}
              badge={item.status.toUpperCase()}
              onPress={() => router.push(`/items/${item.id}`)}
            />
          ))}
        </YStack>
      </ScrollView>

      {/* FAB */}
      <FAB icon="+" onPress={() => router.push('/add-item')} />
    </YStack>
  );
}
```

**What to Connect**:

- ItemsService.getItems(filter) - fetch by status
- ItemsService.getRecentItems(count)
- ProfileService.getStreak()
- SyncEngine.subscribe() for real-time updates
- Navigation to add item, settings, item detail

---

#### 6. **Items Screen** ⏱️ 4-5 hours

**File**: `apps/mobile/app/(main)/items.tsx`

Visual from demo:

- TopBar: "Items" title
- Search bar with magnifying glass icon
- Filter chips: "All", "Fresh", "Soon", "Urgent", "Expired" (horizontally scrollable)
- Item list with ItemCards
- Pull-to-refresh functionality
- Empty state if no items: "No items yet" message + add button

Implementation:

```tsx
export function ItemsScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadItems();
  }, [filter, search]);

  const loadItems = async () => {
    let query = ItemsService.getItems();
    if (filter !== 'all') query = query.where('status', '==', filter);
    if (search) query = query.where('name', '==', search);

    const results = await query.execute();
    setItems(results);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await SyncEngine.sync();
      await loadItems();
    } finally {
      setRefreshing(false);
    }
  };

  const filters: (Status | 'all')[] = ['all', 'fresh', 'soon', 'urgent', 'expired'];

  return (
    <YStack f={1} bg={tokens.color.bg}>
      <TopBar title="Items" />

      {/* Search */}
      <XStack
        ai="center"
        gap={10}
        px={22}
        py={14}
        bg={tokens.color.raised}
        borderBottomWidth={1}
        borderBottomColor={tokens.color.b1}
      >
        <Text fontSize={16}>🔍</Text>
        <TextInput
          placeholder="Search items..."
          value={search}
          onChangeText={setSearch}
          style={{ flex: 1 }}
        />
      </XStack>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} px={22} py={14}>
        <XStack gap={8}>
          {filters.map((f) => (
            <Chip
              key={f}
              label={f.charAt(0).toUpperCase() + f.slice(1)}
              active={filter === f}
              onPress={() => setFilter(f)}
            />
          ))}
        </XStack>
      </ScrollView>

      {/* Items list or empty state */}
      {items.length === 0 ? (
        <YStack f={1} jc="center" ai="center">
          <Circle size={140} bg={tokens.color.brandSoft} mb={24}>
            <Text fontSize={64}>📦</Text>
          </Circle>
          <Text fontFamily="$serif" fontSize={22} fw={700} mb={8}>
            No items yet
          </Text>
          <Text fontSize={15} color={tokens.color.t2} mb={24} ta="center">
            Add items to start tracking what's fresh
          </Text>
          <Button variant="primary" onPress={() => router.push('/add-item')}>
            Add First Item
          </Button>
        </YStack>
      ) : (
        <FlashList
          data={items}
          renderItem={({ item }) => (
            <ItemCard
              status={item.status}
              icon={item.emoji}
              name={item.name}
              meta={`${item.container} • ${formatDate(item.addedDate)}`}
              badge={item.status.toUpperCase()}
              onPress={() => router.push(`/items/${item.id}`)}
              mx={22}
              mb={10}
            />
          )}
          estimatedItemSize={100}
          refreshing={refreshing}
          onRefresh={onRefresh}
          scrollIndicatorInsets={{ bottom: 100 }}
        />
      )}
    </YStack>
  );
}
```

**What to Connect**:

- ItemsService.getItems() with filters
- Search/filter queries
- SyncEngine.sync() for pull-to-refresh
- Item detail navigation
- Add item navigation

---

### Priority 3: Item Management (Week 3)

#### 7. **Add Item Screen** ⏱️ 5-6 hours

**File**: `apps/mobile/app/(main)/add-item.tsx`

Visual from demo:

- TopBar: "Add Item"
- Form fields:
  - Item name (text input)
  - Food type dropdown (produce, dairy, meat, frozen, pantry, other)
  - Container dropdown
  - Added date (date picker)
  - Expiry date (date picker)
  - Notes textarea
- "Scan Barcode" link at bottom
- Action buttons: "Cancel" + "Add Item" (primary)

Implementation:

```tsx
export function AddItemScreen() {
  const [form, setForm] = useState({
    name: '',
    foodType: 'produce',
    container: '',
    addedDate: new Date(),
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const foodTypes = ['produce', 'dairy', 'meat', 'frozen', 'pantry', 'other'];
  const containers = ['fridge', 'freezer', 'pantry', 'counter', 'other'];

  const handleAddItem = async () => {
    setLoading(true);
    try {
      await ItemsService.createItem({
        ...form,
        foodType: form.foodType as FoodType,
        expirySource: 'manual',
      });

      // Show toast
      Toast.show({
        type: 'success',
        text1: 'Item added!',
      });

      router.back();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error adding item',
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <YStack f={1} bg={tokens.color.bg}>
      <TopBar title="Add Item" />

      <ScrollView px={22} py={16} showsVerticalScrollIndicator={false} pb={120}>
        {/* Item Name */}
        <FormField label="Item Name">
          <TextInput
            placeholder="e.g., Broccoli"
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
          />
        </FormField>

        {/* Food Type */}
        <FormField label="Food Type">
          <Picker
            selectedValue={form.foodType}
            onValueChange={(val) => setForm({ ...form, foodType: val })}
            items={foodTypes}
          />
        </FormField>

        {/* Container */}
        <FormField label="Container">
          <Picker
            selectedValue={form.container}
            onValueChange={(val) => setForm({ ...form, container: val })}
            items={containers}
          />
        </FormField>

        {/* Added Date */}
        <FormField label="Added Date">
          <DatePicker
            date={form.addedDate}
            onDateChange={(date) => setForm({ ...form, addedDate: date })}
          />
        </FormField>

        {/* Expiry Date */}
        <FormField label="Expires">
          <DatePicker
            date={form.expiryDate}
            onDateChange={(date) => setForm({ ...form, expiryDate: date })}
          />
        </FormField>

        {/* Notes */}
        <FormField label="Notes (optional)">
          <TextInput
            placeholder="Storage location, storage instructions, etc."
            value={form.notes}
            onChangeText={(text) => setForm({ ...form, notes: text })}
            multiline
            numberOfLines={4}
          />
        </FormField>

        {/* Scan Barcode */}
        <Button variant="ghost" onPress={() => router.push('/scan')}>
          📷 Scan Barcode Instead
        </Button>
      </ScrollView>

      {/* Action Buttons */}
      <XStack gap={10} px={22} pb={32}>
        <Button flex={1} variant="secondary" onPress={() => router.back()}>
          Cancel
        </Button>
        <Button flex={1} variant="primary" loading={loading} onPress={handleAddItem}>
          Add Item
        </Button>
      </XStack>
    </YStack>
  );
}
```

**What to Connect**:

- ItemsService.createItem()
- Food type and container enums/lists
- Navigate to scan on barcode button
- Navigate back on success

---

#### 8. **Item Detail Screen** ⏱️ 4-5 hours

**File**: `apps/mobile/app/(main)/[id]/detail.tsx`

Visual from demo:

- Detail Hero Section: Large icon (110px), colored gradient based on status
- Title: Item name (Fraunces, 36px, 800)
- Status badge
- Info rows:
  - Container
  - Added date
  - Expiry date
  - Days remaining
  - Notes
- Action buttons grid:
  - Edit button
  - Delete button (coral)
  - Move to container

Implementation:

```tsx
export function ItemDetailScreen({ id }: { id: string }) {
  const [item, setItem] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadItem = async () => {
      const data = await ItemsService.getItem(id);
      setItem(data);
    };
    loadItem();
  }, [id]);

  const handleDelete = async () => {
    Alert.alert('Delete Item', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await ItemsService.deleteItem(id);
            router.back();
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (!item) return <ActivityIndicator />;

  const daysRemaining = Math.ceil(
    (new Date(item.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  );

  const statusGradient = {
    fresh: 'linear-gradient(135deg, var(--fresh-bg) 0%, var(--brand-soft) 100%)',
    soon: 'linear-gradient(135deg, var(--soon-bg) 0%, var(--honey-soft) 100%)',
    urgent: 'linear-gradient(135deg, var(--urgent-bg) 0%, var(--coral-soft) 100%)',
  }[item.status];

  return (
    <YStack f={1} bg={tokens.color.bg}>
      {/* Hero section */}
      <YStack h={280} jc="center" ai="center" bg={statusGradient}>
        <Text fontSize={110}>{item.emoji}</Text>
        <Button
          variant="ghost"
          position="absolute"
          top={60}
          left={16}
          onPress={() => router.back()}
        >
          ← Back
        </Button>
        <Button
          variant="ghost"
          position="absolute"
          top={60}
          right={16}
          onPress={() => router.push(`/items/${id}/edit`)}
        >
          ✏️ Edit
        </Button>
      </YStack>

      {/* Body */}
      <YStack
        bg={tokens.color.bg}
        borderTopLeftRadius={28}
        borderTopRightRadius={28}
        mt={-24}
        pt={24}
        px={22}
        pb={120}
      >
        <Badge status={item.status} mb={10} />
        <Text fontFamily="$serif" fontSize={36} fw={800} letterSpacing={-1.2} mb={8}>
          {item.name}
        </Text>
        <Text fontSize={15} color={tokens.color.t2} mb={24}>
          {daysRemaining} days remaining
        </Text>

        {/* Info card */}
        <Card>
          <InfoRow label="Container" value={item.container} />
          <InfoRow label="Added" value={formatDate(item.addedDate)} />
          <InfoRow label="Expires" value={formatDate(item.expiryDate)} />
          {item.notes && <InfoRow label="Notes" value={item.notes} />}
        </Card>

        {/* Actions */}
        <XStack gap={10} mt={24}>
          <Button flex={1} variant="secondary" onPress={() => router.push(`/items/${id}/edit`)}>
            ✏️ Edit
          </Button>
          <Button flex={1} variant="coral" loading={deleting} onPress={handleDelete}>
            🗑️ Delete
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
}
```

**What to Connect**:

- ItemsService.getItem(id)
- ItemsService.deleteItem(id)
- Navigation to edit screen
- Status color mapping

---

### Priority 4: Secondary Features (Weeks 4-5)

#### 9. **Scan Screen** ⏱️ 6-8 hours

**File**: `apps/mobile/app/(main)/scan.tsx`

Visual from demo:

- Full-screen dark background (gradient: #0a0f0d to #1a2520)
- Mode toggle at top: "Barcode" / "QR" (dark pill background)
- Center: Scan frame (260×260px) with corner brackets
- Animated scan line moving down
- Bottom controls:
  - Thumbnail preview (left)
  - Shutter button (center, white circle)
  - Flip camera (right)
- "Point camera at barcode" text above frame

Implementation:

```tsx
export function ScanScreen() {
  const [mode, setMode] = useState<'barcode' | 'qr'>('barcode');
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const cameraRef = useRef(null);
  const router = useRouter();

  const handleBarcodeDetected = async (barcode: string) => {
    // Scan detected - navigate to results
    router.push({
      pathname: '/scan-results',
      params: { barcode },
    });
  };

  return (
    <YStack f={1} bg="linear-gradient(180deg, #0a0f0d 0%, #1a2520 100%)">
      {/* Camera feed */}
      <CameraView
        ref={cameraRef}
        facing={facing}
        onBarcodeScanned={handleBarcodeDetected}
        barcodeScannerSettings={{ barcodeTypes: mode === 'barcode' ? ['ean13'] : ['qr'] }}
        style={{ flex: 1 }}
      />

      {/* Mode toggle */}
      <XStack
        pos="absolute"
        top={100}
        left="50%"
        ml={-50}
        gap={4}
        bg="rgba(0,0,0,0.6)"
        px={4}
        py={4}
        borderRadius={9999}
        backdropFilter="blur(20px)"
      >
        {(['barcode', 'qr'] as const).map((m) => (
          <Button
            key={m}
            px={14}
            py={8}
            bg={m === mode ? 'white' : 'transparent'}
            color={m === mode ? 'black' : 'rgba(255,255,255,0.6)'}
            fontSize={13}
            fw={700}
            onPress={() => setMode(m)}
          >
            {m === 'barcode' ? 'Barcode' : 'QR'}
          </Button>
        ))}
      </XStack>

      {/* Scan frame overlay */}
      <YStack pos="absolute" top="50%" left="50%" w={260} h={260} ml={-130} mt={-130}>
        {/* Corners */}
        <ScanCorner pos="absolute" top={0} left={0} />
        <ScanCorner pos="absolute" top={0} right={0} />
        <ScanCorner pos="absolute" bottom={0} left={0} />
        <ScanCorner pos="absolute" bottom={0} right={0} />

        {/* Scan line animation */}
        <YStack
          pos="absolute"
          h={3}
          bg="linear-gradient(90deg, transparent, var(--brand-glow), transparent)"
          left={8}
          right={8}
          animation="scanline"
        />
      </YStack>

      {/* Hint text */}
      <Text
        color="white"
        fs={16}
        fw={600}
        pos="absolute"
        bottom={200}
        left={0}
        right={0}
        ta="center"
        textShadow="0 2px 12px rgba(0,0,0,0.5)"
      >
        Point camera at {mode}
      </Text>

      {/* Bottom controls */}
      <XStack jc="space-between" ai="center" px={32} pb={40} pt={0} pos="relative" zIndex={5}>
        {/* Thumbnail */}
        <YStack
          w={56}
          h={56}
          borderRadius={16}
          bg="rgba(255,255,255,0.15)"
          borderWidth={2}
          borderColor="rgba(255,255,255,0.3)"
        />

        {/* Shutter button */}
        <YStack
          w={76}
          h={76}
          borderRadius={9999}
          bg="white"
          borderWidth={4}
          borderColor="rgba(255,255,255,0.3)"
          jc="center"
          ai="center"
          onPress={() => cameraRef.current?.takePictureAsync()}
        >
          <Circle size={64} borderWidth={3} borderColor={tokens.color.brand} />
        </YStack>

        {/* Flip camera */}
        <Button
          w={48}
          h={48}
          borderRadius={9999}
          bg="rgba(255,255,255,0.15)"
          color="white"
          fs={22}
          onPress={() => setFacing(facing === 'front' ? 'back' : 'front')}
        >
          🔄
        </Button>
      </XStack>
    </YStack>
  );
}
```

**What to Connect**:

- Camera permission handling (expo-camera)
- Barcode/QR detection
- Navigate to scan results with barcode data
- Image capture to gallery

---

#### 10. **Recipes Screen** ⏱️ 4-5 hours

**File**: `apps/mobile/app/(main)/recipes.tsx`

Visual from demo:

- TopBar: "Recipes"
- Search bar
- Category tabs (horizontal scroll): "All", "Quick", "Vegetarian", "Seasonal"
- Recipe cards in grid:
  - Large gradient background
  - Emoji (80px)
  - Title (Fraunces)
  - Meta: prep time, servings, difficulty
  - Match indicator: "You have X ingredients"
- Empty state if no recipes

Implementation:

```tsx
export function RecipesScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadRecipes();
  }, [category, search]);

  const loadRecipes = async () => {
    const data = await RecipesService.getRecipes({
      category: category === 'all' ? undefined : category,
      search: search || undefined,
    });
    setRecipes(data);
  };

  return (
    <YStack f={1} bg={tokens.color.bg}>
      <TopBar title="Recipes" />

      {/* Search */}
      <XStack
        ai="center"
        gap={10}
        px={22}
        py={14}
        bg={tokens.color.raised}
        borderBottomWidth={1}
        borderBottomColor={tokens.color.b1}
      >
        <Text fs={16}>🔍</Text>
        <TextInput
          placeholder="Search recipes..."
          value={search}
          onChangeText={setSearch}
          flex={1}
        />
      </XStack>

      {/* Category tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} px={22} py={14}>
        <XStack gap={8}>
          {['all', 'quick', 'vegetarian', 'seasonal'].map((cat) => (
            <Chip
              key={cat}
              label={cat.charAt(0).toUpperCase() + cat.slice(1)}
              active={category === cat}
              onPress={() => setCategory(cat)}
            />
          ))}
        </XStack>
      </ScrollView>

      {/* Recipe grid */}
      {recipes.length === 0 ? (
        <EmptyState emoji="🍳" title="No recipes found" />
      ) : (
        <FlashList
          data={recipes}
          renderItem={({ item }) => (
            <RecipeCard recipe={item} onPress={() => router.push(`/recipes/${item.id}`)} />
          )}
          estimatedItemSize={240}
          scrollIndicatorInsets={{ bottom: 100 }}
        />
      )}
    </YStack>
  );
}
```

**What to Connect**:

- RecipesService.getRecipes(filters)
- Recipe data structure
- Navigation to recipe detail

---

### Priority 5: Settings & Profile (Week 5)

#### 11. **Settings Screen** ⏱️ 4-5 hours

**File**: `apps/mobile/app/(main)/settings.tsx`

Visual from demo:

- TopBar: "Settings"
- Profile header:
  - Avatar (96px gradient circle)
  - Name (Fraunces, 26px)
  - Email
  - Stats row: items tracked, waste reduced
- Settings sections (cards):
  - Notifications (toggle + time picker)
  - Appearance (light/dark/auto)
  - Language
  - Household settings
  - Data & Privacy (export, delete account)
  - Legal (ToS, Privacy)
- Logout button (bottom, coral)

Implementation:

```tsx
export function SettingsScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadSettings = async () => {
      const userData = await ProfileService.getCurrentUser();
      const userPrefs = await useUserPreferences().get();
      setUser(userData);
      setPrefs(userPrefs);
    };
    loadSettings();
  }, []);

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await authService.signOut();
            router.replace('/auth');
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  if (!user || !prefs) return <ActivityIndicator />;

  return (
    <YStack f={1} bg={tokens.color.bg}>
      <TopBar title="Settings" />

      <ScrollView pb={120}>
        {/* Profile Header */}
        <YStack ai="center" pt={20} pb={32}>
          <Avatar size={96} name={user.name} />
          <Text fontFamily="$serif" fs={26} fw={800} mt={14} letterSpacing={-0.5}>
            {user.name}
          </Text>
          <Text fs={14} color={tokens.color.t2} mt={4}>
            {user.email}
          </Text>

          {/* Stats */}
          <XStack gap={24} jc="center" mt={16}>
            <YStack ai="center">
              <Text fontFamily="$serif" fs={22} fw={800} color={tokens.color.brand}>
                {user.itemsCount}
              </Text>
              <Text fs={11} color={tokens.color.t2} fw={600}>
                ITEMS TRACKED
              </Text>
            </YStack>
            <YStack ai="center">
              <Text fontFamily="$serif" fs={22} fw={800} color={tokens.color.brand}>
                {user.daysNoWaste}
              </Text>
              <Text fs={11} color={tokens.color.t2} fw={600}>
                DAYS NO WASTE
              </Text>
            </YStack>
          </XStack>
        </YStack>

        {/* Notification Settings */}
        <SettingsSection title="Notifications">
          <SettingsToggle
            icon="🔔"
            title="Expiry Alerts"
            subtitle="Get notified when items are expiring"
            value={prefs.notificationsEnabled}
            onChange={(val) => setPrefs({ ...prefs, notificationsEnabled: val })}
          />
          <SettingsToggle
            icon="💡"
            title="Recipe Suggestions"
            subtitle="Get suggestions based on your items"
            value={prefs.suggestionsEnabled}
            onChange={(val) => setPrefs({ ...prefs, suggestionsEnabled: val })}
          />
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection title="Appearance">
          <SettingsRow
            icon="🌙"
            title="Theme"
            value={prefs.theme === 'auto' ? 'Auto' : prefs.theme === 'dark' ? 'Dark' : 'Light'}
            onPress={() => router.push('/settings/theme')}
          />
        </SettingsSection>

        {/* Household */}
        <SettingsSection title="Household">
          <SettingsRow
            icon="👥"
            title="Household Settings"
            value={`${user.householdMembersCount} members`}
            onPress={() => router.push('/settings/household')}
          />
        </SettingsSection>

        {/* Data & Privacy */}
        <SettingsSection title="Data & Privacy">
          <SettingsRow icon="📊" title="Export Data" onPress={() => ProfileService.exportData()} />
          <SettingsRow
            icon="🗑️"
            title="Delete Account"
            subtitle="Permanently delete all data"
            destructive
            onPress={handleLogout}
          />
        </SettingsSection>

        {/* Legal */}
        <SettingsSection title="Legal">
          <SettingsRow
            icon="📄"
            title="Terms of Service"
            onPress={() => WebBrowser.openBrowserAsync('https://...')}
          />
          <SettingsRow
            icon="🔒"
            title="Privacy Policy"
            onPress={() => WebBrowser.openBrowserAsync('https://...')}
          />
        </SettingsSection>

        {/* Logout */}
        <YStack px={22} gap={10} mt={32}>
          <Button variant="coral" fullWidth loading={loggingOut} onPress={handleLogout}>
            🚪 Log Out
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
```

**What to Connect**:

- ProfileService.getCurrentUser()
- useUserPreferences() hook
- ProfileService.exportData()
- Theme switching
- Logout flow

---

## PART 3: COMPONENT ASSEMBLY CHECKLIST

### Already Built ✅

- [x] Button component (all variants)
- [x] Card component
- [x] ItemCard component
- [x] InsightCard component
- [x] StreakCard component
- [x] StatCard component
- [x] TopBar component
- [x] TabBar component
- [x] FAB component
- [x] IconButton component
- [x] Theme tokens system
- [x] Gradient system
- [x] Fraunces serif font

### Still Need to Build

- [ ] FormField wrapper
- [ ] Picker/Select dropdown
- [ ] DatePicker component
- [ ] Chip/Filter component
- [ ] Badge component
- [ ] Avatar component (small + large)
- [ ] SettingsRow component
- [ ] SettingsToggle component
- [ ] SettingsSection component
- [ ] Divider/Line component
- [ ] InfoRow component
- [ ] EmptyState component
- [ ] RecipeCard component
- [ ] Notification card component
- [ ] Toast notification system
- [ ] Alert dialog component
- [ ] Modal/BottomSheet component
- [ ] Skeleton loader component

---

## PART 4: IMPLEMENTATION ROADMAP

### Week 1: Auth Flow + Small Components

- [ ] Splash Screen (2-3 hrs)
- [ ] Onboarding (4-5 hrs)
- [ ] Auth Screen (3-4 hrs)
- [ ] Magic Link Screen (2-3 hrs)
- [ ] Build missing small components (FormField, Badge, Avatar, Divider, etc.)

### Week 2: Dashboard + Basic Components

- [ ] Dashboard Screen (5-6 hrs)
- [ ] Items List Screen (4-5 hrs)
- [ ] Build missing card/list components (RecipeCard, NotificationCard, etc.)
- [ ] Connect SyncEngine for real-time updates

### Week 3: Item Management

- [ ] Add Item Screen (5-6 hrs)
- [ ] Item Detail Screen (4-5 hrs)
- [ ] Build form-related components (Picker, DatePicker)
- [ ] Implement CRUD operations

### Week 4: Advanced Features

- [ ] Scan Screen (6-8 hrs)
- [ ] Scan Results Screen (3-4 hrs)
- [ ] Recipes Screen (4-5 hrs)
- [ ] Recipe Detail Screen (4-5 hrs)

### Week 5: Settings + Polish

- [ ] Settings Screen (4-5 hrs)
- [ ] Household Screen (3-4 hrs)
- [ ] Achievements Screen (3-4 hrs)
- [ ] Analytics Screen (4-5 hrs)
- [ ] Toast/notification system
- [ ] Error handling + edge cases

### Week 6: Final Polish

- [ ] All animations matching HTML demo
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Cross-platform testing
- [ ] User testing + feedback

---

## PART 5: KEY CONNECTORS TO APIs

### Required Service Methods

```typescript
// Items Service
ItemsService.createItem(data)
ItemsService.getItem(id)
ItemsService.updateItem(id, data)
ItemsService.deleteItem(id)
ItemsService.getItems(filters?)
ItemsService.getRecentItems(count)

// Profile Service
ProfileService.getCurrentUser()
ProfileService.updateProfile(data)
ProfileService.getStreak()
ProfileService.exportData()

// Auth Service
authService.sendMagicLink(email)
authService.signInWithApple()
authService.signInWithGoogle()
authService.signOut()

// Sync Engine
SyncEngine.subscribe(key, callback)
SyncEngine.sync()

// Recipes Service
RecipesService.getRecipes(filters?)
RecipesService.getRecipe(id)
RecipesService.searchRecipes(query)

// User Preferences
useUserPreferences().get()
useUserPreferences().set(key, value)
```

---

## PART 6: PIXEL-PERFECT REFERENCE

Every screen visual is locked in the HTML demo at `app.html`. When building:

1. **Colors**: Copy hex directly from demo, use tokens system
2. **Typography**: Fraunces for headlines/stats, Inter for everything else
3. **Spacing**: 22px horizontal margins, 18px card padding, 14px component gaps
4. **Shadows**: s-1 for cards, s-glow for CTAs, s-coral for destructive
5. **Animations**: 0.15s quick easing for buttons, 0.45s ease for screens, spring for FAB
6. **Icons**: Use emojis from demo (🍽️, 🌱, 📊, 🎯, etc.)
7. **Status colors**: Fresh (green), Soon (orange), Urgent (red), Expired (gray)
8. **Border radius**: lg (22px) for cards, full (9999px) for pills/FAB

---

## NEXT STEPS

1. **Start with Auth screens** (fastest path to "working app")
2. **Build missing small components** (FormField, Badge, Avatar, etc.)
3. **Implement Dashboard + Items list** (core user flow)
4. **Connect real APIs** and test end-to-end
5. **Build remaining screens** in priority order
6. **Polish animations** and accessibility
7. **User testing** before launch

You're 40% done already. Let's finish this! 🚀
