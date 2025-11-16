# KGF MEN'S WEAR — Billing Software (Desktop + Mobile)

This repository contains a scaffold for:
- **desktop-electron/** — Electron-based desktop app (Windows .exe via electron-builder)
- **mobile-expo/** — Expo React Native mobile app (Android .apk via EAS)

Features included (scaffolded):
- New billing screen stub with manual discount & GST toggle (desktop)
- Barcode camera scanning (mobile) via expo-barcode-scanner
- HID keyboard-style barcode capture (mobile + desktop)
- BLE scanning screen (mobile) using `react-native-ble-plx` (native; requires prebuild/dev-client or eject)
- Inventory JSON storage (desktop)
- GitHub Actions workflow to build Windows .exe on GitHub

## How to build (mobile-friendly)
1. Create this repo on GitHub and paste files from this repo (use mobile browser).
2. For Windows `.exe`: open **Actions** → run the `Build Electron Windows` workflow. It will produce an artifact `kgf-electron-windows` (download from the Actions run).
3. For Android `.apk`: use EAS Build (recommended) or local `expo run:android`. See `mobile-expo/README.md`.

## Need help?
If you want, I can paste step-by-step copy/paste instructions for creating files on GitHub from your phone. Request: **"Guide me step by step"**.
