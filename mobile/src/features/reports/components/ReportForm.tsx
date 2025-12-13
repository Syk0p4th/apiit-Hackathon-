import React, { useState } from 'react'
import { View, TextInput, Button, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native'
import { LeafletView } from 'react-native-leaflet-view'
import database from '../../../services/database'
import 'react-native-get-random-values'
import Report from '../models/Report'

interface ReportFormProps {
    userId: string
}

const INCIDENT_TYPES = [
    { label: 'Flooding', value: 1 },
    { label: 'Landslide', value: 2 },
    { label: 'Powerline', value: 3 },
    { label: 'Roadblock', value: 4 },
]

const SEVERITY_LEVELS = [
    { label: 'Low', value: 1 },
    { label: 'Medium', value: 2 },
    { label: 'High', value: 3 },
    { label: 'Critical', value: 4 },
]

export default function ReportForm({ userId }: ReportFormProps) {
    const [title, setTitle] = useState<string>('')
    const [description, setDescription] = useState<string>('')
    const [reporterName, setReporterName] = useState<string>('')
    const [incidentType, setIncidentType] = useState<number>(1)
    const [severity, setSeverity] = useState<number>(2)
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

    const [status, setStatus] = useState<string>('')

    const handleSave = async () => {
        if (!title || !description || !location) return

        try {
            await database.write(async () => {
                const reportsCollection = database.get<Report>('reports')
                await reportsCollection.create(report => {
                    report.title = title
                    report.description = description
                    report.reporterName = reporterName
                    report.incidentType = incidentType
                    report.severity = severity
                    report.incidentTime = new Date() // Default to now for incident time
                    report.userId = userId
                    report.latitude = location.lat
                    report.longitude = location.lng
                    report.createdAt = new Date()
                    report.synced = false
                })
            })
            setStatus('Saved Offline')
            // Reset form
            setTitle('')
            setDescription('')
            setReporterName('')
            setIncidentType(1)
            setSeverity(2)
            setLocation(null)

            setTimeout(() => setStatus(''), 3000)
        } catch (e) {
            console.error(e)
            setStatus('Error saving')
        }
    }

    // Simple Select Components
    const TypeSelector = () => (
        <View style={styles.selectorContainer}>
            <Text style={styles.label}>Incident Type:</Text>
            <View style={styles.buttonGroup}>
                {INCIDENT_TYPES.map(t => (
                    <TouchableOpacity
                        key={t.value}
                        style={[styles.selectBtn, incidentType === t.value && styles.selectBtnActive]}
                        onPress={() => setIncidentType(t.value)}
                    >
                        <Text style={[styles.selectBtnText, incidentType === t.value && styles.selectBtnTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    )

    const SeveritySelector = () => (
        <View style={styles.selectorContainer}>
            <Text style={styles.label}>Severity:</Text>
            <View style={styles.buttonGroup}>
                {SEVERITY_LEVELS.map(s => (
                    <TouchableOpacity
                        key={s.value}
                        style={[styles.selectBtn, severity === s.value && styles.selectBtnActive]}
                        onPress={() => setSeverity(s.value)}
                    >
                        <Text style={[styles.selectBtnText, severity === s.value && styles.selectBtnTextActive]}>{s.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    )

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>New Incident Report</Text>

            <TextInput
                placeholder="Incident Title"
                value={title}
                onChangeText={setTitle}
                style={styles.input}
            />
            <TextInput
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
                style={[styles.input, { height: 80 }]}
                multiline
            />
            <TextInput
                placeholder="Reporter Name (Optional)"
                value={reporterName}
                onChangeText={setReporterName}
                style={styles.input}
            />

            <TypeSelector />
            <SeveritySelector />

            <View style={styles.mapContainer}>
                <LeafletView
                    mapCenterPosition={{
                        lat: 6.9271,   // Colombo default
                        lng: 79.8612,
                    }}
                    zoom={13}
                    onMessageReceived={(event: any) => {
                        console.log('Leaflet Message:', event)
                        if (event.event === 'onMapClicked' && event.payload?.touchLatLng) {
                            const { lat, lng } = event.payload.touchLatLng
                            setLocation({ lat, lng })
                        }
                    }}
                    mapMarkers={
                        location
                            ? [
                                {
                                    id: 'selected-location',
                                    position: location,
                                    icon: '📍',
                                },
                            ]
                            : []
                    }
                />
            </View>

            <View style={{ marginTop: 20 }}>
                <Button title="Save Report" onPress={handleSave} />
            </View>
            {!!status && <Text style={styles.status}>{status}</Text>}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: { padding: 20 },
    header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 15, backgroundColor: '#fff' },
    mapContainer: {
        height: 250,
        marginBottom: 20,
        borderRadius: 10,
        overflow: 'hidden',
    },
    status: { marginTop: 15, fontSize: 16, color: 'blue', textAlign: 'center' },

    selectorContainer: { marginBottom: 15 },
    label: { marginBottom: 5, fontWeight: '600' },
    buttonGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    selectBtn: { padding: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, backgroundColor: '#f0f0f0' },
    selectBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    selectBtnText: { fontSize: 12, color: '#333' },
    selectBtnTextActive: { color: '#fff' }
})
