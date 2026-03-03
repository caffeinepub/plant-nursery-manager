/**
 * PIN-based role hook.
 *
 * After Internet Identity login the user must enter a PIN to choose their role:
 *   Owner  → PIN 1006 → "owner"
 *   Clerk  → PIN 2026 → "clerk"
 *
 * The resolved role is stored in sessionStorage so it survives page refreshes
 * within the same browser tab but clears when the tab is closed / on logout.
 */

import {
  type PropsWithChildren,
  type ReactNode,
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AppRole = "owner" | "clerk" | null;

const OWNER_PIN = "1006";
const CLERK_PIN = "2026";
const STORAGE_KEY = "esearth_app_role";

export type PinRoleContextType = {
  /** Resolved role after PIN entry, or null if not yet entered */
  appRole: AppRole;
  /** Whether the PIN modal should be shown */
  showPinModal: boolean;
  /** Call when user submits a PIN. Returns true if correct, false if wrong. */
  submitPin: (pin: string, roleType: "owner" | "clerk") => boolean;
  /** Clear the role (on logout) */
  clearRole: () => void;
  /** Trigger the PIN modal manually (e.g. after II login) */
  triggerPinModal: () => void;
};

const PinRoleContext = createContext<PinRoleContextType | undefined>(undefined);

export function PinRoleProvider({
  children,
}: PropsWithChildren<{ children: ReactNode }>) {
  const [appRole, setAppRole] = useState<AppRole>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored === "owner" || stored === "clerk") return stored;
    } catch {}
    return null;
  });
  const [showPinModal, setShowPinModal] = useState(false);

  const submitPin = useCallback(
    (pin: string, roleType: "owner" | "clerk"): boolean => {
      const expected = roleType === "owner" ? OWNER_PIN : CLERK_PIN;
      if (pin === expected) {
        setAppRole(roleType);
        try {
          sessionStorage.setItem(STORAGE_KEY, roleType);
        } catch {}
        setShowPinModal(false);
        return true;
      }
      return false;
    },
    [],
  );

  const clearRole = useCallback(() => {
    setAppRole(null);
    setShowPinModal(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const triggerPinModal = useCallback(() => {
    setShowPinModal(true);
  }, []);

  const value = useMemo<PinRoleContextType>(
    () => ({ appRole, showPinModal, submitPin, clearRole, triggerPinModal }),
    [appRole, showPinModal, submitPin, clearRole, triggerPinModal],
  );

  return createElement(PinRoleContext.Provider, { value, children });
}

export function usePinRole(): PinRoleContextType {
  const ctx = useContext(PinRoleContext);
  if (!ctx) throw new Error("usePinRole must be used inside PinRoleProvider");
  return ctx;
}
