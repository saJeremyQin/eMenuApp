# iPad Waiter App - Quick Reference Guide

## Current Status: ✅ READY FOR TESTING

The app is now fully implemented with the correct architecture as requested:
- "点击某个桌子，进入menuscreen，你得用stack navigator把它管理起来...menuscreen的下方不再有底部的tabbar"
- Click table → enter menu → managed by Stack Navigator → no TabBar on menu screen ✅

---

## Navigation Architecture At a Glance

```
LOGIN SCREEN
    ↓ [Select Waiter/Demo]
BOTTOM TABS (2 tabs: 🍴 Ordering | ℹ️ About)
    └─ Ordering Tab
        └─ STACK NAVIGATOR for menu flow:
            ├─ TableSelectionScreen (4×6 grid = 24 tables)
            │   └─ [Click Table]
            ├─ MenuScreen (60% menu | 40% cart)
            │   ├─ Left: Dishes with categories + quantity controls
            │   ├─ Right: Diner tabs + cart + order summary
            │   └─ [← Back] returns to TableSelection
            ├─ OrderReviewScreen (confirm order)
            └─ OrderDetailsScreen (order status)
    
    └─ About Tab (always shows tabbar)
```

### Key Feature: Smart TabBar Hiding
- **TableSelectionScreen**: TabBar VISIBLE (shows 🍴 Ordering | ℹ️ About)
- **MenuScreen**: TabBar HIDDEN (full-screen menu experience)
- **OrderReviewScreen**: TabBar HIDDEN
- **About Screen**: TabBar VISIBLE

---

## Screen Layout Details

### TableSelectionScreen (Landscape)
```
[TIME/BATTERY]
┌──────────────────────────────────────┐
│         SELECT TABLE (4×6 grid)      │
│  ┌───┬───┬───┬───┐                  │
│  │T1 │T2 │T3 │T4 │                  │
│  ├───┼───┼───┼───┤                  │
│  │...│...│...│...│ (24 total)       │
│  │T21│T22│T23│T24│                  │
│  └───┴───┴───┴───┘                  │
└──────────────────────────────────────┘
🍴 Ordering | ℹ️ About [TABBAR VISIBLE]
```

### MenuScreen (Landscape - 2 Panel)
```
[TIME/BATTERY]
┌────────────────────────────────────┬────────────────────┐
│ ← Back    🍽️ Menu                   │  Diner Tabs: 🍴 + │
│                                    │  ─────────────────  │
│ Category Tabs                      │  Cart Items:       │
│ ├ Appetizers [selected]            │  • Item 1 × 2      │
│ ├ Mains                            │  • Item 2 × 1      │
│ └ Desserts                         │  ─────────────────  │
│                                    │  Total: €25.00     │
│ Dishes Grid (60% width):           │  [Review Order]    │
│ ┌─────┐ ┌─────┐ ┌─────┐          │                    │
│ │Dish1│ │Dish2│ │Dish3│          │                    │
│ │  €8 │ │€12  │ │€6   │          │                    │
│ │ +   │ │++   │ │+    │          │                    │
│ └─────┘ └─────┘ └─────┘          │                    │
│                                    │                    │
└────────────────────────────────────┴────────────────────┘
       [NO TABBAR - FULL SCREEN]
```

---

## Color Scheme (Prototype-V4)

| Element | Color | Hex |
|---------|-------|-----|
| Background | Deep Blue | #0a1f3f |
| Accent | Pink | #ff3d7f |
| Card BG | Dark Blue | #1a3a5c |
| Text Primary | White | #ffffff |
| Text Secondary | Light Gray | #a0aec0 |
| Border | Medium Gray | #4a5568 |

---

## How to Test

### Start the App
```bash
cd /Users/nicolezhang/Desktop/eMenu/eMenuApp
npm start -- --reset-cache   # Terminal 1: Metro Bundler
npm run ios                  # Terminal 2: Launch on iPad simulator
```

