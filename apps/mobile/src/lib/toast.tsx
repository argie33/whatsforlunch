import React, { createContext, useContext, useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast } from '@/components/ui/Toast';
import type { ToastType } from '@/components/ui/Toast';

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

interface ActiveToast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const insets = useSafeAreaInsets();

  const showToast = useCallback((message: string, options: ToastOptions = {}) => {
    setToast({
      id: Date.now(),
      message,
      type: options.type ?? 'success',
      duration: options.duration ?? 3000,
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <View
          style={[styles.overlay, { top: insets.top + 12 }]}
          pointerEvents="none"
        >
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => setToast(null)}
          />
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});
