import React, { useEffect, useState } from 'react'
import {
    StyleSheet,
    Text,
    View,
    StatusBar,
    StatusBarStyle,
    Button
} from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import NetInfo from '@react-native-community/netinfo'
import { Session } from '@supabase/supabase-js'

import ReportForm from './src/features/reports/components/ReportForm'
import ReportList from './src/features/reports/components/ReportList'
import AuthScreen from './src/features/auth/components/AuthScreen'
import { useAutoSync } from './src/shared/hooks/useAutoSync'
import { sync } from './src/services/database/sync'
import { supabase } from './src/services/api/supabase'

export default function App() {
    const syncStatus = useAutoSync()
    const [isOnline, setIsOnline] = useState<boolean | null>(null)
    const [session, setSession] = useState<Session | null>(null)

    const [activeTab, setActiveTab] = useState<'form' | 'list'>('form')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Network Listener
        const unsubscribeNet = NetInfo.addEventListener(state => {
            setIsOnline(state.isConnected === true)
        })

        // Auth Listener
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

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle={"dark-content" as StatusBarStyle} />

                {!session ? (
                    <AuthScreen />
                ) : (
                    <>
                        <View style={styles.header}>
                            <Text style={styles.title}>Safe Area Reporting</Text>

                            <View style={styles.statusRow}>
                                <Text style={[styles.status, { color: isOnline ? 'green' : 'red' }]}>
                                    {isOnline ? 'Online 🌐' : 'Offline 📡'}
                                </Text>
                                <Text style={[styles.status, { color: syncStatus === 'Synced' ? 'green' : 'orange' }]}>
                                    {syncStatus}
                                </Text>
                            </View>

                            <View style={{ marginTop: 10, flexDirection: 'row', gap: 10 }}>
                                <Button title="Sync Now" onPress={() => sync()} />
                                <Button title="Sign Out" onPress={() => supabase.auth.signOut()} color="red" />
                            </View>
                        </View>

                        {/* Content Area */}
                        <View style={styles.content}>
                            {activeTab === 'form' ? (
                                <ReportForm userId={session.user.id} />
                            ) : (
                                <ReportList userId={session.user.id} />
                            )}
                        </View>

                        {/* Tab Bar */}
                        <View style={styles.tabBar}>
                            <Text
                                style={[styles.tabItem, activeTab === 'form' && styles.tabItemActive]}
                                onPress={() => setActiveTab('form')}
                            >
                                📝 New Report
                            </Text>
                            <Text
                                style={[styles.tabItem, activeTab === 'list' && styles.tabItemActive]}
                                onPress={() => setActiveTab('list')}
                            >
                                📂 History
                            </Text>
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
        backgroundColor: '#fff',
        paddingTop: StatusBar.currentHeight || 0
    },
    header: {
        padding: 15,
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    title: { fontSize: 20, fontWeight: 'bold' },
    statusRow: { flexDirection: 'row', gap: 15, marginTop: 5 },
    status: { fontSize: 14, fontWeight: '600' },

    content: { flex: 1 },

    tabBar: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: '#fff',
        height: 60
    },
    tabItem: {
        flex: 1,
        textAlign: 'center',
        textAlignVertical: 'center',
        fontSize: 16,
        color: '#999',
        paddingTop: 15
    },
    tabItemActive: {
        color: '#007AFF',
        fontWeight: 'bold'
    }
})
