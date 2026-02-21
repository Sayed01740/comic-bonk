# Phase 0: Baseline Regression Checklist

Before and after applying any changes, verify the following core functionalities to ensure no regressions.

## 1. App Startup
- [ ] App launches without crashing.
- [ ] Connect Wallet button is visible on the start screen.
- [ ] No immediate "wallet not found" or other error toasts upon launch.

## 2. Wallet Connection (Phantom)
- [ ] Tap "Connect Wallet".
- [ ] Phantom wallet opens (deeplink or bottom sheet).
- [ ] Authorize the connection in Phantom.
- [ ] App returns to foreground.
- [ ] UI updates to show "Connected" (or helper text with public key).
- [ ] Log output (logcat) confirms `handleResult: SUCCESS` and shows valid `publicKeyBase58`.
- [ ] Helper object `window.SolanaWallet` has `connect()` method available.

## 3. Wallet Connection (Solflare)
- [ ] (If Solflare installed) Repeat step 2 with Solflare.
- [ ] confirm correct behavior with a different wallet provider.

## 4. Wallet Connection (Cancellation)
- [ ] Tap "Connect Wallet".
- [ ] When wallet opens, tap "One-time" (or similar) then **Cancel/Reject** the connection request.
- [ ] App returns to foreground.
- [ ] UI should *not* show connected state.
- [ ] Log output should show rejection/cancellation message.
- [ ] Tap "Connect Wallet" again immediately. Should validly restart the flow (not blocked by "already in progress" state).

## 5. Wallet Connection (Timeout/Background)
- [ ] Tap "Connect Wallet".
- [ ] Wait at the wallet screen for > 1 minute without interacting.
- [ ] Switch back to the app manually.
- [ ] App should handle the resume gracefully (likely timeout or user cancellation).
- [ ] `connectInProgress` flag should be cleared so subsequent attempts work.

## 6. Config & Safety
- [ ] Logs do not show sensitive private keys (MWA doesn't expose them anyway, but check authToken isn't printed in RELEASE info logs).
- [ ] Connect flow uses Mainnet Beta (MWA cluster `solana:mainnet`).

## 7. Build
- [ ] `./gradlew :app:assembleDebug` completes successfully.
