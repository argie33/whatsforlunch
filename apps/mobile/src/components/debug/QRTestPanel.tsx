import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Button, Card, Stack as TStack, XStack } from 'tamagui';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { QRTestSimulator, QR_TEST_CODES, BARCODE_TEST_CODES } from '@/lib/qr-test-simulator';

interface QRTestPanelProps {
  onQrDetected: (token: string) => Promise<void>;
  onBarcodeDetected: (barcode: string) => Promise<void>;
}

export function QRTestPanel({ onQrDetected, onBarcodeDetected }: QRTestPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTestQr = async (token: string, name: string) => {
    try {
      setLoading(true);
      console.log('[QR Test] Triggering mock QR scan:', name);
      await QRTestSimulator.simulateQrScan(token, onQrDetected);
    } catch (err) {
      Alert.alert('QR Scan Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestBarcode = async (barcode: string, name: string) => {
    try {
      setLoading(true);
      console.log('[QR Test] Triggering mock barcode scan:', name);
      await QRTestSimulator.simulateBarcodeScan(barcode, onBarcodeDetected);
    } catch (err) {
      Alert.alert('Barcode Scan Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!expanded) {
    return (
      <Card
        position="absolute"
        bottom="$4"
        right="$4"
        padding="$3"
        backgroundColor="$blue9"
        borderRadius="$6"
        zIndex={100}
        onPress={() => setExpanded(true)}
        pressStyle={{ opacity: 0.7 }}
      >
        <XStack alignItems="center" gap="$2">
          <Text color="white" fontSize="$2" fontWeight="600">
            TEST
          </Text>
          <ChevronUp size={16} color="white" />
        </XStack>
      </Card>
    );
  }

  return (
    <Card
      position="absolute"
      bottom="$4"
      right="$4"
      left="$4"
      maxHeight="$24"
      backgroundColor="$blue1"
      borderRadius="$3"
      zIndex={100}
      borderWidth={1}
      borderColor="$blue8"
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TStack padding="$3" gap="$3">
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$3" fontWeight="bold">
              QR/Barcode Test
            </Text>
            <Button size="$2" circular onPress={() => setExpanded(false)} chromeless>
              <ChevronDown size={16} />
            </Button>
          </XStack>

          {/* QR Codes */}
          <TStack gap="$2">
            <Text fontSize="$2" fontWeight="600" color="$blue11">
              Test QR Codes
            </Text>
            {Object.entries(QR_TEST_CODES).map(([key, code]) => (
              <Button
                key={key}
                size="$2"
                onPress={() => handleTestQr(code.token, code.name)}
                disabled={loading}
                backgroundColor="$green2"
              >
                <Text fontSize="$2">{code.name}</Text>
              </Button>
            ))}
          </TStack>

          {/* Barcodes */}
          <TStack gap="$2">
            <Text fontSize="$2" fontWeight="600" color="$blue11">
              Test Barcodes
            </Text>
            {Object.entries(BARCODE_TEST_CODES).map(([key, code]) => (
              <Button
                key={key}
                size="$2"
                onPress={() => handleTestBarcode(code.barcode, code.product)}
                disabled={loading}
                backgroundColor="$orange2"
              >
                <Text fontSize="$2">{code.product}</Text>
              </Button>
            ))}
          </TStack>
        </TStack>
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 0,
  },
});
