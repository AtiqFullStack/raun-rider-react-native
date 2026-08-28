import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

export const toastConfig = {
  success: ({ text1 }: any) => (
    <View style={styles.successContainer}>
      <Text style={styles.text}>{text1}</Text>
    </View>
  ),

  error: ({ text1 }: any) => (
    <View style={styles.errorContainer}>
      <Text style={styles.text}>{text1}</Text>
    </View>
  ),
  

  info: ({ text1 }: any) => (
    <View style={styles.infoContainer}>
      <Text style={styles.text}>{text1}</Text>
    </View>
  ),
 
};

const styles = StyleSheet.create({
  successContainer: {
    width: '95%',
    backgroundColor: Colors.success, // ✅ green
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 10,
    elevation: 5,
  },

  errorContainer: {
    width: '95%',
    backgroundColor: Colors.error, // ❌ red
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 10,
    elevation: 5,
  },
  infoContainer: {
    width: '80%',
    backgroundColor: Colors.info, 
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 50,
    alignSelf: 'center',
    marginTop: 10,
    elevation: 5,
  },

  text: {
    color: '#FFFFFF', // 🤍 white text
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
