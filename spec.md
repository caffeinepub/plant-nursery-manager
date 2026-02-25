# Specification

## Summary
**Goal:** Add Internet Identity authentication to the Plant Nursery Manager frontend so users must log in before accessing the app.

**Planned changes:**
- Add a "Login with Internet Identity" button visible when the user is not authenticated
- Integrate the existing `useInternetIdentity` hook to handle the authentication flow
- Display a welcome indicator or the user's principal when logged in
- Add a "Logout" button that clears the session and returns to the unauthenticated state
- Ensure the `useActor` hook uses the authenticated identity for all backend calls
- Restrict or prompt unauthenticated users to log in before accessing app features

**User-visible outcome:** Users see a login prompt when visiting the app, can authenticate via Internet Identity, see a confirmation of their logged-in state, and can log out at any time.
