// src/components/Performance/WorkflowTracker.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface Props {
  currentStageId: string;
  userFlow: Step[];  // Changed from 'stages' to 'userFlow'
}

const COLORS = {
  primary: '#262760',
  primaryLight: '#4f4b8c',
  success: '#10B981',
  gray: '#6B7280',
  lightGray: '#9CA3AF',
  lighterGray: '#E5E7EB',
  white: '#FFFFFF',
};

const WorkflowTracker: React.FC<Props> = ({ currentStageId, userFlow }) => {
  if (!userFlow || userFlow.length === 0) return null;

  const currentIndex = userFlow.findIndex(step => step.id === currentStageId);
  
  return (
    <View style={styles.container}>
      {/* Progress Bar Background */}
      <View style={styles.progressBarBackground} />
      
      {/* Progress Bar Fill */}
      <View 
        style={[
          styles.progressBarFill,
          { width: `${(currentIndex / (userFlow.length - 1)) * 100}%` }
        ]}
      />

      {userFlow.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isUpcoming = index > currentIndex;

        return (
          <View key={step.id} style={styles.stageContainer}>
            <View style={[
              styles.indicator,
              isCompleted && styles.completedIndicator,
              isCurrent && styles.currentIndicator,
              isUpcoming && styles.upcomingIndicator,
            ]}>
              {isCompleted ? (
                <Icon name="check" size={16} color={COLORS.white} />
              ) : isCurrent ? (
                <Icon name="access-time" size={16} color={COLORS.primary} />
              ) : (
                <Icon name="radio-button-unchecked" size={16} color={COLORS.lightGray} />
              )}
            </View>
            
            <View style={styles.labelContainer}>
              <Text style={[
                styles.stageLabel,
                (isCompleted || isCurrent) && styles.activeStageLabel,
                isUpcoming && styles.upcomingStageLabel,
              ]}>
                {step.label}
              </Text>
              {step.description && (
                <Text style={styles.stageDescription} numberOfLines={1}>
                  {step.description}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    position: 'relative',
  },
  progressBarBackground: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: [{ translateY: -2 }],
    width: '100%',
    height: 4,
    backgroundColor: COLORS.lighterGray,
    zIndex: 0,
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: [{ translateY: -2 }],
    height: 4,
    backgroundColor: COLORS.primary,
    zIndex: 1,
  },
  stageContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 4,
    zIndex: 2,
  },
  indicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: COLORS.white,
  },
  completedIndicator: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  currentIndicator: {
    borderColor: COLORS.primary,
  },
  upcomingIndicator: {
    borderColor: COLORS.lighterGray,
  },
  labelContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  stageLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeStageLabel: {
    color: COLORS.primary,
  },
  upcomingStageLabel: {
    color: COLORS.lightGray,
  },
  stageDescription: {
    fontSize: 9,
    color: COLORS.lightGray,
    marginTop: 2,
    maxWidth: 80,
    textAlign: 'center',
  },
});

export default WorkflowTracker;