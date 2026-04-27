import React, { useState, useCallback } from 'react';
import { ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { Printer, Share2, ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

type PageSize = 'letter' | 'a4';

const PAGE_SIZES = [
  { key: 'letter' as const, label: 'Letter', subtitle: '8.5 × 11 in' },
  { key: 'a4' as const, label: 'A4', subtitle: '210 × 297 mm' },
];

const QR_COUNT = 24;
const APP_DEEP_LINK_BASE = 'https://app.whatsforlunch.app/c/';

function generateToken(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function generateTokens(): string[] {
  return Array.from({ length: QR_COUNT }, generateToken);
}

export default function StickersScreen() {
  const { t } = useTranslation();
  const [pageSize, setPageSize] = useState<PageSize>('letter');
  const [tokens] = useState<string[]>(generateTokens);
  const [exporting, setExporting] = useState(false);
  const insets = useSafeAreaInsets();

  const handlePageSizeChange = useCallback(async (size: PageSize) => {
    await Haptics.selectionAsync();
    setPageSize(size);
  }, []);

  const buildStickerHtml = useCallback((): string => {
    const isLetter = pageSize === 'letter';
    const pageW = isLetter ? '8.5in' : '210mm';
    const pageH = isLetter ? '11in' : '297mm';
    const cols = 4;
    const rows = 6;

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
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExporting(true);
    try {
      const html = buildStickerHtml();
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share QR Stickers PDF',
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
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={24} color="#2F7D5B" />
        </Pressable>
        <Text flex={1} fontSize={17} fontWeight="600" color="$text/primary">
          {t('stickers.screenTitle')}
        </Text>
      </XStack>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Page size selector */}
        <YStack gap="$2" marginBottom="$5">
          <Text fontSize={13} fontWeight="600" color="$text/secondary" textTransform="uppercase" letterSpacing={0.5}>
            Page Size
          </Text>
          <XStack gap="$3">
            {PAGE_SIZES.map(({ key, label, subtitle }) => {
              const active = pageSize === key;
              return (
                <Pressable key={key} onPress={() => handlePageSizeChange(key)} style={{ flex: 1 }}>
                  <YStack
                    flex={1}
                    borderWidth={active ? 2 : 1}
                    borderColor={active ? '$brand/primary' : '$border/subtle'}
                    borderRadius="$md"
                    padding="$3"
                    backgroundColor={active ? '$brand/primaryMuted' : '$surface/raised'}
                    alignItems="center"
                    gap="$1"
                  >
                    <Text fontWeight="600" color={active ? '$brand/primary' : '$text/primary'} fontSize={15}>
                      {label}
                    </Text>
                    <Text fontSize={12} color="$text/tertiary">{subtitle}</Text>
                  </YStack>
                </Pressable>
              );
            })}
          </XStack>
        </YStack>

        {/* Sticker preview grid */}
        <YStack gap="$2" marginBottom="$6">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={13} fontWeight="600" color="$text/secondary" textTransform="uppercase" letterSpacing={0.5}>
              {t('stickers.sheetPreview')}
            </Text>
            <Text fontSize={12} color="$text/tertiary">
              {t('stickers.stickersPerSheet', { count: QR_COUNT })}
            </Text>
          </XStack>

          <View
            backgroundColor="$surface/raised"
            borderRadius="$lg"
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
        <Pressable onPress={handlePrint} style={{ flex: 1 }} disabled={exporting}>
          <XStack
            height={48}
            borderRadius="$md"
            borderWidth={1}
            borderColor="$brand/primary"
            alignItems="center"
            justifyContent="center"
            gap="$2"
            opacity={exporting ? 0.5 : 1}
          >
            <Printer size={18} color="#2F7D5B" />
            <Text fontWeight="600" color="$brand/primary" fontSize={15}>Print</Text>
          </XStack>
        </Pressable>

        <Pressable onPress={handleExport} style={{ flex: 1 }} disabled={exporting}>
          <XStack
            height={48}
            borderRadius="$md"
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
                <Text fontWeight="600" color="white" fontSize={15}>Export PDF</Text>
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
    >
      <QRCode value={url} size={size} />
      <Text fontSize={7} color="$text/tertiary" fontFamily="monospace" numberOfLines={1}>
        {token}
      </Text>
    </YStack>
  );
}
