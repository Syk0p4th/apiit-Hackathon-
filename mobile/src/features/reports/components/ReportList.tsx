import React from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { withObservables } from '@nozbe/watermelondb/react'
import database from '../../../services/database'
import Report from '../models/Report'

interface ReportListProps {
    reports: Report[]
}

const ReportItem = ({ report }: { report: Report }) => (
    <View style={[styles.item, { borderLeftColor: getSeverityColor(report.severity) }]}>
        <View style={styles.row}>
            <Text style={styles.typeBadge}>{report.incidentTypeLabel}</Text>
            <Text style={styles.date}>{report.createdAt.toLocaleDateString()}</Text>
        </View>
        <Text style={styles.title}>{report.title}</Text>
        <Text style={styles.desc}>{report.description}</Text>
        <Text style={styles.meta}>Reporter: {report.reporterName || 'Anonymous'} • Severity: {report.severityLabel}</Text>
        <Text style={styles.meta}>ID: {report.id} • Status: {(report as any)._status}</Text>
    </View>
)

const getSeverityColor = (severity: number) => {
    switch (severity) {
        case 3: return 'orange'
        case 4: return 'red'
        default: return 'green'
    }
}

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
    item: { padding: 15, backgroundColor: '#f9f9f9', marginBottom: 10, borderRadius: 8, borderLeftWidth: 5 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    typeBadge: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', color: '#555', backgroundColor: '#e0e0e0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    date: { fontSize: 10, color: '#999' },
    title: { fontSize: 16, fontWeight: 'bold' },
    desc: { fontSize: 14, marginTop: 5 },
    meta: { fontSize: 12, color: 'gray', marginTop: 8 }
})

// Enhance with WatermelonDB observables
const enhance = withObservables([], () => ({
    reports: database.get<Report>('reports').query()
}))

export default enhance(ReportList)
