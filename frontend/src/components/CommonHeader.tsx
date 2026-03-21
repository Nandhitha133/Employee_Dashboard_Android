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
import { useSidebar } from '../context/SidebarContext';

const COLORS = {
  primary: '#0A0F2C',
  secondary: '#1A237E',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#E5E7EB',
};

interface CommonHeaderProps {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  onMenuPress?: () => void;
  onBack?: () => void;
  rightComponent?: React.ReactNode;
  showNotification?: boolean;
  currentTime?: string;
  greeting?: string;
  userName?: string;
}

const CommonHeader: React.FC<CommonHeaderProps> = ({
  title,
  showBack = false,
  showMenu = true, // Default to true as per user request
  onMenuPress,
  onBack,
  rightComponent,
  showNotification = true,
  currentTime,
  greeting,
  userName,
}) => {
  const navigation = useNavigation();
  const { toggleSidebar } = useSidebar();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
    } else {
      toggleSidebar();
    }
  };

  return (
    <View style={styles.header}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          {showMenu && (
            <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
              <Icon name="menu" size={28} color={COLORS.white} />
            </TouchableOpacity>
          )}
          
          {showBack && (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
          )}
          
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        
        <View style={styles.headerRight}>
          {rightComponent}
          {showNotification && (
            <TouchableOpacity 
              onPress={() => (navigation as any).navigate('Notifications')}
              style={styles.headerIcon}
            >
              <Icon name="notifications" size={24} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </View>
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