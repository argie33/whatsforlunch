import React, { useState, useCallback } from 'react';
import { StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { QrCode, Barcode, Camera as CameraIcon, Calendar, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export type ScanMode = 'qr' | 'barcode' | 'photo' | 'date';

const MODE_KEYS: ScanMode[] = ['qr', 'barcode', 'photo', 'date'];
const MODE_ICONS: Record<ScanMode, React.FC<{ size: number; color: string }>> = {
  qr: QrCode,
  barcode: Barcode,
  photo: CameraIcon,
  date: Calendar,
};

const RETICLE_SIZE = 260;

export default function ScanScreen() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ScanMode>('qr');
  const [scanning, setScanning] = useState(false);
  const insets = useSafeAreaInsets();

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const handleModeChange = useCallback(async (next: ScanMode) => {
    await Haptics.selectionAsync();
    setMode(next);
    setScanning(false);
  }, []);

  const handleClose = useCallback(() => {
    router.back();
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes: mode === 'qr' ? ['qr'] : ['ean-13', 'ean-8', 'upc-a', 'upc-e', 'code-128', 'code-39'],
    onCodeScanned: async (codes) => {
      if (scanning || codes.length === 0) return;
      setScanning(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const value = codes[0].value ?? '';
      if (mode === 'qr') {
        // Phase B: resolve qr token → navigate to container detail or claim flow
        console.log('[scan] QR detected:', value);
      } else {
        // Phase B: barcode lookup → pre-fill item creation
        console.log('[scan] Barcode detected:', value);
      }
      setTimeout(() => setScanning(false), 1500);
    },
  });

  const handleCapture = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Phase B: take photo → upload to S3 → call classify-food or ocr-expiry Lambda
    console.log('[scan] Capture pressed, mode:', mode);
  }, [mode]);

  if (!hasPermission) {
    return (
      <YStack flex={1} backgroundColor="$background" justifyContent="center" alignItems="center" gap="$4" padding="$6">
        <CameraIcon size={48} color="#5C615E" />
        <Text fontSize="$5" fontWeight="600" textAlign="center" color="$color">
          Camera access needed
        </Text>
        <Text fontSize="$4" color="$colorFocus" textAlign="center">
          WhatsForLunch needs camera access to scan QR codes, barcodes, and food photos.
        </Text>
        <Pressable
          style={styles.permissionButton}
          onPress={async () => {
            await Haptics.selectionAsync();
            await requestPermission();
          }}
        >
          <Text color="white" fontWeight="600" fontSize={16}>
            {t('onboarding.allowCamera')}
          </Text>
        </Pressable>
      </YStack>
    );
  }

  if (!device) {
    return (
      <YStack flex={1} backgroundColor="black" justifyContent="center" alignItems="center">
        <ActivityIndicator color="white" />
      </YStack>
    );
  }

  const isCodeMode = mode === 'qr' || mode === 'barcode';
  const isCaptureMode = mode === 'photo' || mode === 'date';

  return (
    <View flex={1} backgroundColor="black">
      {/* Full-screen camera */}
      {isCodeMode ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          codeScanner={codeScanner}
        />
      ) : (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          photo
        />
      )}

      {/* Top bar */}
      <YStack
        position="absolute"
        top={0}
        left={0}
        right={0}
        paddingTop={insets.top + 8}
        paddingHorizontal="$4"
        paddingBottom="$3"
      >
        <XStack justifyContent="flex-end">
          <Pressable
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={12}
          >
            <X size={20} color="white" />
          </Pressable>
        </XStack>
      </YStack>

      {/* Reticle / viewfinder overlay */}
      <YStack
        position="absolute"
        top={0}
        bottom={0}
        left={0}
        right={0}
        justifyContent="center"
        alignItems="center"
        pointerEvents="none"
      >
        <View
          width={RETICLE_SIZE}
          height={mode === 'barcode' ? RETICLE_SIZE * 0.55 : RETICLE_SIZE}
          borderRadius={mode === 'barcode' ? 12 : 20}
          borderWidth={2}
          borderColor="rgba(255,255,255,0.8)"
          backgroundColor="transparent"
        >
          {/* Corner accents */}
          <CornerAccents />
        </View>
        {scanning && (
          <YStack
            position="absolute"
            backgroundColor="rgba(47,125,91,0.9)"
            paddingHorizontal="$4"
            paddingVertical="$2"
            borderRadius="$full"
            marginTop={RETICLE_SIZE / 2 + 16}
          >
            <Text color="white" fontSize="$3" fontWeight="600">
              ✓ {t('scan.detected')}
            </Text>
          </YStack>
        )}
      </YStack>

      {/* Mode hint text */}
      <YStack
        position="absolute"
        left={0}
        right={0}
        alignItems="center"
        style={{ top: '50%', marginTop: RETICLE_SIZE / 2 + 20 }}
        pointerEvents="none"
      >
        <Text color="rgba(255,255,255,0.7)" fontSize="$3">
          {mode === 'qr' && t('scan.qrPrompt')}
          {mode === 'barcode' && t('scan.barcodePrompt')}
          {mode === 'photo' && t('scan.photoPrompt')}
          {mode === 'date' && t('scan.datePrompt')}
        </Text>
      </YStack>

      {/* Capture button (photo + date modes) */}
      {isCaptureMode && (
        <YStack
          position="absolute"
          left={0}
          right={0}
          alignItems="center"
          bottom={insets.bottom + 100}
        >
          <Pressable onPress={handleCapture} style={styles.captureButton} />
        </YStack>
      )}

      {/* Bottom mode switcher */}
      <XStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        paddingBottom={insets.bottom + 12}
        paddingTop="$3"
        backgroundColor="rgba(0,0,0,0.7)"
        justifyContent="space-around"
        alignItems="center"
      >
        {MODE_KEYS.map((key) => {
          const active = mode === key;
          const Icon = MODE_ICONS[key];
          const modeLabel = t(`scan.mode${key.charAt(0).toUpperCase() + key.slice(1)}`);
          return (
            <Pressable
              key={key}
              onPress={() => handleModeChange(key)}
              style={styles.modeTab}
            >
              <YStack alignItems="center" gap="$1">
                <Icon
                  size={22}
                  color={active ? '#5FB389' : 'rgba(255,255,255,0.55)'}
                />
                <Text
                  fontSize={11}
                  fontWeight={active ? '600' : '400'}
                  color={active ? '#5FB389' : 'rgba(255,255,255,0.55)'}
                >
                  {modeLabel}
                </Text>
                {active && (
                  <View
                    width={4}
                    height={4}
                    borderRadius={2}
                    backgroundColor="#5FB389"
                    marginTop={1}
                  />
                )}
              </YStack>
            </Pressable>
          );
        })}
      </XStack>
    </View>
  );
}

function CornerAccents() {
  const s = 20;
  const t = 3;
  const c = 'rgba(255,255,255,0.9)';
  return (
    <>
      {/* top-left */}
      <View position="absolute" top={-t} left={-t} width={s} height={s} borderTopWidth={t} borderLeftWidth={t} borderColor={c} borderTopLeftRadius={4} />
      {/* top-right */}
      <View position="absolute" top={-t} right={-t} width={s} height={s} borderTopWidth={t} borderRightWidth={t} borderColor={c} borderTopRightRadius={4} />
      {/* bottom-left */}
      <View position="absolute" bottom={-t} left={-t} width={s} height={s} borderBottomWidth={t} borderLeftWidth={t} borderColor={c} borderBottomLeftRadius={4} />
      {/* bottom-right */}
      <View position="absolute" bottom={-t} right={-t} width={s} height={s} borderBottomWidth={t} borderRightWidth={t} borderColor={c} borderBottomRightRadius={4} />
    </>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'white',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 52,
  },
  permissionButton: {
    backgroundColor: '#2F7D5B',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
});
