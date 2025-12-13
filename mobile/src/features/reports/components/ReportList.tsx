import React from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { withObservables } from '@nozbe/watermelondb/react'
import database from '../../../services/database'
import Report from '../models/Report'

interface ReportListProps {
    reports: Report[]
}

const ReportItem = ({ report }: { report: Report }) => (
    <View style={styles.item}>
        <Text style={styles.title}>{report.title}</Text>
        <Text style={styles.desc}>{report.description}</Text>
        <Text style={styles.meta}>ID: {report.id} • Status: {(report as any)._status}</Text>
    </View>
)

const ReportList: React.FC<ReportListProps> = ({ reports }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.header}>Stored Reports ({reports.length})</Text>
            <FlatList
                data={reports}
                keyExtractor={item => item.id}
                renderItem={({ item }) => <ReportItem report={item} />}
                style={styles.list}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, marginTop: 20 },
    header: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, paddingHorizontal: 20 },
    list: { paddingHorizontal: 20 },
    item: { padding: 15, backgroundColor: '#f0f0f0', marginBottom: 10, borderRadius: 8 },
    title: { fontSize: 16, fontWeight: 'bold' },
    desc: { fontSize: 14, marginTop: 5 },
    meta: { fontSize: 12, color: 'gray', marginTop: 5 }
})

// Enhance with WatermelonDB observables
const enhance = withObservables([], () => ({
    reports: database.get<Report>('reports').query()
}))

export default enhance(ReportList)
