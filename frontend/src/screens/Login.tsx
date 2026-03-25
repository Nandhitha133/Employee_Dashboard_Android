// src/screens/Login.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Modal,
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    StatusBar,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, employeeAPI } from '../services/api';

// Define types based on your actual API structure
interface LoginResponse {
    token: string;
    user: User;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    employeeId?: string;
}

interface Employee {
    id: string;
    name: string;
    email: string;
    department: string;
    position: string;
    phone?: string;
    location?: string;
    employeeId?: string;
    designation?: string;
}

interface Announcement {
    _id: string;
    title: string;
    message: string;
    startDate?: string;
    endDate?: string;
    priority?: string;
}

// Define navigation type
type RootStackParamList = {
    Login: undefined;
    Dashboard: { user: UserData };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

// User data type for dashboard
type UserData = {
    id?: string;
    name: string;
    role: string;
    employeeId: string;
    designation: string;
    location: string;
    email: string;
    phone: string;
};

// Colors
const COLORS = {
    primary: '#0A0F2C',
    secondary: '#1A237E',
    accent: '#4A148C',
    white: '#FFFFFF',
    black: '#000000',
    gray: '#666666',
    lightGray: '#CCCCCC',
    error: '#FF4444',
    success: '#00C851'
};

// Create a separate component for Forgot Password Modal to isolate re-renders
const ForgotPasswordModal = React.memo(({ 
    visible, 
    onClose,
    onSendOtp,
    onResetPassword,
    isSendingOtp,
    isResetting,
    otpSecondsLeft,
    canResendOtp,
    onResendOtp
}: {
    visible: boolean;
    onClose: () => void;
    onSendOtp: (employeeId: string) => void;
    onResetPassword: (otp: string, password: string) => void;
    isSendingOtp: boolean;
    isResetting: boolean;
    otpSecondsLeft: number;
    canResendOtp: boolean;
    onResendOtp: (employeeId: string) => void;
}) => {
    const [step, setStep] = useState(1);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
    
    // Use refs for uncontrolled inputs
    const employeeIdRef = useRef<TextInput>(null);
    const otpRef = useRef<TextInput>(null);
    const newPasswordRef = useRef<TextInput>(null);
    
    // Store values in refs to avoid state updates during typing
    const employeeIdValue = useRef('');
    const otpValue = useRef('');
    const passwordValue = useRef('');

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!visible) {
            setStep(1);
            setShowNewPassword(false);
            setMessage('');
            setMessageType('');
            employeeIdValue.current = '';
            otpValue.current = '';
            passwordValue.current = '';
        }
    }, [visible]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleSendOtp = () => {
        const empId = employeeIdValue.current.trim();
        if (!empId) {
            setMessage('Please enter Employee ID');
            setMessageType('error');
            return;
        }
        setMessage('');
        onSendOtp(empId);
    };

    const handleResendOtp = () => {
        const empId = employeeIdValue.current.trim();
        if (!empId) return;
        onResendOtp(empId);
    };

    const handleResetPassword = () => {
        const otp = otpValue.current.trim();
        const password = passwordValue.current.trim();

        if (!otp || !password) {
            setMessage('Please fill all fields');
            setMessageType('error');
            return;
        }

        if (password.length < 6) {
            setMessage('Password must be at least 6 characters');
            setMessageType('error');
            return;
        }

        setMessage('');
        onResetPassword(otp, password);
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, styles.forgotPasswordModal]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Forgot Password</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeButton}
                        >
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView 
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.forgotPasswordContainer}>
                            <Text style={styles.forgotPasswordSubtitle}>
                                Reset your account password
                            </Text>

                            {/* Step 1: Employee ID */}
                            {step === 1 && (
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Employee ID</Text>
                                    <TextInput
                                        ref={employeeIdRef}
                                        style={styles.input}
                                        placeholder="Enter your employee ID"
                                        placeholderTextColor="#999"
                                        defaultValue={employeeIdValue.current}
                                        onChangeText={(text) => {
                                            const formatted = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                                            employeeIdValue.current = formatted;
                                            if (employeeIdRef.current) {
                                                employeeIdRef.current.setNativeProps({ text: formatted });
                                            }
                                        }}
                                        autoCapitalize="characters"
                                        maxLength={6}
                                        editable={!isSendingOtp}
                                    />
                                </View>
                            )}

                            {/* Step 2: OTP and New Password */}
                            {step === 2 && (
                                <>
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>OTP</Text>
                                        <TextInput
                                            ref={otpRef}
                                            style={styles.input}
                                            placeholder="Enter OTP"
                                            placeholderTextColor="#999"
                                            defaultValue={otpValue.current}
                                            onChangeText={(text) => {
                                                const formatted = text.replace(/[^0-9]/g, '').slice(0, 6);
                                                otpValue.current = formatted;
                                                if (otpRef.current) {
                                                    otpRef.current.setNativeProps({ text: formatted });
                                                }
                                            }}
                                            keyboardType="numeric"
                                            maxLength={6}
                                            editable={!isResetting}
                                        />
                                        <View style={styles.otpTimerContainer}>
                                            {otpSecondsLeft > 0 ? (
                                                <Text style={styles.otpTimerText}>
                                                    OTP expires in {formatTime(otpSecondsLeft)}
                                                </Text>
                                            ) : (
                                                <Text style={styles.otpExpiredText}>
                                                    OTP expired
                                                </Text>
                                            )}
                                            <TouchableOpacity
                                                onPress={handleResendOtp}
                                                disabled={!canResendOtp || isSendingOtp}
                                            >
                                                <Text style={[
                                                    styles.resendOtpText,
                                                    (!canResendOtp || isSendingOtp) && styles.resendOtpDisabled
                                                ]}>
                                                    Resend OTP
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>New Password</Text>
                                        <View style={styles.passwordContainer}>
                                            <TextInput
                                                ref={newPasswordRef}
                                                style={[styles.input, styles.passwordInput]}
                                                placeholder="Enter new password"
                                                placeholderTextColor="#999"
                                                secureTextEntry={!showNewPassword}
                                                defaultValue={passwordValue.current}
                                                onChangeText={(text) => {
                                                    passwordValue.current = text;
                                                    if (newPasswordRef.current) {
                                                        newPasswordRef.current.setNativeProps({ text });
                                                    }
                                                }}
                                                maxLength={16}
                                                editable={!isResetting}
                                            />
                                            <TouchableOpacity
                                                onPress={() => setShowNewPassword(!showNewPassword)}
                                                style={styles.eyeIcon}
                                                disabled={isResetting}
                                            >
                                                <Text style={styles.eyeIconText}>
                                                    {showNewPassword ? '👁️' : '👁️‍🗨️'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </>
                            )}

                            {/* Message Display */}
                            {message ? (
                                <View style={[
                                    styles.messageContainer,
                                    messageType === 'success' ? styles.successMessage : styles.errorMessage
                                ]}>
                                    <Text style={[
                                        styles.messageText,
                                        messageType === 'success' ? styles.successMessageText : styles.errorMessageText
                                    ]}>
                                        {message}
                                    </Text>
                                </View>
                            ) : null}

                            {/* Buttons */}
                            <View style={styles.forgotPasswordButtons}>
                                {step === 1 ? (
                                    <TouchableOpacity
                                        style={[
                                            styles.forgotPasswordButton,
                                            styles.submitButton,
                                            isSendingOtp && styles.submitButtonDisabled
                                        ]}
                                        onPress={handleSendOtp}
                                        disabled={isSendingOtp}
                                    >
                                        {isSendingOtp ? (
                                            <View style={styles.loadingContainer}>
                                                <ActivityIndicator color={COLORS.white} size="small" />
                                                <Text style={styles.submitButtonText}> Sending...</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.submitButtonText}>Send OTP</Text>
                                        )}
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={[
                                            styles.forgotPasswordButton,
                                            styles.submitButton,
                                            isResetting && styles.submitButtonDisabled
                                        ]}
                                        onPress={handleResetPassword}
                                        disabled={isResetting}
                                    >
                                        {isResetting ? (
                                            <View style={styles.loadingContainer}>
                                                <ActivityIndicator color={COLORS.white} size="small" />
                                                <Text style={styles.submitButtonText}> Resetting...</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.submitButtonText}>Reset Password</Text>
                                        )}
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    style={[styles.forgotPasswordButton, styles.cancelButton]}
                                    onPress={onClose}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
});

