// components/CommonFooter.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#0A0F2C',
  secondary: '#1A237E',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#666666',
  lightGray: '#E5E7EB',
  background: '#F5F7FA',
};

interface CommonFooterProps {
  companyName?: string;
  year?: number;
  showMarquee?: boolean;
  marqueeText?: string;
}

const CommonFooter: React.FC<CommonFooterProps> = ({
  companyName = 'CALDIM ENGINEERING PVT LTD',
  year = new Date().getFullYear(),
  showMarquee = true,
  marqueeText = 'Empowering Excellence • Building Future • Innovating Together • ',
}) => {
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const textWidth = marqueeText.length * 8; // Approximate width of text

  useEffect(() => {
    if (showMarquee) {
      const startAnimation = () => {
        Animated.loop(
          Animated.timing(scrollAnim, {
            toValue: -textWidth, // Scroll by exactly one text width
            duration: 15000, // Adjust speed as needed
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ).start();
      };
      
      startAnimation();
      
      return () => {
        scrollAnim.stopAnimation();
      };
    }
  }, [showMarquee, scrollAnim, textWidth]);

  const footerText = `${companyName} © ${year}`;

  return (
    <View style={styles.container}>
      {/* Marquee Section */}
      {showMarquee && (
        <View style={styles.marqueeContainer}>
          <Animated.View
            style={[
              styles.marqueeContent,
              {
                transform: [{ translateX: scrollAnim }],
                width: textWidth * 2, // Double width to contain both original and duplicate
              },
            ]}
          >
            <Text style={styles.marqueeText}>
              {marqueeText}
            </Text>
            <Text style={styles.marqueeText}>
              {marqueeText}
            </Text>
          </Animated.View>
        </View>
      )}

      {/* Footer Bottom Bar */}
      <View style={styles.footerBar}>
        <View style={styles.footerContent}>
          <View style={styles.footerLeft}>
            <Icon name="copyright" size={14} color={COLORS.gray} />
            <Text style={styles.footerText}>{footerText}</Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  marqueeContainer: {
    height: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: COLORS.secondary,
  },
  marqueeContent: {
    flexDirection: 'row',
    position: 'absolute',
    left: 0,
  },
  marqueeText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
    includeFontPadding: false,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
  },
  footerBar: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '400',
  },
  versionText: {
    fontSize: 10,
    color: COLORS.lightGray,
    fontWeight: '400',
  },
});

export default CommonFooter;