import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, Image, Modal, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';

const STORAGE_URL = 'ag_controller_url';
const STORAGE_TOKEN = 'ag_controller_token';

export default function App() {
  const [baseUrl, setBaseUrl] = useState('http://100.x.x.x:19199');
  const [token, setToken] = useState('');
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('Not connected');
  const [busy, setBusy] = useState(false);
  const [screenshotNonce, setScreenshotNonce] = useState(Date.now());
  const [history, setHistory] = useState([]);
  const [zoomOpen, setZoomOpen] = useState(false);

  const cleanUrl = useMemo(() => baseUrl.replace(/\/$/, ''), [baseUrl]);
  const headers = useMemo(() => ({
    'content-type': 'application/json',
    ...(token ? { authorization: `Bearer ${token}` } : {})
  }), [token]);
  const screenshotUrl = `${cleanUrl}/screenshot?fresh=0&t=${screenshotNonce}`;

  useEffect(() => {
    (async () => {
      const savedUrl = await SecureStore.getItemAsync(STORAGE_URL);
      const savedToken = await SecureStore.getItemAsync(STORAGE_TOKEN);
      if (savedUrl) setBaseUrl(savedUrl);
      if (savedToken) setToken(savedToken);
    })();
  }, []);

  async function saveSettings() {
    await SecureStore.setItemAsync(STORAGE_URL, baseUrl);
    await SecureStore.setItemAsync(STORAGE_TOKEN, token);
    Alert.alert('Saved', 'Connection settings saved on this device.');
  }

  async function testConnection() {
    setBusy(true);
    try {
      const res = await fetch(`${cleanUrl}/health`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStatus(`Connected: ${data.name} v${data.version} window=${data.windowHint}`);
    } catch (err) {
      setStatus(`Connection failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function sendPrompt() {
    if (!prompt.trim()) return Alert.alert('Missing prompt', 'Type a prompt first.');
    setBusy(true);
    try {
      const res = await fetch(`${cleanUrl}/send-prompt`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: prompt.trim(), enter: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.result?.stderr || `HTTP ${res.status}`);
      setStatus(data.ok ? 'Prompt sent to Antigravity.' : 'Prompt send returned an error.');
      setHistory(prev => [{ ts: new Date().toLocaleTimeString(), prompt: prompt.trim(), ok: data.ok }, ...prev].slice(0, 20));
      setTimeout(refreshScreenshot, 1500);
    } catch (err) {
      setStatus(`Send failed: ${err.message}`);
      Alert.alert('Send failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  async function refreshScreenshot() {
    setBusy(true);
    try {
      const res = await fetch(`${cleanUrl}/screenshot?fresh=1`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setScreenshotNonce(Date.now());
      setStatus('Screenshot refreshed.');
    } catch (err) {
      setStatus(`Screenshot failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function stopRequest() {
    setBusy(true);
    try {
      await fetch(`${cleanUrl}/stop`, { method: 'POST', headers, body: JSON.stringify({}) });
      setStatus('Stop request recorded. Stop manually in Antigravity if needed.');
    } catch (err) {
      setStatus(`Stop failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function pasteTemplate() {
    const text = await Clipboard.getStringAsync();
    setPrompt(text || 'Continue the current task in Antigravity. Summarize what you will do first.');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>CD Antigravity Controller</Text>
        <Text style={styles.subtitle}>Prompt sender + screenshot viewer over Tailscale</Text>

        <View style={styles.card}>
          <Text style={styles.section}>Connect</Text>
          <Text style={styles.label}>PC Controller URL</Text>
          <TextInput value={baseUrl} onChangeText={setBaseUrl} autoCapitalize="none" autoCorrect={false} style={styles.input} placeholder="http://100.x.x.x:19199" placeholderTextColor="#789" />
          <Text style={styles.label}>Token</Text>
          <TextInput value={token} onChangeText={setToken} secureTextEntry autoCapitalize="none" autoCorrect={false} style={styles.input} placeholder="Bearer token" placeholderTextColor="#789" />
          <View style={styles.row}>
            <Button label="Save" onPress={saveSettings} />
            <Button label="Test" onPress={testConnection} disabled={busy} secondary />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Prompt</Text>
          <TextInput value={prompt} onChangeText={setPrompt} multiline style={[styles.input, styles.prompt]} placeholder="Type prompt for Antigravity..." placeholderTextColor="#789" />
          <View style={styles.row}>
            <Button label="Send to Antigravity" onPress={sendPrompt} disabled={busy} />
            <Button label="Paste clipboard" onPress={pasteTemplate} secondary />
          </View>
          <View style={styles.row}>
            <Button label="Refresh screen" onPress={refreshScreenshot} disabled={busy} secondary />
            <Button label="Stop" onPress={stopRequest} disabled={busy} danger />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Status</Text>
          <Text style={styles.status}>{status}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Latest Screenshot</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={() => setZoomOpen(true)}>
            <Image source={{ uri: screenshotUrl, headers: token ? { authorization: `Bearer ${token}` } : undefined }} style={styles.image} resizeMode="contain" />
          </TouchableOpacity>
          <Text style={styles.hint}>Tap the image to open full screen and pinch to zoom. If blank, tap Refresh after sending a prompt.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>History</Text>
          {history.length === 0 ? <Text style={styles.hint}>No prompt sent yet.</Text> : history.map((h, i) => (
            <View key={i} style={styles.historyItem}>
              <Text style={styles.historyTime}>{h.ts} • {h.ok ? 'OK' : 'ERR'}</Text>
              <Text style={styles.historyText}>{h.prompt}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={zoomOpen} transparent animationType="fade" onRequestClose={() => setZoomOpen(false)}>
        <View style={styles.zoomBackdrop}>
          <ScrollView
            style={styles.zoomScroll}
            contentContainerStyle={styles.zoomContent}
            maximumZoomScale={5}
            minimumZoomScale={1}
            bouncesZoom
            centerContent
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={{ uri: screenshotUrl, headers: token ? { authorization: `Bearer ${token}` } : undefined }}
              style={styles.zoomImage}
              resizeMode="contain"
            />
          </ScrollView>
          <View style={styles.zoomBar}>
            <TouchableOpacity onPress={refreshScreenshot} style={styles.zoomBtn}>
              <Text style={styles.zoomBtnText}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setZoomOpen(false)} style={[styles.zoomBtn, styles.zoomClose]}>
              <Text style={styles.zoomBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Button({ label, onPress, secondary, danger, disabled }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.button, secondary && styles.secondary, danger && styles.danger, disabled && styles.disabled]}>
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#07131c' },
  container: { padding: 18, gap: 14 },
  title: { color: '#eaffff', fontSize: 28, fontWeight: '900' },
  subtitle: { color: '#8fb7c8', marginTop: -8, marginBottom: 8 },
  card: { backgroundColor: '#102636', borderColor: 'rgba(255,255,255,.10)', borderWidth: 1, borderRadius: 22, padding: 16, gap: 10 },
  section: { color: '#6ee7ff', fontSize: 18, fontWeight: '800' },
  label: { color: '#9fc3d1', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.7 },
  input: { backgroundColor: '#071923', borderColor: 'rgba(255,255,255,.14)', borderWidth: 1, color: '#fff', borderRadius: 14, padding: 12 },
  prompt: { minHeight: 150, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  button: { backgroundColor: '#6ee7ff', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, flexGrow: 1, alignItems: 'center' },
  secondary: { backgroundColor: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.13)', borderWidth: 1 },
  danger: { backgroundColor: '#ff7b98' },
  disabled: { opacity: 0.55 },
  buttonText: { color: '#05202b', fontWeight: '900' },
  secondaryText: { color: '#eaffff' },
  status: { color: '#d8f8ff', lineHeight: 20 },
  image: { width: '100%', height: 230, backgroundColor: '#061018', borderRadius: 14 },
  hint: { color: '#8fb7c8', fontSize: 13 },
  historyItem: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.08)', paddingTop: 10, gap: 4 },
  historyTime: { color: '#8affc1', fontSize: 12, fontWeight: '700' },
  historyText: { color: '#eaffff' },
  zoomBackdrop: { flex: 1, backgroundColor: '#000' },
  zoomScroll: { flex: 1 },
  zoomContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  zoomImage: { width: Dimensions.get('window').width, height: Dimensions.get('window').height * 0.82 },
  zoomBar: { position: 'absolute', bottom: 34, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 12 },
  zoomBtn: { backgroundColor: 'rgba(110,231,255,.92)', paddingVertical: 12, paddingHorizontal: 26, borderRadius: 14 },
  zoomClose: { backgroundColor: 'rgba(255,255,255,.18)' },
  zoomBtnText: { color: '#05202b', fontWeight: '900', fontSize: 15 }
});
