# Esearth Nursery Manager

## Current State

A full-stack plant nursery management app with:
- Internet Identity login + PIN-based role selector (Owner PIN: 1006, Clerk PIN: 2026)
- Sales recording with inventory auto-deduction, billing numbers, thermal invoice PDF
- Inventory management (add/edit/delete, stock movements, history)
- Expenditure tracking
- Profit analysis
- Dashboard with charts
- Priority Register (customer future plant requests)
- Daily Checklist

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- Fix `updatePriorityRequestStatus` backend bug: the function incorrectly looked up the request AFTER removing it from the list, so status updates (pending → fulfilled) never persisted. Fix: find the request FIRST, then filter and re-add with updated status.
- The billing counter and daily billing number logic should remain as-is.

### Remove
- Nothing

## Implementation Plan

1. Regenerate backend Motoko with corrected `updatePriorityRequestStatus` logic:
   - Find existing request before modifying the list
   - Remove old entry, then add updated entry with new status and deliveryDate
2. Keep all other backend functions identical to current state
3. No frontend changes needed for this fix (frontend `PinRoleProvider` fix already applied in main.tsx; sales table reverse() fix already applied)
