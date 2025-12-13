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

    useEffect(() => {
        // Network Listener
        const unsubscribeNet = NetInfo.addEventListener(state => {
            setIsOnline(state.isConnected === true)
        })

        // Auth Listener
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => {
            unsubscribeNet()
            subscription.unsubscribe()
        }
    }, [])

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

                            {/* Online / Offline Status */}
                            <Text
                                style={[
                                    styles.status,
                                    { color: isOnline ? 'green' : 'red' }
                                ]}
                            >
                                {isOnline ? 'User Online' : 'User Offline'}
                            </Text>

                            {/* Sync Status */}
                            <Text
                                style={[
                                    styles.status,
                                    {
                                        color:
                                            syncStatus === 'Synced'
                                                ? 'green'
                                                : syncStatus === 'Offline'
                                                    ? 'orange'
                                                    : 'gray'
                                    }
                                ]}
                            >
                                Status: {syncStatus}
                            </Text>
                            <View style={{ marginTop: 10, flexDirection: 'row', gap: 10 }}>
                                <Button title="Sync Now" onPress={() => sync()} />
                                <Button title="Sign Out" onPress={() => supabase.auth.signOut()} color="red" />
                            </View>
                        </View>

                        <ReportForm userId={session.user.id} />
                        <ReportList />
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
        padding: 20,
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold'
    },
    status: {
        marginTop: 5,
        fontSize: 14,
        fontWeight: '500'
    }
})
