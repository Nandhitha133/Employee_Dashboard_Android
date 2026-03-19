// components/CommonHeader.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Update COLORS to match exactly with ExpenditureManagementScreen
const COLORS = {
  primary: '#0A0F2C', // This matches your expenditure screen
  white: '#FFFFFF',
  gray: '#666666',
  textPrimary: '#2C3E50', // Optional: if you need this
};

interface CommonHeaderProps {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  onMenuPress?: () => void;
  onBack?: () => void;
  rightComponent?: React.ReactNode;
  currentTime?: string;
  greeting?: string;
  userName?: string;
}

const CommonHeader: React.FC<CommonHeaderProps> = ({
  title,
  showBack = false,
  showMenu = false,
  onMenuPress,
  onBack,
  rightComponent,
  currentTime,
  greeting,
  userName,
}) => {
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.header}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          {showMenu && (
            <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
              <Icon name="menu" size={28} color={COLORS.white} />
            </TouchableOpacity>
          )}
          
          {showBack && !showMenu && (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
          )}
          
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        
        {rightComponent ? (
          rightComponent
        ) : (
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIcon}>
              <Icon name="notifications" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Time and Greeting Section - Optional */}
      {(currentTime || greeting || userName) && (
        <View style={styles.timeContainer}>
          {currentTime && <Text style={styles.headerTime}>{currentTime}</Text>}
          {greeting && userName && (
            <Text style={styles.headerGreeting}>
              {greeting}, {userName}!
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    // Add elevation for Android shadow
    elevation: 4,
    // Add shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // Allow title to take available space
  },
  menuButton: {
    marginRight: 12,
    padding: 4, // Add padding for better touch target
  },
  backButton: {
    marginRight: 12,
    padding: 4, // Add padding for better touch target
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    flex: 1, // Allow title to wrap if needed
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginLeft: 16,
    padding: 4, // Add padding for better touch target
  },
  timeContainer: {
    marginTop: 8,
  },
  headerTime: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.9,
  },
  headerGreeting: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default CommonHeader;