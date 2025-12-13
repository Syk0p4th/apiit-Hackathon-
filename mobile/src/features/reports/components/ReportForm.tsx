import React, { useState, useEffect } from 'react'
import { View, TextInput, Button, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native'
import { LeafletView } from 'react-native-leaflet-view'
import { WebView } from 'react-native-webview'
import * as Location from 'expo-location'
import database from '../../../services/database'
import 'react-native-get-random-values'
import Report from '../models/Report'

interface ReportFormProps {
    userId: string
}

const getMapHtml = (location: { lat: number; lng: number } | null) => `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map').setView([${location ? location.lat : 6.9271}, ${location ? location.lng : 79.8612}], 13);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        ${location ? `L.marker([${location.lat}, ${location.lng}]).addTo(map);` : ''}

        map.on('click', function(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'click',
                payload: { lat: e.latlng.lat, lng: e.latlng.lng }
            }));
            
            // Clear existing markers and add new one
            map.eachLayer(function (layer) {
                if (layer instanceof L.Marker) {
                    map.removeLayer(layer);
                }
            });
            L.marker(e.latlng).addTo(map);
        });
    </script>
</body>
</html>
`

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

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status !== 'granted') {
                return
            }

            const location = await Location.getCurrentPositionAsync({})
            setLocation({
                lat: location.coords.latitude,
                lng: location.coords.longitude,
            })
        })()
    }, [])

    const [status, setStatus] = useState<string>('')

    const handleSave = async () => {
        if (!title || !description) {
            setStatus('Title and Description are required')
            return
        }

        let finalLocation = location

        if (!finalLocation) {
            try {
                setStatus('Getting location...')
                const { status } = await Location.requestForegroundPermissionsAsync()
                if (status !== 'granted') {
                    setStatus('Permission to access location was denied')
                    return
                }

                const location = await Location.getCurrentPositionAsync({})
                finalLocation = {
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                }
            } catch (error) {
                console.error(error)
                setStatus('Error fetching location')
                return
            }
        }

        if (!finalLocation) {
            setStatus('Could not determine location')
            return
        }

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
                    report.latitude = finalLocation!.lat
                    report.longitude = finalLocation!.lng
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
                <WebView
                    originWhitelist={['*']}
                    source={{ html: getMapHtml(location) }}
                    onMessage={(event) => {
                        if (event.nativeEvent.data) {
                            try {
                                const data = JSON.parse(event.nativeEvent.data);
                                if (data.type === 'click') {
                                    setLocation(data.payload);
                                }
                            } catch (e) {
                                console.error('Map message error:', e);
                            }
                        }
                    }}
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
