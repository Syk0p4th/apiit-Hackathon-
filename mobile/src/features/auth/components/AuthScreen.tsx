import React, { useState } from 'react'
import { 
    View, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet, 
    Alert, 
    Text,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native'
import { supabase } from '../../../services/api/supabase'
import { Ionicons } from '@expo/vector-icons'

export default function AuthScreen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [errors, setErrors] = useState({ email: '', password: '' })

    // Input validation
    const validateInputs = () => {
        let isValid = true
        const newErrors = { email: '', password: '' }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!email.trim()) {
            newErrors.email = 'Email is required'
            isValid = false
        } else if (!emailRegex.test(email)) {
            newErrors.email = 'Invalid email format'
            isValid = false
        }

        // Password validation
        if (!password) {
            newErrors.password = 'Password is required'
            isValid = false
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters'
            isValid = false
        }

        setErrors(newErrors)
        return isValid
    }

    async function signInWithEmail() {
        if (!validateInputs()) return

        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        })

        if (error) {
            Alert.alert('Sign In Failed', error.message)
        }
        setLoading(false)
    }

    async function signUpWithEmail() {
        if (!validateInputs()) return

        setLoading(true)
        const { error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
        })

        if (error) {
            Alert.alert('Sign Up Failed', error.message)
        } else {
            Alert.alert('Success', 'Check your inbox for the confirmation email!')
        }
        setLoading(false)
    }

    async function handleForgotPassword() {
        if (!email.trim()) {
            Alert.alert('Email Required', 'Please enter your email address')
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            setErrors({ ...errors, email: 'Invalid email format' })
            return
        }

        setLoading(true)
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
        
        if (error) {
            Alert.alert('Error', error.message)
        } else {
            Alert.alert('Success', 'Password reset email sent! Check your inbox.')
        }
        setLoading(false)
    }

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="alert-circle" size={40} color="#ea2a33" />
                    </View>
                    <Text style={styles.title}>
                        {isSignUp ? 'Create Account' : 'Welcome Back'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isSignUp 
                            ? 'Sign up to report incidents nearby' 
                            : 'Log in to report incidents nearby'}
                    </Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <View style={[
                            styles.inputWrapper,
                            errors.email && styles.inputError
                        ]}>
                            <Ionicons 
                                name="mail-outline" 
                                size={20} 
                                color="#994d51" 
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                onChangeText={(text) => {
                                    setEmail(text)
                                    setErrors({ ...errors, email: '' })
                                }}
                                value={email}
                                placeholder="name@example.com"
                                placeholderTextColor="#99999966"
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoComplete="email"
                                editable={!loading}
                            />
                        </View>
                        {errors.email ? (
                            <Text style={styles.errorText}>{errors.email}</Text>
                        ) : null}
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>Password</Text>
                            {!isSignUp && (
                                <TouchableOpacity 
                                    onPress={handleForgotPassword}
                                    disabled={loading}
                                >
                                    <Text style={styles.forgotPassword}>
                                        Forgot Password?
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={[
                            styles.inputWrapper,
                            errors.password && styles.inputError
                        ]}>
                            <Ionicons 
                                name="lock-closed-outline" 
                                size={20} 
                                color="#994d51" 
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                onChangeText={(text) => {
                                    setPassword(text)
                                    setErrors({ ...errors, password: '' })
                                }}
                                value={password}
                                placeholder="Enter your password"
                                placeholderTextColor="#99999966"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoComplete="password"
                                editable={!loading}
                            />
                            <TouchableOpacity 
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeIcon}
                            >
                                <Ionicons 
                                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                                    size={20} 
                                    color="#994d51"
                                />
                            </TouchableOpacity>
                        </View>
                        {errors.password ? (
                            <Text style={styles.errorText}>{errors.password}</Text>
                        ) : null}
                    </View>

                    {/* Main Action Button */}
                    <TouchableOpacity
                        style={[styles.mainButton, loading && styles.buttonDisabled]}
                        onPress={isSignUp ? signUpWithEmail : signInWithEmail}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.mainButtonText}>
                                {isSignUp ? 'Sign Up' : 'Log In'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Social Login Buttons */}
                    <View style={styles.socialButtons}>
                        <TouchableOpacity 
                            style={styles.socialButton}
                            disabled={loading}
                        >
                            <Ionicons name="logo-google" size={20} color="#1b0e0e" />
                            <Text style={styles.socialButtonText}>Google</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.socialButton}
                            disabled={loading}
                        >
                            <Ionicons name="logo-apple" size={20} color="#1b0e0e" />
                            <Text style={styles.socialButtonText}>Apple</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Guest Mode Button */}
                    <TouchableOpacity 
                        style={styles.guestButton}
                        disabled={loading}
                    >
                        <Ionicons name="megaphone-outline" size={20} color="#ea2a33" />
                        <Text style={styles.guestButtonText}>Guest Quick Report</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        {isSignUp ? "Already have an account? " : "Don't have an account? "}
                        <Text 
                            style={styles.footerLink}
                            onPress={() => setIsSignUp(!isSignUp)}
                        >
                            {isSignUp ? 'Log In' : 'Sign Up'}
                        </Text>
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f6f6',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconContainer: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1b0e0e',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    form: {
        gap: 16,
    },
    inputContainer: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1b0e0e',
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    forgotPassword: {
        fontSize: 14,
        fontWeight: '500',
        color: '#ea2a33',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fcf8f8',
        borderWidth: 1,
        borderColor: '#e7d0d1',
        borderRadius: 8,
        height: 48,
        paddingHorizontal: 12,
    },
    inputError: {
        borderColor: '#ea2a33',
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1b0e0e',
    },
    eyeIcon: {
        padding: 4,
    },
    errorText: {
        fontSize: 12,
        color: '#ea2a33',
        marginTop: 4,
    },
    mainButton: {
        backgroundColor: '#ea2a33',
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        shadowColor: '#ea2a33',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    mainButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e7d0d1',
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 12,
        color: '#999',
        fontWeight: '500',
    },
    socialButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    socialButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e7d0d1',
        borderRadius: 8,
        height: 40,
    },
    socialButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1b0e0e',
    },
    guestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#ea2a3310',
        borderWidth: 2,
        borderColor: '#ea2a3333',
        borderRadius: 8,
        height: 48,
        marginTop: 8,
    },
    guestButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ea2a33',
    },
    footer: {
        marginTop: 24,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: '#666',
    },
    footerLink: {
        fontWeight: 'bold',
        color: '#ea2a33',
    },
})