import React from 'react'
import { SafeAreaView, StyleSheet, Text, View, StatusBar, StatusBarStyle } from 'react-native'
import ReportForm from './src/features/reports/components/ReportForm'
import { useAutoSync } from './src/shared/hooks/useAutoSync'

export default function App() {
    const syncStatus = useAutoSync()

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={"dark-content" as StatusBarStyle} />
            <View style={styles.header}>
                <Text style={styles.title}>Safe Area Reporting</Text>
                <Text style={[
                    styles.status,
                    { color: syncStatus === 'Synced' ? 'green' : (syncStatus === 'Offline' ? 'orange' : 'gray') }
                ]}>
                    Status: {syncStatus}
                </Text>
            </View>
            <ReportForm />
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', paddingTop: StatusBar.currentHeight || 0 },
    header: { padding: 20, alignItems: 'center', backgroundColor: '#f9f9f9', borderBottomWidth: 1, borderBottomColor: '#eee' },
    title: { fontSize: 22, fontWeight: 'bold' },
    status: { marginTop: 5, fontSize: 14, fontWeight: '500' }
})
