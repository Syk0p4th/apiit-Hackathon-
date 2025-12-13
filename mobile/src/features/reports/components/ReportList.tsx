import React, { useState, useMemo } from 'react'
import { View, Text, SectionList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { withObservables } from '@nozbe/watermelondb/react'
import database from '../../../services/database'
import Report from '../models/Report'
import { Q } from '@nozbe/watermelondb'

interface ReportListProps {
    reports: Report[]
    userId: string | null
    onReportPress?: (report: Report) => void
}

// Icon mapping for incident types
const INCIDENT_ICONS: { [key: number]: string } = {
    1: '💧', // Flooding
    2: '🏔️', // Landslide
    3: '⚡', // Powerline
    4: '🚧', // Roadblock
}

const INCIDENT_COLORS: { [key: number]: { bg: string; text: string } } = {
    1: { bg: '#EFF6FF', text: '#3B82F6' }, // Blue
    2: { bg: '#F5F5F4', text: '#78716C' }, // Stone
    3: { bg: '#FFFBEB', text: '#EAB308' }, // Yellow
    4: { bg: '#FFF7ED', text: '#F97316' }, // Orange
}

const SEVERITY_CONFIG: { [key: number]: { label: string; color: string; bg: string } } = {
    1: { label: 'Low', color: '#6B7280', bg: '#F9FAFB' },
    2: { label: 'Medium', color: '#EAB308', bg: '#FFFBEB' },
    3: { label: 'Elevated', color: '#EAB308', bg: '#FFFBEB' },
    4: { label: 'High', color: '#F97316', bg: '#FFF7ED' },
    5: { label: 'Critical', color: '#EA2A33', bg: '#FEF2F2' },
}

const STATUS_CONFIG = {
    unsynced: { label: 'Unsynced', color: '#F97316', bg: '#FFF7ED' },
    synced: { label: 'Synced', color: '#10B981', bg: '#ECFDF5' },
}

const ReportItemComponent = ({ report, onPress }: { report: Report; onPress?: (report: Report) => void }) => {
    const incidentConfig = INCIDENT_COLORS[report.incidentType] || INCIDENT_COLORS[1]
    const severityConfig = SEVERITY_CONFIG[report.severity] || SEVERITY_CONFIG[1]

    // Use boolean 'synced' field directly
    const statusConfig = report.synced ? STATUS_CONFIG.synced : STATUS_CONFIG.unsynced

    // Format date
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date)
    }

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onPress?.(report)}
            activeOpacity={0.7}
        >
            <View style={styles.cardContent}>
                <View style={styles.cardMain}>
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: incidentConfig.bg }]}>
                        <Text style={[styles.iconText, { color: incidentConfig.text }]}>
                            {INCIDENT_ICONS[report.incidentType] || '📍'}
                        </Text>
                    </View>

                    {/* Content */}
                    <View style={styles.contentContainer}>
                        <Text style={styles.cardTitle}>{report.title}</Text>
                        <Text style={styles.cardDate}>{formatDate(report.createdAt)}</Text>

                        {/* Badges */}
                        <View style={styles.badgeRow}>
                            {/* Status Badge */}
                            <View style={[styles.badge, { backgroundColor: statusConfig.bg }]}>
                                <Text style={[styles.badgeText, { color: statusConfig.color }]}>
                                    {statusConfig.label}
                                </Text>
                            </View>

                            {/* Severity Badge */}
                            <View style={[styles.badge, styles.severityBadge, { backgroundColor: severityConfig.bg }]}>
                                {report.severity >= 4 && (
                                    <Text style={styles.severityIcon}>⚠️</Text>
                                )}
                                <Text style={[styles.badgeText, styles.badgeTextBold, { color: severityConfig.color }]}>
                                    {severityConfig.label}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

            </View>
        </TouchableOpacity >
    )
}

const ReportItem = withObservables(['report'], ({ report }) => ({
    report
}))(ReportItemComponent)

const ReportList: React.FC<ReportListProps> = ({ reports, onReportPress }) => {

    // Filter and group reports
    const { sections } = useMemo(() => {
        // Sort by date (newest first)
        const sorted = [...reports].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        // Group by recency
        const now = new Date()
        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

        const recent = sorted.filter(r => r.createdAt >= twoDaysAgo)
        const older = sorted.filter(r => r.createdAt < twoDaysAgo)

        const sectionList = []
        if (recent.length > 0) {
            sectionList.push({ title: 'Recent Activity', data: recent })
        }
        if (older.length > 0) {
            sectionList.push({ title: 'Older Reports', data: older })
        }

        return { sections: sectionList }
    }, [reports])

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>My Reports</Text>
                </View>
            </View>

            {/* Reports List */}
            {sections.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>📋</Text>
                    <Text style={styles.emptyTitle}>No Reports Yet</Text>
                    <Text style={styles.emptyText}>
                        Tap the + button to create your first incident report
                    </Text>
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <ReportItem report={item} onPress={onReportPress} />
                    )}
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
                            <View style={styles.sectionLine} />
                        </View>
                    )}
                    contentContainerStyle={styles.listContent}
                    stickySectionHeadersEnabled={false}
                />
            )}

        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F6F6',
    },

    // Header Styles
    header: {
        backgroundColor: '#fff',
        paddingTop: 48,
        paddingBottom: 8,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTop: {
        justifyContent: 'center',
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0F172A',
    },

    // Filter Chips
    filterContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    filterChipActive: {
        backgroundColor: '#0F172A',
        borderColor: '#0F172A',
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748B',
    },
    filterChipTextActive: {
        color: '#fff',
        fontWeight: '600',
    },

    // List Content
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },

    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },

    // Report Card
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardMain: {
        flexDirection: 'row',
        flex: 1,
        gap: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconText: {
        fontSize: 24,
    },
    contentContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 4,
    },
    cardDate: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 8,
    },

    // Badges
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    severityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '500',
    },
    badgeTextBold: {
        fontWeight: 'bold',
    },
    severityIcon: {
        fontSize: 10,
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingTop: 80,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
        opacity: 0.3,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
})

// Enhance with WatermelonDB observables
const enhance = withObservables(['userId'], ({ userId }: { userId: string }) => ({
    reports: database.get<Report>('reports').query(
        Q.where('user_id', userId),
        Q.sortBy('created_at', Q.desc)
    )
}))

export default enhance(ReportList)