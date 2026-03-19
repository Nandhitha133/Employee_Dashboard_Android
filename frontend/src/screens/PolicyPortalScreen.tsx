// screens/PolicyPortalScreen.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet,  StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';
import { SafeAreaView } from 'react-native-safe-area-context';
const COLORS = {
  primary: '#0A0F2C',
  white: '#FFFFFF',
  gray: '#666666',
  border: '#E8ECF0',
  background: '#F5F7FA',
};

const PolicyPortalScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <CommonHeader title="Policy Portal" showBack={true} />
      <ScrollView style={styles.content}>
        <View style={styles.emptyContainer}>
          <Icon name="file-present" size={64} color={COLORS.gray} />
          <Text style={styles.emptyText}>Policy portal content coming soon</Text>
        </View>
      </ScrollView>

      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Policy • Portal • Documents • "
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray,
  },
});

export default PolicyPortalScreen;
