// A small confirm dialog for staff screens. Unlike Alert.alert it also works in the web preview.
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { StaffColors, StaffSpace } from '../staff.theme';

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.box} accessibilityRole="alert">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.row}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={[styles.btn, styles.cancel]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={[styles.btn, { backgroundColor: danger ? StaffColors.danger : StaffColors.primary }]}
            >
              <Text style={styles.okText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: StaffColors.scannerVeil, justifyContent: 'center', padding: StaffSpace.side },
  box: { backgroundColor: StaffColors.surface, borderRadius: 20, padding: 20 },
  title: { fontSize: 18, fontWeight: '800', color: StaffColors.navy },
  message: { fontSize: 14, color: StaffColors.body, marginTop: 8, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 10, marginTop: 18 },
  btn: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  cancel: { borderWidth: 1, borderColor: StaffColors.field },
  cancelText: { fontSize: 15, fontWeight: '700', color: StaffColors.navy },
  okText: { fontSize: 15, fontWeight: '700', color: StaffColors.onDark, textAlign: 'center' },
});
