import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SafeWrapper from '../components/SafeWrapper';

const PaymentsScreen = () => {
  return (
    <SafeWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Payments</Text>
      </View>
    </SafeWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default PaymentsScreen;
