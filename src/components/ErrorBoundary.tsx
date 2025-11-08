import React from "react";
import { Button, Text, View } from "react-native";
import * as Sentry from "@sentry/react-native";

type ErrorBoundaryState = {
  hasError: boolean;
  message?: string;
};

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn("ErrorBoundary caught an error", error, info);
    Sentry.captureException(error, {
      extra: {
        componentStack: info.componentStack
      }
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>Etwas ist schiefgelaufen.</Text>
          <Text style={{ textAlign: "center", marginBottom: 16 }}>{this.state.message ?? "Unbekannter Fehler"}</Text>
          <Button title="Neu laden" onPress={this.handleReset} />
        </View>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
