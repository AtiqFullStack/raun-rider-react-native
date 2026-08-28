import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import React from 'react';

export default function KeyboardWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} // 🔥 change here
      keyboardVerticalOffset={Platform.OS === 'android' ? 20 : 0} // 🔥 offset fix
      style={styles.container}
    >
      <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
        <View style={styles.inner}>{children}</View>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'space-around',
  },
});