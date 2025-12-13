import React, { useEffect, useState } from 'react'
import {
    SafeAreaView,
    StyleSheet,
    Text,
    View,
    StatusBar,
    StatusBarStyle
} from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import ReportForm from './src/features/reports/components/ReportForm'
import { useAutoSync } from './src/shared/hooks/useAutoSync'
import ReportList from './src/features/reports/components/ReportList'

export default function App() {
    const syncStatus = useAutoSync()
    const [isOnline, setIsOnline] = useState<boolean | null>(null)

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOnline(state.isConnected === true)
        })

        return () => unsubscribe()
    }, [])

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={"dark-content" as StatusBarStyle} />

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
            </View>

            <ReportForm />
            <ReportList />
        </SafeAreaView>
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

