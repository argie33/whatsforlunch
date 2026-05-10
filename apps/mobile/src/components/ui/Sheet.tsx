import React from 'react';
import BottomSheet, { useBottomSheetInternal } from '@gorhom/bottom-sheet';
import { YStack } from 'tamagui';
import { BlurView } from 'expo-blur';
import { haptics } from '@/lib/haptics';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: (number | string)[];
  title?: string;
}

export function Sheet({
  isOpen,
  onClose,
  children,
  snapPoints = ['25%', '50%', '90%'],
  title,
}: SheetProps) {
  const handleSheetChange = React.useCallback(
    async (index: number) => {
      if (index === -1) {
        await haptics.selection();
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) return null;

  return (
    <BottomSheet
      snapPoints={snapPoints}
      onClose={onClose}
      onChange={handleSheetChange}
      enablePanDownToClose
      backgroundComponent={() => <BlurView intensity={80} style={{ flex: 1 }} />}
      accessibilityLabel={title}
    >
      <YStack
        flex={1}
        backgroundColor="$surface/raised"
        borderTopLeftRadius="$xl"
        borderTopRightRadius="$xl"
        padding="$5"
        accessibilityViewIsModal
      >
        {children}
      </YStack>
    </BottomSheet>
  );
}
