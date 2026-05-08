import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Check, Sparkles } from 'lucide-react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useSubscription } from '@/hooks/useSubscription';
import { useAppTheme } from '@/features/settings/useAppTheme';
import { lightTheme, darkTheme } from '@/theme/tokens';

const PREMIUM_FEATURES = [
  { icon: '📦', key: 'settings.subscription.featureUnlimitedContainers' },
  { icon: '🤖', key: 'settings.subscription.featureAIRecipes' },
  { icon: '👨‍👩‍👧‍👦', key: 'settings.subscription.featureHousehold' },
  { icon: '☁️', key: 'settings.subscription.featureExport' },
] as const;

export default function SubscriptionScreen() {
  const { t } = useTranslation();
  const appTheme = useAppTheme();
  const theme = appTheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { isPremium, renewalDate, managementUrl, offering, status, error, purchase, restore } =
    useSubscription();

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const monthlyPkg = offering?.availablePackages.find((p) => p.packageType === 'MONTHLY');
  const annualPkg = offering?.availablePackages.find((p) => p.packageType === 'ANNUAL');

  const activePackage: PurchasesPackage | undefined =
    (selectedPackageId
      ? offering?.availablePackages.find((p) => p.identifier === selectedPackageId)
      : (annualPkg ?? monthlyPkg)) ?? undefined;

  const isPurchasing = status === 'purchasing';
  const isRestoring = status === 'restoring';
  const isLoading = status === 'loading';

  function annualSavingsPct(): number | null {
    if (!monthlyPkg || !annualPkg) return null;
    const monthlyYear = monthlyPkg.product.price * 12;
    const annual = annualPkg.product.price;
    return Math.round(((monthlyYear - annual) / monthlyYear) * 100);
  }

  const savings = annualSavingsPct();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme['surface/base'] }}
      contentContainerStyle={{
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 20,
        paddingTop: 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Current plan */}
      <YStack
        backgroundColor="$surface/raised"
        borderRadius="$lg"
        padding="$5"
        borderWidth={1}
        borderColor="$border/subtle"
        marginBottom="$5"
        gap="$3"
      >
        <Text fontSize="$3" color="$text/secondary" fontWeight="500">
          {t('settings.subscription.currentPlan')}
        </Text>
        <XStack alignItems="center" gap="$3">
          <Text fontSize="$6" fontWeight="700" color="$text/primary">
            {isPremium ? t('settings.subscription.premium') : t('settings.subscription.free')}
          </Text>
          <StatusBadge
            status={isPremium ? 'fresh' : 'soon'}
            label={t('settings.subscription.activeBadge')}
          />
        </XStack>
        {isPremium && renewalDate && (
          <Text fontSize="$3" color="$text/secondary">
            {t('settings.subscription.premiumExpires', {
              date: renewalDate.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }),
            })}
          </Text>
        )}
        {isPremium && managementUrl && (
          <Button
            variant="tinted"
            size="md"
            onPress={() => managementUrl && Linking.openURL(managementUrl)}
          >
            {t('settings.subscription.manage')}
          </Button>
        )}
      </YStack>

      {!isPremium && (
        <>
          {/* Plan picker */}
          {isLoading ? (
            <YStack
              backgroundColor="$surface/raised"
              borderRadius="$lg"
              padding="$6"
              borderWidth={1}
              borderColor="$border/subtle"
              marginBottom="$5"
              alignItems="center"
            >
              <ActivityIndicator color={theme['brand/primary']} />
            </YStack>
          ) : (
            <YStack
              backgroundColor="$surface/raised"
              borderRadius="$lg"
              padding="$5"
              borderWidth={1}
              borderColor="$brand/primaryMuted"
              gap="$4"
              marginBottom="$5"
            >
              <XStack alignItems="center" gap="$2">
                <Sparkles size={18} color={theme['brand/primary']} />
                <Text fontSize="$5" fontWeight="700" color="$brand/primary">
                  {t('settings.subscription.premium')}
                </Text>
              </XStack>

              {/* Features */}
              <YStack gap="$3">
                {PREMIUM_FEATURES.map(({ icon, key }) => (
                  <XStack key={key} alignItems="center" gap="$3">
                    <Text fontSize={20}>{icon}</Text>
                    <Text fontSize="$4" color="$text/primary" flex={1}>
                      {t(key)}
                    </Text>
                    <Check size={16} color={theme['brand/primary']} />
                  </XStack>
                ))}
              </YStack>

              {/* Plan options */}
              {(monthlyPkg || annualPkg) && (
                <YStack gap="$2" marginTop="$1">
                  {[annualPkg, monthlyPkg].filter(Boolean).map((pkg) => {
                    if (!pkg) return null;
                    const isAnnual = pkg.packageType === 'ANNUAL';
                    const isSelected = activePackage?.identifier === pkg.identifier;
                    const selectedBorderColor = theme['brand/primary'];
                    const unselectedBorderColor = theme['border/subtle'];
                    const selectedBgColor = theme['brand/primaryMuted'];
                    const selectedTextColor = theme['brand/primary'];
                    const inactiveColor = theme['text/primary'];
                    return (
                      <Pressable
                        key={pkg.identifier}
                        onPress={() => setSelectedPackageId(pkg.identifier)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                      >
                        <XStack
                          borderWidth={2}
                          borderColor={isSelected ? selectedBorderColor : unselectedBorderColor}
                          borderRadius="$md"
                          padding="$3"
                          backgroundColor={isSelected ? selectedBgColor : '$surface/raised'}
                          alignItems="center"
                          gap="$3"
                        >
                          <YStack flex={1}>
                            <XStack alignItems="center" gap="$2">
                              <Text
                                fontSize="$4"
                                fontWeight="600"
                                color={isSelected ? selectedTextColor : inactiveColor}
                              >
                                {isAnnual
                                  ? t('settings.subscription.annual')
                                  : t('settings.subscription.monthly')}
                              </Text>
                              {isAnnual && savings != null && (
                                <YStack
                                  backgroundColor={theme['brand/primary']}
                                  borderRadius="$xs"
                                  paddingHorizontal="$2"
                                  paddingVertical={2}
                                >
                                  <Text fontSize={10} fontWeight="700" color="white">
                                    {t('settings.subscription.annualSavings', { percent: savings })}
                                  </Text>
                                </YStack>
                              )}
                            </XStack>
                            <Text fontSize="$3" color="$text/secondary">
                              {isAnnual
                                ? t('settings.subscription.perYear', {
                                    price: pkg.product.priceString,
                                  })
                                : t('settings.subscription.perMonth', {
                                    price: pkg.product.priceString,
                                  })}
                            </Text>
                          </YStack>
                          <YStack
                            width={20}
                            height={20}
                            borderRadius={10}
                            borderWidth={2}
                            borderColor={isSelected ? selectedBorderColor : unselectedBorderColor}
                            backgroundColor={isSelected ? selectedBorderColor : 'transparent'}
                            alignItems="center"
                            justifyContent="center"
                          >
                            {isSelected && (
                              <YStack
                                width={8}
                                height={8}
                                borderRadius={4}
                                backgroundColor="white"
                              />
                            )}
                          </YStack>
                        </XStack>
                      </Pressable>
                    );
                  })}
                </YStack>
              )}

              {/* CTA */}
              <Button
                variant="filled"
                size="lg"
                disabled={!activePackage || isPurchasing}
                onPress={() => activePackage && purchase(activePackage)}
              >
                {isPurchasing
                  ? t('settings.subscription.purchasing')
                  : t('settings.subscription.upgrade')}
              </Button>

              {error && (
                <Text fontSize="$3" color="$status/expired" textAlign="center">
                  {error}
                </Text>
              )}

              <Text fontSize={11} color="$text/tertiary" textAlign="center" lineHeight={16}>
                {t('settings.subscription.termsNote')}
              </Text>
            </YStack>
          )}
        </>
      )}

      {/* Restore */}
      <Pressable
        onPress={restore}
        disabled={isRestoring}
        accessibilityRole="button"
        accessibilityLabel={t('settings.subscription.restore')}
      >
        <Text
          fontSize="$3"
          color={isRestoring ? '$text/tertiary' : '$brand/primary'}
          textAlign="center"
          textDecorationLine="underline"
        >
          {isRestoring ? t('settings.subscription.restoring') : t('settings.subscription.restore')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
