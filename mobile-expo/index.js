// Force React Native's InitializeCore to run FIRST, before any app code.
// This registers the runtime globals (WebSocket, FormData, XHR, setImmediate...).
// On some setups Metro fails to place InitializeCore in the run-before-main list,
// which causes "[runtime not ready]: Property 'FormData'/'WebSocket' doesn't exist".
import 'react-native/Libraries/Core/InitializeCore';

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
