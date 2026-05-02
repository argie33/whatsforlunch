import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '@/lib/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { QrCode, Barcode, Camera as CameraIcon, Calendar, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { LottiePlayer } from '@/components/ui/LottiePlayer';

import { useDatabase } from '@/db';
import { containersService } from '@/services/ContainersService';
import { useAuthIds } from '@/features/auth';

export type ScanMode = 'qr' | 'barcode' | 'photo' | 'date';

const MODE_KEYS: ScanMode[] = ['qr', 'barcode', 'photo', 'date'];
type IconComponent = React.ComponentType<{ size: number; color: string }>;
const MODE_ICONS: Record<ScanMode, IconComponent> = {
  qr: QrCode as IconComponent,
  barcode: Barcode as IconComponent,
  photo: CameraIcon as IconComponent,
  date: Calendar as IconComponent,
};

const RETICLE_SIZE = 260;

export default function ScanScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ mode?: ScanMode }>();
  const [mode, setMode] = useState<ScanMode>(params.mode ?? 'qr');
  const [scanning, setScanning] = useState(false);
  const insets = useSafeAreaInsets();
  const db = useDatabase();
  const { householdId } = useAuthIds();
  const cameraRef = useRef<Camera>(null);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const handleModeChange = useCallback(async (next: ScanMode) => {
    await haptics.selection();
    setMode(next);
    setScanning(false);
  }, []);

  const handleClose = useCallback(() => {
    router.back();
  }, []);

  const claimQrToken = useCallback(
    async (qrToken: string, nickname?: string) => {
      if (!householdId) {
        Alert.alert(t('common.error'));
        return;
      }
      try {
        const container = await containersService.claimContainer(db, {
          householdId: householdId as string,
          qrToken,
          nickname: nickname || undefined,
        });
        router.replace({ pathname: '/(main)/containers/[id]', params: { id: container.id } });
      } catch {
        Alert.alert(t('common.error'));
        setScanning(false);
      }
    },
    [db, t, householdId],
  );

  const handleQrScanned = useCallback(
    async (qrToken: string) => {
      const existing = await containersService.getContainerByQrToken(db, qrToken);
      if (existing) {
        router.replace({ pathname: '/(main)/containers/[id]', params: { id: existing.id } });
        return;
      }
      if (Platform.OS === 'ios') {
        Alert.prompt(
          t('containers.claimContainer'),
          t('containers.claimBody'),
          async (nickname) => {
            if (nickname == null) {
              setScanning(false);
              return;
            }
            await claimQrToken(qrToken, nickname);
          },
          'plain-text',
        );
      } else {
        Alert.alert(t('containers.claimContainer'), t('containers.claimBody'), [
          { text: t('common.cancel'), onPress: () => setScanning(false) },
          { text: t('common.confirm'), onPress: () => claimQrToken(qrToken) },
        ]);
      }
    },
    [t, claimQrToken],
  );

  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    router.replace({
      pathname: '/(main)/items/new',
      params: { prefillBarcode: barcode },
    });
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes:
      mode === 'qr' ? ['qr'] : ['ean-13', 'ean-8', 'upc-a', 'upc-e', 'code-128', 'code-39'],
    onCodeScanned: async (codes) => {
      if (scanning || codes.length === 0) return;
      setScanning(true);
      AccessibilityInfo.announceForAccessibility(t('accessibility.scanSuccess'));
      await haptics.success();
      const value = codes[0].value ?? '';
      if (mode === 'qr') {
        await handleQrScanned(value);
      } else {
        await handleBarcodeScanned(value);
      }
    },
  });

  const handleCapture = useCallback(async () => {
    if (scanning || !cameraRef.current) return;
    setScanning(true);
    AccessibilityInfo.announceForAccessibility(t('accessibility.aiProcessing'));
    await haptics.medium();
    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      router.replace({
        pathname: '/(main)/items/new',
        params: {
          prefillPhotoPath: photo.path,
          prefillSource: mode,
        },
      });
    } catch (err) {
      console.error('[scan] takePhoto failed:', err);
    } finally {
      setScanning(false);
    }
  }, [mode, scanning, t]);

  if (!hasPermission) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        justifyContent="center"
        alignItems="center"
        gap="$4"
        padding="$6"
      >
        <CameraIcon size={48} color="#5C615E" accessible={false} />
        <Text
          fontSize="$5"
          fontWeight="600"
          textAlign="center"
          color="$color"
          accessibilityRole="header"
        >
          {t('scan.permissionTitle')}
        </Text>
        <Text fontSize="$4" color="$colorFocus" textAlign="center">
          {t('scan.permissionBody')}
        </Text>
        <Pressable
          style={styles.permissionButton}
          onPress={async () => {
            await haptics.selection();
            await requestPermission();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.allowCamera')}
        >
          <Text color="white" fontWeight="600" fontSize={16} accessible={false}>
            {t('onboarding.allowCamera')}
          </Text>
        </Pressable>
      </YStack>
    );
  }

  if (!device) {
    return (
      <YStack flex={1} backgroundColor="black" justifyContent="center" alignItems="center">
        <ActivityIndicator color="white" accessibilityLabel={t('accessibility.loadingIndicator')} />
      </YStack>
    );
  }

  const isCodeMode = mode === 'qr' || mode === 'barcode';
  const isCaptureMode = mode === 'photo' || mode === 'date';

  return (
    <View flex={1} backgroundColor="black">
      {/* Full-screen camera — decorative; screen reader focus goes to controls */}
      {isCodeMode ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          codeScanner={codeScanner}
          accessible={false}
        />
      ) : (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          photo
          accessible={false}
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
            accessibilityRole="button"
            accessibilityLabel={t('scan.closeCamera')}
          >
            <X size={20} color="white" accessible={false} />
          </Pressable>
        </XStack>
      </YStack>

      {/* Reticle / viewfinder overlay — decorative, pointer-events disabled */}
      <YStack
        position="absolute"
        top={0}
        bottom={0}
        left={0}
        right={0}
        justifyContent="center"
        alignItems="center"
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <View
          width={RETICLE_SIZE}
          height={mode === 'barcode' ? RETICLE_SIZE * 0.55 : RETICLE_SIZE}
          borderRadius={mode === 'barcode' ? 12 : 20}
          borderWidth={2}
          borderColor="rgba(255,255,255,0.8)"
          backgroundColor="transparent"
        >
          {isCodeMode && (
            <LottiePlayer
              source={require('~/assets/lottie/scan-reticle.json')}
              loop
              style={StyleSheet.absoluteFillObject}
              accessible={false}
            />
          )}
          {!isCodeMode && <CornerAccents />}
        </View>
        {scanning && (
          <YStack position="absolute" alignItems="center" marginTop={RETICLE_SIZE / 2 + 8}>
            <LottiePlayer
              source={require('~/assets/lottie/scan-success.json')}
              loop={false}
              style={{ width: 80, height: 80 }}
              accessible={false}
            />
            <Text color="white" fontSize="$3" fontWeight="600" marginTop="$1" accessible={false}>
              {t('scan.detected')}
            </Text>
          </YStack>
        )}
      </YStack>

      {/* Mode hint text — decorative; active mode tab already conveys context */}
      <YStack
        position="absolute"
        left={0}
        right={0}
        alignItems="center"
        style={{ top: '50%', marginTop: RETICLE_SIZE / 2 + 20 }}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <Text color="rgba(255,255,255,0.7)" fontSize="$3" accessible={false}>
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
          <Pressable
            onPress={handleCapture}
            style={styles.captureButton}
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.scanButton')}
            accessibilityState={{ disabled: scanning }}
          />
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
        accessibilityRole="radiogroup"
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
              accessibilityRole="radio"
              accessibilityLabel={modeLabel}
              accessibilityState={{ checked: active }}
            >
              <YStack alignItems="center" gap="$1" accessible={false}>
                <Icon size={22} color={active ? '#5FB389' : 'rgba(255,255,255,0.55)'} />
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
      <View
        position="absolute"
        top={-t}
        left={-t}
        width={s}
        height={s}
        borderTopWidth={t}
        borderLeftWidth={t}
        borderColor={c}
        borderTopLeftRadius={4}
        accessible={false}
      />
      {/* top-right */}
      <View
        position="absolute"
        top={-t}
        right={-t}
        width={s}
        height={s}
        borderTopWidth={t}
        borderRightWidth={t}
        borderColor={c}
        borderTopRightRadius={4}
        accessible={false}
      />
      {/* bottom-left */}
      <View
        position="absolute"
        bottom={-t}
        left={-t}
        width={s}
        height={s}
        borderBottomWidth={t}
        borderLeftWidth={t}
        borderColor={c}
        borderBottomLeftRadius={4}
        accessible={false}
      />
      {/* bottom-right */}
      <View
        position="absolute"
        bottom={-t}
        right={-t}
        width={s}
        height={s}
        borderBottomWidth={t}
        borderRightWidth={t}
        borderColor={c}
        borderBottomRightRadius={4}
        accessible={false}
      />
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
