# Esearth Nursery Manager

## Current State
- Dashboard shows 4 fixed stat cards (Today's Sales, Transactions, Expenditure, Net Profit), area charts, recent transactions list, and low stock alerts.
- Recent transactions are computed with `.reverse()` but sorted by salesRecords array order (oldest first effectively).
- Priority Register shows all requests (pending and fulfilled) in a single sorted table. Fulfilled requests appear in the same table but users report they "vanish" — the table has no tab separation, so when all items are fulfilled nothing is clearly visible as history.
- Dashboard stat cards have no customize/reorder functionality.

## Requested Changes (Diff)

### Add
- Dashboard: "Customize" button (only visible to Owner role) that opens a panel/dialog where each stat card can be resized (normal / wide) and reordered via up/down controls. Preferences saved to localStorage.
- Priority Register: Tab navigation with "Active (Pending)" tab and "History (Fulfilled)" tab. Fulfilled requests go to the History tab instead of the main list, so they are never hidden.

### Modify
- Dashboard: Fix `recentTransactions` to sort by date descending (newest first), not just `.reverse()` which relies on insertion order.
- Priority Register: Default view shows only Pending requests. Fulfilled requests shown in History tab.

### Remove
- Nothing removed.

## Implementation Plan
1. **Dashboard.tsx** — Fix `recentTransactions` useMemo to sort by `date` descending, then take top 5.
2. **Dashboard.tsx** — Add `dashboardCardOrder` + `dashboardCardSize` state (loaded from localStorage). Add a "Customize" button near the Today's Summary heading. Add a customize drawer/dialog that lists each stat card with up/down reorder arrows and a size toggle (normal/wide). Apply order and size when rendering the grid.
3. **PriorityRegister.tsx** — Add a tab state (`active` | `history`). Filter `sorted` into `pending` and `fulfilled` arrays. Render two tabs: "Active" shows pending, "History" shows fulfilled. Both tabs show the same table columns.
