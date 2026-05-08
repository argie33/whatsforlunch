import React, { useState, useCallback, useEffect } from 'react';
import { ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { haptics } from '@/lib/haptics';
import { Printer, Share2, ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import { useDatabase } from '@/db';
import { useAuthIds } from '@/features/auth';
import { ContainerRepository } from '@/db/repositories/ContainerRepository';
import type { Container } from '@/db/models/Container';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';

const C = lightTheme;

type PageSize = 'letter' | 'a4';

const PAGE_SIZES = [
  { key: 'letter' as const, label: 'Letter', subtitle: '8.5 × 11 in' },
  { key: 'a4' as const, label: 'A4', subtitle: '210 × 297 mm' },
];

const APP_DEEP_LINK_BASE = 'https://whatsfresh.app/c/';

export default function StickersScreen() {
  const { t } = useTranslation();
  const db = useDatabase();
  const { householdId } = useAuthIds();
  const [pageSize, setPageSize] = useState<PageSize>('letter');
  const [tokens, setTokens] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  const loadContainers = useCallback(() => {
    if (!householdId) return;
    setLoading(true);
    const repo = new ContainerRepository(db);
    const sub = repo.observeByHousehold(householdId).subscribe({
      next: (containers: Container[]) => {
        const containerTokens = containers.map((c) => c.qrToken);
        setTokens(containerTokens);
        setLoading(false);
      },
      error: (err) => {
        console.error('[stickers] load failed:', err);
        Alert.alert(t('common.error'), 'Failed to load containers');
        setTokens([]);
        setLoading(false);
      },
    });
    return () => sub.unsubscribe();
  }, [db, householdId, t]);

  useEffect(() => {
    const unsub = loadContainers();
    return () => unsub?.();
  }, [loadContainers]);

  const handlePageSizeChange = useCallback(async (size: PageSize) => {
    await haptics.selection();
    setPageSize(size);
  }, []);

  if (loading) {
    return (
      <YStack flex={1} backgroundColor="$surface/base" justifyContent="center" alignItems="center">
        <ActivityIndicator color={C['brand/primary']} size="large" />
      </YStack>
    );
  }

  if (tokens.length === 0) {
    return (
      <YStack
        flex={1}
        backgroundColor="$surface/base"
        justifyContent="center"
        alignItems="center"
        gap="$4"
        padding="$6"
      >
        <Text fontSize={48}>📦</Text>
        <Text fontSize="$5" fontWeight="700" color="$text/primary" textAlign="center">
          {t('empty.containers.title')}
        </Text>
        <Text fontSize="$3" color="$text/secondary" textAlign="center">
          {t('stickers.noContainers')}
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text color="$brand/primary" fontWeight="600">
            {t('common.back')}
          </Text>
        </Pressable>
      </YStack>
    );
  }

  const buildStickerHtml = useCallback((): string => {
    const isLetter = pageSize === 'letter';
    const pageW = isLetter ? '8.5in' : '210mm';
    const pageH = isLetter ? '11in' : '297mm';
    const cols = 4;

    const qrSvgs = tokens.map((token) => {
      const url = `${APP_DEEP_LINK_BASE}${token}`;
      return `<div class="sticker">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}" width="120" height="120" />
        <div class="token">${token}</div>
      </div>`;
    });

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page { size: ${pageW} ${pageH}; margin: 0.5in; }
  body { margin: 0; font-family: -apple-system, sans-serif; }
  .grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 12pt; }
  .sticker {
    display: flex; flex-direction: column; align-items: center;
    border: 1px dashed #ccc; border-radius: 8pt;
    padding: 8pt; gap: 4pt;
  }
  .token { font-size: 8pt; color: #888; letter-spacing: 1px; font-family: monospace; }
</style>
</head>
<body>
  <div class="grid">${qrSvgs.join('')}</div>
</body>
</html>`;
  }, [pageSize, tokens]);

  const handleExport = useCallback(async () => {
    await haptics.medium();
    setExporting(true);
    try {
      const html = buildStickerHtml();
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('stickers.sharePdfDialogTitle'),
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (err) {
      console.error('[stickers] export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [buildStickerHtml]);

  const handlePrint = useCallback(async () => {
    await haptics.medium();
    setExporting(true);
    try {
      const html = buildStickerHtml();
      await Print.printAsync({ html });
    } catch (err) {
      console.error('[stickers] print failed:', err);
    } finally {
      setExporting(false);
    }
  }, [buildStickerHtml]);

  return (
    <YStack flex={1} backgroundColor="$surface/base">
      {/* Header */}
      <XStack
        paddingTop={insets.top + 8}
        paddingHorizontal="$4"
        paddingBottom="$3"
        backgroundColor="$surface/raised"
        borderBottomWidth={1}
        borderBottomColor="$border/subtle"
        alignItems="center"
        gap="$3"
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <ChevronLeft size={24} color={C['brand/primary']} aria-hidden />
        </Pressable>
        <Text
          flex={1}
          fontSize={18}
          fontWeight="600"
          fontFamily="Fraunces"
          letterSpacing={-0.3}
          color="$text/primary"
        >
          {t('stickers.screenTitle')}
        </Text>
      </XStack>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Page size selector */}
        <YStack gap="$2" marginBottom="$5">
          <Text
            fontSize={13}
            fontWeight="600"
            color="$text/secondary"
            textTransform="uppercase"
            letterSpacing={0.5}
          >
            {t('stickers.pageSizeLabel')}
          </Text>
          <XStack gap="$3" accessibilityRole="radiogroup">
            {PAGE_SIZES.map(({ key, label, subtitle }) => {
              const active = pageSize === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => handlePageSizeChange(key)}
                  style={{ flex: 1 }}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ checked: active }}
                >
                  <YStack
                    flex={1}
                    borderWidth={active ? 2 : 1}
                    borderColor={active ? '$brand/primary' : '$border/subtle'}
                    borderRadius={32}
                    padding="$3"
                    backgroundColor={active ? '$brand/primaryMuted' : '$surface/raised'}
                    alignItems="center"
                    gap="$1"
                  >
                    <Text
                      fontWeight="600"
                      color={active ? '$brand/primary' : '$text/primary'}
                      fontSize={15}
                    >
                      {label}
                    </Text>
                    <Text fontSize={12} color="$text/tertiary">
                      {subtitle}
                    </Text>
                  </YStack>
                </Pressable>
              );
            })}
          </XStack>
        </YStack>

        {/* Sticker preview grid */}
        <YStack gap="$2" marginBottom="$6">
          <XStack justifyContent="space-between" alignItems="center">
            <Text
              fontSize={13}
              fontWeight="600"
              color="$text/secondary"
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              {t('stickers.sheetPreview')}
            </Text>
            <Text fontSize={12} color="$text/tertiary">
              {t('stickers.stickersPerSheet', { count: tokens.length })}
            </Text>
          </XStack>

          <View
            backgroundColor="$surface/raised"
            borderRadius={32}
            borderWidth={1}
            borderColor="$border/subtle"
            padding="$3"
          >
            <XStack flexWrap="wrap" gap="$2">
              {tokens.map((token, i) => (
                <StickerPreview key={token} token={token} index={i} />
              ))}
            </XStack>
          </View>
        </YStack>
      </ScrollView>

      {/* Action bar */}
      <XStack
        paddingHorizontal="$4"
        paddingBottom={insets.bottom + 12}
        paddingTop="$3"
        backgroundColor="$surface/raised"
        borderTopWidth={1}
        borderTopColor="$border/subtle"
        gap="$3"
      >
        <Pressable
          onPress={handlePrint}
          style={{ flex: 1 }}
          disabled={exporting}
          accessibilityRole="button"
          accessibilityLabel={t('stickers.printButton')}
          accessibilityState={{ disabled: exporting }}
        >
          <XStack
            height={48}
            borderRadius={32}
            borderWidth={1}
            borderColor="$brand/primary"
            alignItems="center"
            justifyContent="center"
            gap="$2"
            opacity={exporting ? 0.5 : 1}
          >
            <Printer size={18} color={C['brand/primary']} />
            <Text fontWeight="600" color="$brand/primary" fontSize={15}>
              {t('stickers.printButton')}
            </Text>
          </XStack>
        </Pressable>

        <Pressable
          onPress={handleExport}
          style={{ flex: 1 }}
          disabled={exporting}
          accessibilityRole="button"
          accessibilityLabel={t('stickers.exportPdf')}
          accessibilityState={{ disabled: exporting }}
        >
          <XStack
            height={48}
            borderRadius={32}
            backgroundColor="$brand/primary"
            alignItems="center"
            justifyContent="center"
            gap="$2"
            opacity={exporting ? 0.5 : 1}
          >
            {exporting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Share2 size={18} color="white" />
                <Text fontWeight="600" color="white" fontSize={15}>
                  {t('stickers.exportPdf')}
                </Text>
              </>
            )}
          </XStack>
        </Pressable>
      </XStack>
    </YStack>
  );
}

function StickerPreview({ token, index }: { token: string; index: number }) {
  const url = `${APP_DEEP_LINK_BASE}${token}`;
  const size = 64;

  return (
    <YStack
      width={(size + 12) as any}
      alignItems="center"
      padding="$1"
      borderWidth={1}
      borderColor="$border/subtle"
      borderRadius={6}
      gap="$1"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <QRCode value={url} size={size} />
      <Text fontSize={7} color="$text/tertiary" fontFamily="monospace" numberOfLines={1}>
        {token}
      </Text>
    </YStack>
  );
}
