import React, { useEffect, useState, useRef } from 'react'
import {
    StyleSheet,
    Text,
    View,
    StatusBar,
    StatusBarStyle,
    TouchableOpacity,
    Animated
} from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import NetInfo from '@react-native-community/netinfo'
import { Session } from '@supabase/supabase-js'

import ReportForm from './src/features/reports/components/ReportForm'
import ReportList from './src/features/reports/components/ReportList'
import AuthScreen from './src/features/auth/components/AuthScreen'
import { useAutoSync } from './src/shared/hooks/useAutoSync'
import { supabase } from './src/services/api/supabase'

const BrandingHeader = ({ isSynced, isOnline, onSignOut }: { isSynced: boolean; isOnline: boolean; onSignOut?: () => void }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current

    useEffect(() => {
        if (isOnline) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.4,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start()
        } else {
            pulseAnim.setValue(1)
        }
    }, [isOnline])

    return (
        <View style={styles.brandingContainer}>
            <View style={styles.leftSection}>
                <View style={styles.logoContainer}>
                    <Text style={styles.logoIcon}>🛡️</Text>
                </View>

                <View style={styles.brandingInfo}>
                    <Text style={styles.brandTitle}>Project Aegis</Text>
                    
                    <View style={styles.statusRow}>
                        <View style={styles.statusItem}>
                            <View style={styles.dotContainer}>
                                {isOnline && (
                                    <Animated.View
                                        style={[
                                            styles.pingDot,
                                            {
                                                transform: [{ scale: pulseAnim }],
                                            },
                                        ]}
                                    />
                                )}
                                <View
                                    style={[
                                        styles.statusDot,
                                        { backgroundColor: isOnline ? '#10B981' : '#EF4444' },
                                    ]}
                                />
                            </View>
                            <Text
                                style={[
                                    styles.statusText,
                                    { color: isOnline ? '#059669' : '#DC2626' },
                                ]}
                            >
                                {isOnline ? 'ONLINE' : 'OFFLINE'}
                            </Text>
                        </View>

                        <Text style={styles.separator}>•</Text>

                        <View style={styles.statusItem}>
                            <Text style={styles.cloudIcon}>{isSynced ? '☁️' : '⏳'}</Text>
                            <Text style={styles.syncText}>
                                {isSynced ? 'Synced' : 'Syncing'}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            <TouchableOpacity
                style={styles.signOutButton}
                onPress={onSignOut}
                activeOpacity={0.7}
            >
                <Text style={styles.signOutIcon}>⎋</Text>
                <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
        </View>
    )
}

export default function App() {
    const syncStatus = useAutoSync()
    const [isOnline, setIsOnline] = useState<boolean | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [isGuest, setIsGuest] = useState(false)

    const [activeTab, setActiveTab] = useState<'form' | 'list'>('form')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const unsubscribeNet = NetInfo.addEventListener(state => {
            setIsOnline(state.isConnected === true)
        })

        const checkSession = async () => {
            try {
                console.log('[App] Checking session...')
                const { data: { session } } = await supabase.auth.getSession()
                console.log('[App] Session found:', !!session)
                setSession(session)
            } catch (error) {
                console.log('[App] Error loading session:', error)
            } finally {
                setIsLoading(false)
            }
        }

        checkSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            if (session) setIsGuest(false)
            setIsLoading(false)
        })

        return () => {
            unsubscribeNet()
            subscription.unsubscribe()
        }
    }, [])

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Loading Session...</Text>
            </View>
        )
    }

    const currentUserId = session?.user.id || null
    const isAuthenticated = !!session || isGuest
    const isSynced = syncStatus === 'Synced'

    const handleSignOut = () => {
        if (isGuest) {
            setIsGuest(false)
        } else {
            supabase.auth.signOut()
        }
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle={"dark-content" as StatusBarStyle} />

                {!isAuthenticated ? (
                    <AuthScreen onGuestLogin={() => setIsGuest(true)} />
                ) : (
                    <>
                        <BrandingHeader
                            isSynced={isSynced}
                            isOnline={isOnline === true}
                            onSignOut={handleSignOut}
                        />

                        <View style={styles.content}>
                            {activeTab === 'form' ? (
                                <ReportForm userId={currentUserId} />
                            ) : (
                                <ReportList userId={currentUserId} />
                            )}
                        </View>

                        <View style={styles.tabBar}>
                            <TouchableOpacity
                                style={[styles.tabItem, activeTab === 'form' && styles.tabItemActive]}
                                onPress={() => setActiveTab('form')}
                            >
                                <Text style={[styles.tabText, activeTab === 'form' && styles.tabTextActive]}>
                                    📝 New Report
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabItem, activeTab === 'list' && styles.tabItemActive]}
                                onPress={() => setActiveTab('list')}
                            >
                                <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>
                                    📂 History
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </SafeAreaView>
        </SafeAreaProvider>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F6F6',
        paddingTop: StatusBar.currentHeight || 0
    },
    brandingContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    logoContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoIcon: {
        fontSize: 22,
    },
    brandingInfo: {
        flex: 1,
    },
    brandTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 6,
        letterSpacing: -0.3,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dotContainer: {
        width: 6,
        height: 6,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pingDot: {
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
        opacity: 0.75,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    separator: {
        fontSize: 10,
        color: '#D1D5DB',
    },
    cloudIcon: {
        fontSize: 12,
    },
    syncText: {
        fontSize: 10,
        fontWeight: '500',
        color: '#64748B',
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    signOutIcon: {
        fontSize: 18,
        color: '#64748B',
    },
    signOutText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
    },
    content: {
        flex: 1,
    },
    tabBar: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        backgroundColor: '#fff',
        height: 60,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabItemActive: {
        borderTopWidth: 2,
        borderTopColor: '#EA2A33',
    },
    tabText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#EA2A33',
        fontWeight: 'bold',
    },
})