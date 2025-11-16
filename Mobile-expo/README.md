# KGF Billing - Mobile (Expo)

This is a simple single-page billing app scaffold:
- Manual entry of product name/price/qty + barcode scanning
- Discount per product and total auto-calculation
- Local storage: products, customers, billing history (AsyncStorage)
- Print invoice using `expo-print`

## How to use
1. Add `assets/icon.png` and `assets/splash.png` in the assets folder.
2. Commit to GitHub inside `Mobile-expo/` folder.
3. Start an EAS build (Android) from Expo dashboard or run locally:
   - `eas build --platform android --profile production`

## Notes
- BLE/native printing: requires prebuild/dev-client workflow.
- This project is ready for EAS managed build.