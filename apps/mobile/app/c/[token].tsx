import React, { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { YStack, Text } from 'tamagui';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { haptics } from '@/lib/haptics';

import { useDatabase } from '@/db';
import { containersService } from '@/services/ContainersService';
import { useAuthIds } from '@/features/auth';

export default function ContainerUniversalLinkScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { t } = useTranslation();
  const db = useDatabase();
  const { householdId } = useAuthIds();

  useEffect(() => {
    if (!token) {
      router.replace('/(main)/containers');
      return;
    }

    const handle = async () => {
      try {
        const existing = await containersService.getContainerByQrToken(db, token);
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
                router.replace('/(main)/containers');
                return;
              }
              await claimToken(nickname);
            },
            'plain-text',
          );
        } else {
          Alert.alert(t('containers.claimContainer'), t('containers.claimBody'), [
            {
              text: t('common.cancel'),
              onPress: () => router.replace('/(main)/containers'),
            },
            {
              text: t('common.confirm'),
              onPress: () => claimToken(),
            },
          ]);
        }
      } catch {
        router.replace('/(main)/containers');
      }
    };

    const claimToken = async (nickname?: string) => {
      if (!householdId) {
        Alert.alert(t('common.error'));
        return;
      }
      try {
        const container = await containersService.claimContainer(db, {
          householdId: householdId as string,
          qrToken: token,
          nickname: nickname || undefined,
        });
        await haptics.success();
        router.replace({ pathname: '/(main)/containers/[id]', params: { id: container.id } });
      } catch (error) {
        await haptics.heavy();
        Alert.alert(t('common.error'));
        router.replace('/(main)/containers');
      }
    };

    handle();
  }, [token, db, t, householdId]);

  return (
    <YStack
      flex={1}
      backgroundColor="$surface/base"
      justifyContent="center"
      alignItems="center"
      gap="$4"
    >
      <ActivityIndicator size="large" color="#2F7D5B" />
      <Text fontSize={15} color="$text/secondary">
        {t('scan.containerFound')}
      </Text>
    </YStack>
  );
}