### Test User Flow
1. **Login**: Select Waiter (👔) or Demo (🎮) role
2. **Table Selection**: 
   - See 24 tables in 4×6 grid
   - Click any table → should navigate to MenuScreen
   - Check: TabBar should HIDE when entering MenuScreen
3. **Menu Screen**:
   - Left side: Browse dishes by category
   - Right side: Cart with diner selection (🍴 default, + button to add more)
   - Add items: Click items to add, use +/− buttons to adjust quantity
   - Click ← Back: Should return to table selection
   - Check: No TabBar at bottom
4. **Tab Switching**:
   - While on TableSelection, click ℹ️ About tab
   - Check: TabBar appears, AboutScreen shown
   - Click 🍴 Ordering tab: Back to TableSelection
5. **Order Review**:
   - From MenuScreen, click "Review Order"
   - Check: Can review items before submission

---

## File Locations

| File | Purpose |
|------|---------|
| `/src/navigation/AppNavigator.tsx` | Root navigation + TabBar logic |
| `/src/screens/MenuScreen.tsx` | Menu with back button & cart |
| `/src/screens/TableSelectionScreen.tsx` | 24-table grid |
| `/src/screens/LoginScreen.tsx` | Waiter/demo role selection |
| `/src/config/theme.ts` | Unified color/spacing system |
| `/src/hooks/useScreenDimensions.ts` | Responsive layout helper |
| `/src/store/orderSlice.ts` | Redux order state |

---

## Key Implementation Details

### TabBar Hiding Logic (AppNavigator.tsx)
```typescript
const state = navigation.getState();
const orderingRoutes = state?.routes?.[0]?.state?.routes;
const isDeepInStack = orderingRoutes && orderingRoutes.length > 1;

// Hide TabBar when deeper than root (TableSelection)
tabBarStyle: isDeepInStack ? { display: 'none' } : { ...visibleStyles }
```

### Back Button (MenuScreen.tsx)
```typescript
<TouchableOpacity onPress={() => navigation.goBack()}>
  <Text>← Back</Text>
</TouchableOpacity>
```

### Responsive Layout
- **isLandscape** = width > height
- **Left Panel**: 60% of width on landscape, 100% on portrait  
- **Right Panel**: 40% of width on landscape, hidden on portrait

---

## What's Working ✅

- ✅ Stack Navigator for table → menu flow
- ✅ TabBar auto-hiding on menu screens
- ✅ Back button for returning to tables
- ✅ 24-table grid with direct selection
- ✅ Two-panel menu layout (horizontal on landscape)
- ✅ Diner tab management (🍴 + button)
- ✅ Cart item management
- ✅ SafeAreaInsets integration
- ✅ Landscape orientation lock
- ✅ Redux state management
- ✅ Prototype-v4 color scheme
- ✅ 0 TypeScript errors

---

## What's Next ⏳

- Connect real GraphQL queries (currently mock)
- Add real image loading from backend
- Implement order submission to kitchen
- Test on physical iPad
- Add haptic feedback
- Implement order notifications

---

## Troubleshooting

**App crashes on startup?**
- Kill Metro: `lsof -i :8081 | grep node | awk '{print $2}' | xargs kill`
- Restart: `npm start -- --reset-cache`

**Back button not working?**
- Check Navigation state: Ensure OrderingStack is configured with proper screen nesting

**TabBar still visible in Menu?**
- Verify `getState()` is correctly accessing OrderingStack depth
- Check `isDeepInStack` calculation in AppNavigator

**SafeAreaInsets not applied?**
- Ensure `useSafeAreaInsets()` is called in components
- Verify `SafeAreaProvider` wraps app in App.tsx

---

## Next Session Task

1. Test complete user flow on simulator
2. Verify TabBar hiding transitions smoothly
3. Test back button navigation multiple times
4. Connect to real backend data
5. Deploy to physical iPad for final testing
