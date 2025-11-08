import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Animated, StyleSheet, Text } from "react-native";

type ToastType = "info" | "success" | "error";

type ToastState = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TYPE_COLORS: Record<ToastType, string> = {
  info: "#2563eb",
  success: "#059669",
  error: "#dc2626",
};

const ToastProvider = ({ children }: React.PropsWithChildren): JSX.Element => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useMemo(() => new Animated.Value(0), []);
  const translateY = useMemo(() => new Animated.Value(-20), []);

  useEffect(() => {
    if (!toast) {
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setToast(null));
    }, 2800);

    return () => clearTimeout(timeout);
  }, [toast, opacity, translateY]);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", _durationMs = 3000) => {
      const id = Date.now();
      setToast({ id, message, type });
      // duration handled by effect; parameter reserved for future extension
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              backgroundColor: TYPE_COLORS[toast.type],
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  toastText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

export default ToastProvider;
