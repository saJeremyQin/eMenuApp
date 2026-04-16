# eMenu Waiter App

React Native (bare) application for waiters to manage restaurant orders.

## Architecture
```
Login (Cognito) → Get FCM Token → Upload to Backend
                     ↓
Customer Orders → Backend → FCM Push → Waiter App
                     ↓
Confirm Order → Print Receipt → Update Status
```

## Features
- ✅ Cognito authentication (custom UI)
- ✅ Firebase Cloud Messaging (push notifications)
- ✅ Apollo GraphQL client
- ✅ Orders management (pending orders list)
- ✅ Order confirmation flow
- 🔲 Thermal printer integration (TODO)
- 🔲 Menu browsing & checkout (TODO)

## Implementation Checklists
- [Free Tier Single Waiter Implementation Checklist](./FREE_TIER_SINGLE_WAITER_IMPLEMENTATION_CHECKLIST.md)

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure AWS (Required)
Update `/src/config/aws-config.js` with your AWS credentials:
- `region`: Your AWS region
- `userPoolId`: Cognito User Pool ID
- `userPoolWebClientId`: Cognito App Client ID
- `GRAPHQL_CONFIG.endpoint`: AppSync GraphQL endpoint

### 3. Setup Firebase Cloud Messaging

#### iOS
1. Create a Firebase project at https://console.firebase.google.com
2. Add iOS app to Firebase project
3. Download `GoogleService-Info.plist`
4. Place it in `/ios/eMenuApp/`
5. Install pods:
```bash
cd ios
pod install
cd ..
```

#### Android
1. Add Android app to Firebase project
2. Download `google-services.json`
3. Place it in `/android/app/`

### 4. Run the App

#### iOS
```bash
npx react-native run-ios
```

#### Android
```bash
npx react-native run-android
```

## TODO
- [ ] Add FCM token update mutation in backend GraphQL schema
- [ ] Implement updateFCMToken mutation in backend
- [ ] Add thermal printer library integration
- [ ] Port menu browsing & checkout from whatsmenu
- [ ] Add splash screen
- [ ] Add logout functionality

---

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
