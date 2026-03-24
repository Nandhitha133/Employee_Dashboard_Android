// src/components/GlobalSidebar.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconCommunity from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSidebar } from '../context/SidebarContext';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#0A0F2C',
  secondary: '#1A237E',
  white: '#FFFFFF',
  gray: '#666666',
  lightGray: '#CCCCCC',
};

const GlobalSidebar = () => {
  const navigation = useNavigation();
  const { 
    isSidebarOpen, 
    toggleSidebar, 
    slideAnim, 
    sidebarModules, 
    userRole, 
    userPermissions,
    closeSidebar 
  } = useSidebar();
  const [expandedDropdowns, setExpandedDropdowns] = useState<Record<string, boolean>>({});

  const toggleDropdown = (folderName: string) => {
    setExpandedDropdowns(prev => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  const handleModulePress = (module: any) => {
    toggleSidebar();
    if (module.screen === 'Dashboard') {
      (navigation as any).navigate('Dashboard');
    } else if (module.hasDropdown && module.children && module.children.length > 0) {
      const firstChild = module.children[0];
      (navigation as any).navigate(firstChild.screen);
    } else {
      (navigation as any).navigate(module.screen);
    }
  };

  const handleLogout = () => {
    toggleSidebar();
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => (navigation as any).replace('Login') }
    ]);
  };

  if (!isSidebarOpen) return null;

  return (
    <Modal
      transparent={true}
      visible={isSidebarOpen}
      animationType="none"
      onRequestClose={toggleSidebar}
    >
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={toggleSidebar} 
        style={styles.overlay}
      >
        <Animated.View 
          style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.sidebarHeader}>
            <Image
              source={require('../assets/images/steel-logo.png')}
              style={styles.sidebarLogo}
              resizeMode="contain"
            />
            <TouchableOpacity onPress={toggleSidebar} style={styles.sidebarCloseButton}>
              <Text style={{ fontSize: 20, color: COLORS.white }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
            {sidebarModules.map((module, index) => {
              if (module.hasDropdown) {
                if (!module.children || module.children.length === 0) return null;
                
                return (
                  <View key={module.name}>
                    <TouchableOpacity
                      onPress={() => toggleDropdown(module.name)}
                      style={styles.sidebarMenuItem}
                    >
                      <View style={styles.sidebarMenuIcon}>
                        {module.iconFamily === 'MaterialCommunityIcons' ? (
                          <IconCommunity name={module.icon} size={20} color={COLORS.white} />
                        ) : (
                          <Icon name={module.icon} size={20} color={COLORS.white} />
                        )}
                      </View>
                      <Text style={styles.sidebarMenuText}>{module.name}</Text>
                      <Icon 
                        name={expandedDropdowns[module.name] ? "expand-less" : "expand-more"} 
                        size={20} 
                        color={COLORS.white} 
                      />
                    </TouchableOpacity>
                    {expandedDropdowns[module.name] && module.children.map((child, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => handleModulePress(child)}
                        style={styles.sidebarSubMenuItem}
                      >
                        <View style={styles.sidebarSubMenuIcon}>
                          {child.iconFamily === 'MaterialCommunityIcons' ? (
                            <IconCommunity name={child.icon} size={18} color="rgba(255,255,255,0.7)" />
                          ) : (
                            <Icon name={child.icon} size={18} color="rgba(255,255,255,0.7)" />
                          )}
                        </View>
                        <Text style={styles.sidebarSubMenuText}>{child.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              } else {
                return (
                  <TouchableOpacity
                    key={module.name}
                    onPress={() => handleModulePress(module)}
                    style={styles.sidebarMenuItem}
                  >
                    <View style={styles.sidebarMenuIcon}>
                      {module.iconFamily === 'MaterialCommunityIcons' ? (
                        <IconCommunity name={module.icon} size={20} color={COLORS.white} />
                      ) : (
                        <Icon name={module.icon} size={20} color={COLORS.white} />
                      )}
                    </View>
                    <Text style={styles.sidebarMenuText}>{module.name}</Text>
                  </TouchableOpacity>
                );
              }
            })}
            
            <TouchableOpacity
              onPress={handleLogout}
              style={[styles.sidebarMenuItem, styles.logoutItem]}
            >
              <View style={styles.sidebarMenuIcon}>
                <Icon name="logout" size={20} color="#FF4444" />
              </View>
              <Text style={[styles.sidebarMenuText, { color: '#FF4444' }]}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebar: {
    width: width * 0.55,
    height: '100%',
    backgroundColor: COLORS.primary,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  sidebarHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingTop: 50,
  },
  sidebarLogo: {
    width: 120,
    height: 100,
  },
  sidebarCloseButton: {
    padding: 5,
  },
  sidebarContent: {
    flex: 1,
    paddingTop: 10,
  },
  sidebarMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  sidebarMenuIcon: {
    width: 30,
    marginRight: 15,
    alignItems: 'center',
  },
  sidebarMenuText: {
    flex: 1,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  sidebarSubMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingLeft: 65,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sidebarSubMenuIcon: {
    width: 24,
    marginRight: 12,
    alignItems: 'center',
  },
  sidebarSubMenuText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    flex: 1,
  },
  logoutItem: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginBottom: 30,
  },
});

export default GlobalSidebar;




