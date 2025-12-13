import React from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { withObservables } from '@nozbe/watermelondb/react'
import database from '../../../services/database'
import Report from '../models/Report'

interface ReportListProps {
    reports: Report[]
    userId: string
}

const ReportItem = ({ report }: { report: Report }) => (
    <View style={styles.card}>
        <View style={styles.headerRow}>
            <Text style={styles.title}>{report.title}</Text>
            <View style={[styles.badge, report.synced ? styles.badgeSynced : styles.badgePending]}>
                <Text style={styles.badgeText}>
                    {report.synced ? 'Synced ✅' : 'Pending ⏳'}
                </Text>
            </View>
        </View>

        <Text style={styles.description}>{report.description}</Text>

        <View style={styles.metaRow}>
            <Text style={styles.meta}>Severity: {report.severityLabel}</Text>
            <Text style={styles.meta}>Type: {report.incidentTypeLabel}</Text>
        </View>
        <Text style={styles.coords}>
            {report.latitude?.toFixed(4)}, {report.longitude?.toFixed(4)}
        </Text>
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
    // Split reports into two groups
    const pendingReports = reports.filter(r => !r.synced)
    const syncedReports = reports.filter(r => r.synced)

    // Sort: Pending (Oldest first - FIFO?), Synced (Newest first)
    pendingReports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    syncedReports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return (
        <View style={styles.container}>
            {/* PENDING SECTION */}
            {pendingReports.length > 0 && (
                <View style={styles.section}>
                    <Text style={[styles.header, { color: '#ed8936' }]}>
                        ⏳ Pending Upload ({pendingReports.length})
                    </Text>
                    <FlatList
                        data={pendingReports}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => <ReportItem report={item} />}
                        scrollEnabled={false} // Let main ScrollView handle it if we wrapped it, but here we might need flexibility. 
                    // Actually, rendering two FlatLists in a View might scroll badly. 
                    // Better to use one FlatList with sections, but we can just use mapping for now if lists aren't huge.
                    // Or just render them directly if we assume reasonable volume for this hackathon app.
                    />
                </View>
            )}

            {/* SYNCED SECTION */}
            <View style={styles.section}>
                <Text style={[styles.header, { color: '#38b2ac' }]}>
                    ✅ Synced History
                </Text>
                {syncedReports.length === 0 ? (
                    <Text style={styles.emptyText}>No synced reports yet.</Text>
                ) : (
                    <FlatList
                        data={syncedReports}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => <ReportItem report={item} />}
                    />
                )}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, marginTop: 10, paddingHorizontal: 20 },
    section: { marginBottom: 20 },
    header: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    emptyText: { fontStyle: 'italic', color: '#999' },
    list: { paddingHorizontal: 20 },
    item: { padding: 15, backgroundColor: '#f9f9f9', marginBottom: 10, borderRadius: 8, borderLeftWidth: 5 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    typeBadge: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', color: '#555', backgroundColor: '#e0e0e0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    date: { fontSize: 10, color: '#999' },
    card: {
        padding: 15,
        marginVertical: 6,
        backgroundColor: '#fff',
        borderRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#eee'
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginLeft: 10
    },
    badgeSynced: {
        backgroundColor: '#e6fffa',
        borderWidth: 1,
        borderColor: '#38b2ac'
    },
    badgePending: {
        backgroundColor: '#fffaf0',
        borderWidth: 1,
        borderColor: '#ed8936'
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#333'
    },
    description: {
        fontSize: 14,
        color: '#444',
        marginBottom: 10
    },
    metaRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 5
    },
    meta: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500'
    },
    coords: {
        fontSize: 10,
        color: '#999',
        fontFamily: 'monospace'
    }
})

// Enhance with WatermelonDB observables
import { Q } from '@nozbe/watermelondb'

const enhance = withObservables(['userId'], ({ userId }: { userId: string }) => ({
    reports: database.get<Report>('reports').query(
        Q.where('user_id', userId),
        Q.sortBy('created_at', Q.desc) // Optional: Sort by time DB-side too
    )
}))

export default enhance(ReportList)
