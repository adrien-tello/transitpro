// Full-screen camera for the handover photo (proof of delivery).
// The server takes at most 3 MB, so the camera is set to a picture size of about 1600 to 1920 px
// instead of the full sensor size (no image library needed).
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StaffColors, StaffSpace } from '../staff.theme';
import { StaffIcon } from './StaffIcon';

const MAX_SIDE = 1920;

// "1920x1080" → the biggest size whose long side is at most 1920 px.
function pickSize(sizes: string[]): string | undefined {
  const parsed = sizes
    .map((s) => {
      const [w, h] = s.split('x').map(Number);
      return { s, long: Math.max(w || 0, h || 0) };
    })
    .filter((x) => x.long > 0 && x.long <= MAX_SIDE)
    .sort((a, b) => b.long - a.long);
  return parsed[0]?.s;
}

export function HandoverCamera({
  visible,
  onClose,
  onTaken,
}: {
  visible: boolean;
  onClose: () => void;
  onTaken: (uri: string) => void;
}) {
  const ref = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [size, setSize] = useState<string | undefined>();
  const [taking, setTaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onReady() {
    try {
      const sizes = (await ref.current?.getAvailablePictureSizesAsync()) ?? [];
      setSize(pickSize(sizes));
    } catch {
      // Some phones do not list sizes: the low JPEG quality below keeps the file small anyway.
    }
  }

  async function take() {
    if (!ref.current || taking) return;
    setTaking(true);
    setError(null);
    try {
      const photo = await ref.current.takePictureAsync({ quality: 0.6, shutterSound: false });
      if (!photo?.uri) throw new Error('No photo');
      onTaken(photo.uri);
    } catch {
      setError('The photo failed. Try again.');
    } finally {
      setTaking(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {permission?.granted && (
          <CameraView ref={ref} style={StyleSheet.absoluteFill} facing="back" pictureSize={size} onCameraReady={onReady} />
        )}
        <SafeAreaView style={styles.layer}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close camera" onPress={onClose} style={styles.round}>
              <StaffIcon name="x" size={20} color={StaffColors.onDark} />
            </Pressable>
            <Text style={styles.title}>Handover photo</Text>
            <View style={{ width: 44 }} />
          </View>
          <Text style={styles.hint}>The parcel in the receiver's hands, label visible.</Text>

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {permission && !permission.granted && (
              <View style={styles.permission}>
                <Text style={styles.permissionText}>Allow the camera to take the handover photo.</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
                  style={styles.permissionBtn}
                >
                  <Text style={styles.permissionBtnText}>{permission.canAskAgain ? 'Allow camera' : 'Open settings'}</Text>
                </Pressable>
              </View>
            )}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take the photo"
              disabled={!permission?.granted || taking}
              onPress={take}
              style={({ pressed }) => [styles.shutter, (pressed || taking) && { opacity: 0.7 }]}
            >
              {taking ? <ActivityIndicator color={StaffColors.navy} /> : <View style={styles.shutterInner} />}
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: StaffColors.scannerBg },
  layer: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: StaffSpace.side,
    paddingTop: 8,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: StaffColors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: StaffColors.onDark, fontSize: 16, fontWeight: '700' },
  hint: { color: StaffColors.onDarkMuted, fontSize: 13, textAlign: 'center', marginTop: 10 },
  permission: { backgroundColor: StaffColors.glassSoft, borderRadius: 20, padding: 20, margin: 24, alignItems: 'center', gap: 12 },
  permissionText: { color: StaffColors.onDark, fontSize: 14, textAlign: 'center', fontWeight: '600' },
  permissionBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: StaffColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBtnText: { color: StaffColors.onDark, fontSize: 14, fontWeight: '700' },
  error: { color: StaffColors.onDark, textAlign: 'center', fontWeight: '700', marginBottom: 10 },
  footer: { alignItems: 'center', paddingBottom: 32 },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: StaffColors.onDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 62, height: 62, borderRadius: 31, borderWidth: 3, borderColor: StaffColors.navy },
});