const Login = () => {
    const [formData, setFormData] = useState({
        employeeId: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Forgot Password States
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [otpSecondsLeft, setOtpSecondsLeft] = useState(60);
    const [canResendOtp, setCanResendOtp] = useState(false);
    
    // Store employeeId for resend OTP
    const forgotEmployeeIdRef = useRef('');

    // Modal states
    const [showHolidays, setShowHolidays] = useState(false);
    const [showUpdates, setShowUpdates] = useState(false);

    // Announcements state - fetched from API
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);

    const navigation = useNavigation() as any;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Refs for main login inputs
    const employeeIdInputRef = useRef<TextInput>(null);
    const passwordInputRef = useRef<TextInput>(null);

    // Holiday Calendar 2026 data
    const holidays2026 = useMemo(() => [
        { date: '01-Jan-26', day: 'THURSDAY', occasion: 'NEW YEAR' },
        { date: '15-Jan-26', day: 'THURSDAY', occasion: 'THAI PONGAL' },
        { date: '16-Jan-26', day: 'FRIDAY', occasion: 'MATTU PONGAL' },
        { date: '26-Jan-26', day: 'MONDAY', occasion: 'REPUBLIC DAY' },
        { date: '14-Apr-26', day: 'TUESDAY', occasion: 'TAMIL NEW YEAR' },
        { date: '01-May-26', day: 'FRIDAY', occasion: 'LABOUR DAY' },
        { date: '14-Sep-26', day: 'MONDAY', occasion: 'VINAYAGAR CHATHURTHI' },
        { date: '02-Oct-26', day: 'FRIDAY', occasion: 'GANDHI JAYANTHI' },
        { date: '19-Oct-26', day: 'MONDAY', occasion: 'AYUDHA POOJA' },
        { date: 'REGIONAL', day: 'CHOOSE ONE', occasion: 'REGIONAL HOLIDAY (TELUGU NEW YEAR / GOOD FRIDAY / BAKRID / CHRISTMAS)' }
    ], []);

    // Fetch announcements from API on component mount
    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            setLoadingAnnouncements(true);
            const response = await authAPI.announcement.getActive();
            const data = response.data || [];
            const mapped = data.map((a: any) => ({
                _id: a._id || String(Math.random()),
                title: a.title || 'Update',
                message: a.message || a.description || '',
                startDate: a.startDate,
                endDate: a.endDate,
                priority: a.priority || 'medium'
            }));
            setAnnouncements(mapped);
        } catch (error) {
            console.error('Error fetching announcements:', error);
            setAnnouncements([]);
        } finally {
            setLoadingAnnouncements(false);
        }
    };

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();

        loadSavedCredentials();
    }, [fadeAnim]);

    // OTP Timer Effect
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (showForgotPassword && forgotPasswordStep === 2 && otpSecondsLeft > 0) {
            timer = setTimeout(() => {
                setOtpSecondsLeft(prev => prev - 1);
            }, 1000);
        } else if (otpSecondsLeft === 0) {
            setCanResendOtp(true);
        }
        return () => clearTimeout(timer);
    }, [showForgotPassword, forgotPasswordStep, otpSecondsLeft]);

    const loadSavedCredentials = async () => {
        try {
            const savedEmployeeId = await AsyncStorage.getItem('savedEmployeeId');
            const savedPassword = await AsyncStorage.getItem('savedPassword');
            const rememberMeFlag = await AsyncStorage.getItem('rememberMe');
            
            if (rememberMeFlag === 'true' && savedEmployeeId && savedPassword) {
                setFormData({
                    employeeId: savedEmployeeId,
                    password: savedPassword
                });
                setRememberMe(true);
            }
        } catch (error) {
            console.error('Error loading saved credentials:', error);
        }
    };

    const handleChange = useCallback((name: string, value: string) => {
        if (name === 'employeeId') {
            value = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        }
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    }, [error]);

    const handleSendOtp = async (employeeId: string) => {
        if (!employeeId) return;

        forgotEmployeeIdRef.current = employeeId;
        setIsSendingOtp(true);

        try {
            await authAPI.forgotPassword({ 
                employeeId 
            });

            setForgotPasswordStep(2);
            setOtpSecondsLeft(60);
            setCanResendOtp(false);
        } catch (error: any) {
            console.error('Send OTP error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to send OTP');
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleResendOtp = async (employeeId: string) => {
        if (!canResendOtp || !employeeId) return;
        
        setIsSendingOtp(true);

        try {
            await authAPI.forgotPassword({ 
                employeeId 
            });

            setOtpSecondsLeft(60);
            setCanResendOtp(false);
        } catch (error: any) {
            console.error('Resend OTP error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to resend OTP');
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleResetPassword = async (otp: string, password: string) => {
        setIsResetting(true);

        try {
            await authAPI.resetPassword({
                employeeId: forgotEmployeeIdRef.current,
                otp: otp,
                newPassword: password
            });

            Alert.alert('Success', 'Password reset successfully. Please login with your new password.');
            setShowForgotPassword(false);
            setForgotPasswordStep(1);
        } catch (error: any) {
            console.error('Reset password error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to reset password');
        } finally {
            setIsResetting(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.employeeId || !formData.password) {
            setError('Please fill all fields');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await authAPI.login({
                employeeId: formData.employeeId,
                password: formData.password
            });

            const loginData = response.data;

            await AsyncStorage.setItem('token', loginData.token);
            await AsyncStorage.setItem('user', JSON.stringify(loginData.user));
            
            if (rememberMe) {
                await AsyncStorage.setItem('savedEmployeeId', formData.employeeId);
                await AsyncStorage.setItem('savedPassword', formData.password);
                await AsyncStorage.setItem('rememberMe', 'true');
            } else {
                await AsyncStorage.removeItem('savedEmployeeId');
                await AsyncStorage.removeItem('savedPassword');
                await AsyncStorage.removeItem('rememberMe');
            }

            let profileData: Partial<Employee> = {};
            try {
                const profileResponse = await employeeAPI.getMyProfile();
                profileData = profileResponse.data;
            } catch (profileError) {
                console.error('Error fetching profile:', profileError);
            }
            
            const userData: UserData = {
                id: loginData.user.id,
                name: loginData.user.name || formData.employeeId,
                role: loginData.user.role || 'employee',
                employeeId: formData.employeeId,
                designation: profileData.position || profileData.designation || 'Employee',
                location: profileData.location || 'Chennai',
                email: loginData.user.email || `${formData.employeeId.toLowerCase()}@caldim.com`,
                phone: profileData.phone || '+91 98765 43210'
            };

            navigation.replace('Dashboard', { user: userData });
        } catch (error: any) {
            console.error('Login error:', error);
            
            if (error.response?.status === 401) {
                setError('Invalid Employee ID or Password');
            } else if (error.response?.status === 403) {
                setError('Your account is locked. Please contact HR.');
            } else if (error.response?.status === 404) {
                setError('Employee ID not found');
            } else if (error.code === 'ECONNABORTED') {
                setError('Connection timeout. Please check your network.');
            } else if (!error.response) {
                setError('Network error. Please check your internet connection.');
            } else {
                setError(error.response?.data?.message || 'Login failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const closeForgotPassword = useCallback(() => {
        setShowForgotPassword(false);
        setForgotPasswordStep(1);
        setOtpSecondsLeft(60);
        setCanResendOtp(false);
        forgotEmployeeIdRef.current = '';
    }, []);

    // Holidays Modal Component
    const HolidaysModal = useMemo(() => () => (
        <Modal
            visible={showHolidays}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowHolidays(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>CALDIM HOLIDAY LIST 2026</Text>
                        <TouchableOpacity
                            onPress={() => setShowHolidays(false)}
                            style={styles.closeButton}
                        >
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.holidaysGrid}>
                            {holidays2026.map((holiday, index) => (
                                <View key={index} style={styles.holidayCard}>
                                    <Text style={styles.holidayDate}>{holiday.date}</Text>
                                    <Text style={styles.holidayOccasion}>{holiday.occasion}</Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    ), [showHolidays, holidays2026]);

    // Updates Modal Component - Now fetches from API
    const UpdatesModal = useMemo(() => () => (
        <Modal
            visible={showUpdates}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowUpdates(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, styles.updatesModalContent]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>UPCOMING EVENTS</Text>
                        <TouchableOpacity
                            onPress={() => setShowUpdates(false)}
                            style={styles.closeButton}
                        >
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {loadingAnnouncements ? (
                            <View style={styles.loadingAnnouncements}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                                <Text style={styles.loadingAnnouncementsText}>Loading updates...</Text>
                            </View>
                        ) : announcements.length === 0 ? (
                            <View style={styles.emptyUpdates}>
                                <Text style={styles.emptyUpdatesText}>No upcoming events</Text>
                            </View>
                        ) : (
                            announcements.map((update) => (
                                <View key={update._id} style={styles.updateCard}>
                                    <View style={[
                                        styles.updatePriorityDot,
                                        { backgroundColor: update.priority === 'high' ? '#FF4444' : '#4CAF50' }
                                    ]} />
                                    <View style={styles.updateContent}>
                                        <Text style={styles.updateTitle}>{update.title}</Text>
                                        <Text style={styles.updateDescription}>{update.message}</Text>
                                        {update.startDate && (
                                            <Text style={styles.updateTime}>
                                                {new Date(update.startDate).toLocaleDateString()}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <Text style={styles.footerText}>© 2026 CALDIM Engineering Pvt. Ltd.</Text>
                    </View>
                </View>
            </View>
        </Modal>
    ), [showUpdates, announcements, loadingAnnouncements]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            {/* Background Gradient */}
            <View style={styles.backgroundGradient}>
                <View style={styles.gradientLayer1} />
                <View style={styles.gradientLayer2} />
                <View style={styles.gradientLayer3} />
            </View>

            {/* Modals */}
            <HolidaysModal />
            <UpdatesModal />
            <ForgotPasswordModal
                visible={showForgotPassword}
                onClose={closeForgotPassword}
                onSendOtp={handleSendOtp}
                onResetPassword={handleResetPassword}
                onResendOtp={handleResendOtp}
                isSendingOtp={isSendingOtp}
                isResetting={isResetting}
                otpSecondsLeft={otpSecondsLeft}
                canResendOtp={canResendOtp}
            />

            {/* Main Content */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                        {/* Logo and Title */}
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../assets/images/steel-logo.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                            <Text style={styles.companyName}>CALDIM</Text>
                        </View>

                        {/* Login Box */}
                        <View style={styles.loginBox}>
                            <Text style={styles.loginTitle}>EMPLOYEE PORTAL</Text>

                            {/* Employee ID Field */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Employee ID *</Text>
                                <TextInput
                                    ref={employeeIdInputRef}
                                    style={styles.input}
                                    placeholder="Enter your employee ID"
                                    placeholderTextColor="#999"
                                    value={formData.employeeId}
                                    onChangeText={(text) => handleChange('employeeId', text)}
                                    autoCapitalize="characters"
                                    maxLength={6}
                                    editable={!isLoading}
                                />
                            </View>

                            {/* Password Field */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Password</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        ref={passwordInputRef}
                                        style={[styles.input, styles.passwordInput]}
                                        placeholder="Enter your password"
                                        placeholderTextColor="#999"
                                        secureTextEntry={!showPassword}
                                        value={formData.password}
                                        onChangeText={(text) => handleChange('password', text)}
                                        maxLength={16}
                                        editable={!isLoading}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={styles.eyeIcon}
                                        disabled={isLoading}
                                    >
                                        <Text style={styles.eyeIconText}>
                                            {showPassword ? '👁️' : '👁️‍🗨️'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Error Message */}
                            {error ? (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : null}

                            {/* Remember Me & Forgot Password */}
                            <View style={styles.rowContainer}>
                                <TouchableOpacity
                                    style={styles.rememberMeContainer}
                                    onPress={() => setRememberMe(!rememberMe)}
                                    disabled={isLoading}
                                >
                                    <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]} />
                                    <Text style={styles.rememberMeText}>Remember me</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    onPress={() => setShowForgotPassword(true)}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.forgotPassword}>Forgot Password?</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Sign In Button */}
                            <TouchableOpacity
                                style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
                                onPress={handleSubmit}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={COLORS.white} />
                                ) : (
                                    <Text style={styles.signInButtonText}>Sign In</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Bottom Buttons */}
                        <View style={styles.bottomButtonsContainer}>
                            <TouchableOpacity
                                style={styles.bottomButton}
                                onPress={() => setShowHolidays(true)}
                                disabled={isLoading}
                            >
                                <Text style={styles.bottomButtonIcon}>📅</Text>
                                <View>
                                    <Text style={styles.bottomButtonText}>CALDIM HOLIDAY'S</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.bottomButton}
                                onPress={() => setShowUpdates(true)}
                                disabled={isLoading}
                            >
                                <View style={styles.updatesIconContainer}>
                                    <Text style={styles.bottomButtonIcon}>⏰</Text>
                                    <View style={styles.pulseDot} />
                                </View>
                                <View>
                                    <Text style={styles.bottomButtonText}>UPCOMING EVENTS</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.primary,
    },
    backgroundGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    gradientLayer1: {
        flex: 1,
        backgroundColor: COLORS.primary,
    },
    gradientLayer2: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.secondary,
        opacity: 0.5,
    },
    gradientLayer3: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.accent,
        opacity: 0.3,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    content: {
        width: '100%',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    logo: {
        width: 100,
        height: 60,
        marginRight: 10,
    },
    companyName: {
        fontSize: 36,
        fontWeight: '800',
        color: COLORS.white,
        letterSpacing: 1,
    },
    loginBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    loginTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.gray,
        textAlign: 'center',
        marginBottom: 24,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.gray,
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderWidth: 1,
        borderColor: COLORS.lightGray,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORS.black,
    },
    passwordContainer: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 50,
    },
    eyeIcon: {
        position: 'absolute',
        right: 12,
        top: 12,
    },
    eyeIconText: {
        fontSize: 20,
    },
    errorContainer: {
        backgroundColor: '#FFEBEE',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 14,
        textAlign: 'center',
    },
    rowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 18,
        height: 18,
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderRadius: 4,
        marginRight: 8,
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
    },
    rememberMeText: {
        fontSize: 14,
        color: COLORS.gray,
    },
    forgotPassword: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '500',
    },
    signInButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    signInButtonDisabled: {
        opacity: 0.7,
    },
    signInButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    bottomButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
        gap: 12,
    },
    bottomButton: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    bottomButtonIcon: {
        fontSize: 20,
    },
    bottomButtonText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: '500',
    },
    updatesIconContainer: {
        position: 'relative',
    },
    pulseDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4CAF50',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        width: '100%',
        maxWidth: 500,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    forgotPasswordModal: {
        maxWidth: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: COLORS.gray,
        fontSize: 16,
        fontWeight: 'bold',
    },
    forgotPasswordContainer: {
        padding: 20,
    },
    forgotPasswordSubtitle: {
        fontSize: 14,
        color: COLORS.gray,
        textAlign: 'center',
        marginBottom: 24,
    },
    otpTimerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    otpTimerText: {
        fontSize: 12,
        color: COLORS.gray,
    },
    otpExpiredText: {
        fontSize: 12,
        color: COLORS.error,
    },
    resendOtpText: {
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.primary,
    },
    resendOtpDisabled: {
        color: COLORS.lightGray,
    },
    messageContainer: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    successMessage: {
        backgroundColor: '#E8F5E9',
    },
    errorMessage: {
        backgroundColor: '#FFEBEE',
    },
    messageText: {
        fontSize: 14,
        textAlign: 'center',
    },
    successMessageText: {
        color: COLORS.success,
    },
    errorMessageText: {
        color: COLORS.error,
    },
    forgotPasswordButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    forgotPasswordButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButton: {
        backgroundColor: COLORS.primary,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '500',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.lightGray,
    },
    cancelButtonText: {
        color: COLORS.gray,
        fontSize: 14,
        fontWeight: '500',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    updatesModalContent: {
        maxWidth: 400,
    },
    loadingAnnouncements: {
        padding: 40,
        alignItems: 'center',
    },
    loadingAnnouncementsText: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.gray,
    },
    holidaysGrid: {
        padding: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    holidayCard: {
        width: '48%',
        backgroundColor: 'rgba(10, 15, 44, 0.05)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(10, 15, 44, 0.1)',
    },
    holidayDate: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 4,
    },
    holidayOccasion: {
        fontSize: 14,
        color: COLORS.gray,
    },
    emptyUpdates: {
        padding: 40,
        alignItems: 'center',
    },
    emptyUpdatesText: {
        color: COLORS.gray,
        fontSize: 16,
    },
    updateCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(10, 15, 44, 0.05)',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(10, 15, 44, 0.1)',
    },
    updatePriorityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 12,
        marginTop: 4,
    },
    updateContent: {
        flex: 1,
    },
    updateTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 4,
    },
    updateDescription: {
        fontSize: 14,
        color: COLORS.gray,
        marginBottom: 8,
    },
    updateTime: {
        fontSize: 12,
        color: 'rgba(102, 102, 102, 0.7)',
    },
    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.1)',
        alignItems: 'center',
    },
    footerText: {
        color: 'rgba(102, 102, 102, 0.5)',
        fontSize: 12,
    },
});

export default Login;