import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type CameraModalProps = {
  visible: boolean;
  onClose: () => void;
  onPhotoCaptured: (uri: string) => void;
};

export function CameraModal({
  visible,
  onClose,
  onPhotoCaptured,
}: CameraModalProps) {
  const cameraRef = useRef<CameraView>(null);
  const permissionRequestStarted = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    if (!visible) {
      permissionRequestStarted.current = false;
      return;
    }

    if (!permission && !permissionRequestStarted.current) {
      permissionRequestStarted.current = true;
      requestPermission().catch((error: unknown) => {
        setCameraError(
          error instanceof Error ? error.message : "Could not request camera access.",
        );
      });
    }
  }, [permission, requestPermission, visible]);

  const handleRequestPermission = async () => {
    setCameraError("");
    try {
      await requestPermission();
    } catch (error) {
      setCameraError(
        error instanceof Error ? error.message : "Could not request camera access.",
      );
    }
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current || capturing) return;

    setCapturing(true);
    setCameraError("");
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!picture.uri) {
        throw new Error("The camera did not return a photo.");
      }
      onPhotoCaptured(picture.uri);
    } catch (error) {
      setCameraError(
        error instanceof Error ? error.message : "Could not take a photo. Please try again.",
      );
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {permission?.granted ? (
          <View style={styles.cameraStage}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
            />
            <View style={styles.topBar}>
              <Pressable
                style={styles.closeButton}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close camera"
              >
                <Ionicons name="close" size={26} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.title}>Take a photo</Text>
              <View style={styles.closeButtonSpacer} />
            </View>
            {cameraError ? <Text style={styles.cameraError}>{cameraError}</Text> : null}
            <View style={styles.bottomBar}>
              <Pressable
                style={[styles.captureButton, capturing && styles.captureButtonDisabled]}
                onPress={handleTakePicture}
                disabled={capturing}
                accessibilityRole="button"
                accessibilityLabel="Take picture"
              >
                {capturing ? (
                  <ActivityIndicator color="#6C63FF" />
                ) : (
                  <View style={styles.captureButtonInner} />
                )}
              </Pressable>
              <Text style={styles.captureLabel}>Take Picture</Text>
            </View>
          </View>
        ) : (
          <View style={styles.permissionContent}>
            <Pressable
              style={styles.permissionClose}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close camera"
            >
              <Ionicons name="close" size={26} color="#272640" />
            </Pressable>
            <Ionicons name="camera-outline" size={48} color="#6C63FF" />
            <Text style={styles.permissionTitle}>Camera access needed</Text>
            <Text style={styles.permissionMessage}>
              Allow LearnLink to use your camera so you can take a photo to share in chat.
            </Text>
            {cameraError ? <Text style={styles.permissionError}>{cameraError}</Text> : null}
            {!permission ? (
              <ActivityIndicator color="#6C63FF" />
            ) : permission.canAskAgain ? (
              <Pressable style={styles.permissionButton} onPress={handleRequestPermission}>
                <Text style={styles.permissionButtonText}>Allow Camera</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.permissionButton}
                onPress={() =>
                  Linking.openSettings().catch((error: unknown) => {
                    setCameraError(
                      error instanceof Error
                        ? error.message
                        : "Could not open device settings.",
                    );
                  })
                }
              >
                <Text style={styles.permissionButtonText}>Open Settings</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  cameraStage: { flex: 1, justifyContent: "space-between" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  closeButtonSpacer: { width: 42, height: 42 },
  title: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  cameraError: {
    alignSelf: "center",
    marginHorizontal: 24,
    padding: 10,
    borderRadius: 10,
    color: "#FFFFFF",
    backgroundColor: "rgba(180, 35, 24, 0.9)",
    textAlign: "center",
  },
  bottomBar: {
    alignItems: "center",
    paddingBottom: 42,
    gap: 10,
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonDisabled: { opacity: 0.7 },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
  },
  captureLabel: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  permissionContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 14,
    backgroundColor: "#FFFFFF",
  },
  permissionClose: {
    position: "absolute",
    top: 54,
    right: 20,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTitle: {
    marginTop: 6,
    color: "#272640",
    fontSize: 21,
    fontWeight: "800",
  },
  permissionMessage: {
    maxWidth: 320,
    color: "#626176",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  permissionError: { color: "#B42318", textAlign: "center" },
  permissionButton: {
    minHeight: 48,
    marginTop: 6,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6C63FF",
  },
  permissionButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
