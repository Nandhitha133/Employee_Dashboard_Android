// screens/Performance/IncrementSummaryScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';

const IncrementSummaryScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <CommonHeader title="Increment Summary" showBack={true} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Increment Overview</Text>
          <Text style={styles.description}>
            View summary of salary increments and performance-based rewards.
          </Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Increment summary data will be displayed here.</Text>
          </View>
        </View>
      </ScrollView>
      <CommonFooter companyName="CALDIM ENGINEERING PVT LTD" marqueeText="Performance Management • Increment Summary • " />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  placeholder: {
    height: 200,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  placeholderText: {
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default IncrementSummaryScreen;
