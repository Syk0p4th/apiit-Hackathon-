import React, { useState, useEffect } from 'react'
import { View, Button, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import * as Location from 'expo-location'
import { WebView } from 'react-native-webview'
import { useNetInfo } from '@react-native-community/netinfo'
import database from '../../../services/database'
import { sync } from '../../../services/database/sync'
import { supabase } from '../../../services/api/supabase'
import 'react-native-get-random-values'
import Report from '../models/Report'

import ImagePickerSection from './form/ImagePickerSection'

interface ReportFormProps {
    userId: string | null
}

const getMapHtml = (location: { lat: number; lng: number } | null) => `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <style> body { margin: 0; padding: 0; } #map { width: 100%; height: 100vh; } </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map').setView([${location ? location.lat : 6.9271}, ${location ? location.lng : 79.8612}], 15);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);
        ${location ? `L.marker([${location.lat}, ${location.lng}]).addTo(map);` : ''}
        
        map.on('click', function(e) {
             window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'click',
                payload: { lat: e.latlng.lat, lng: e.latlng.lng }
            }));
            map.eachLayer(function (layer) { if (layer instanceof L.Marker) map.removeLayer(layer); });
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
    const [reporterName, setReporterName] = useState<string>('')
    const [incidentType, setIncidentType] = useState<number>(1)
    const [severity, setSeverity] = useState<number>(2)

    const getIncidentLabel = (val: number) => INCIDENT_TYPES.find(t => t.value === val)?.label || 'Incident'
    const getSeverityLabel = (val: number) => SEVERITY_LEVELS.find(s => s.value === val)?.label || 'Unknown'

    const DEFAULT_MESSAGES: { [key: number]: string } = {
        1: 'Flood waters rising; avoid flooded roads and low-lying areas.',
        2: 'Landslide activity reported; steer clear of unstable slopes.',
        3: 'Powerline hazard; maintain distance and report to authorities.',
        4: 'Roadblock; expect traffic delays and seek alternate routes.'
    }

    const buildDescription = (type: number, sev: number) => `${getSeverityLabel(sev)} - ${DEFAULT_MESSAGES[type] || ''}`

    const computeTitle = (type: number) => getIncidentLabel(type)
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [address, setAddress] = useState<string>('')
    const [permissionStatus, setPermissionStatus] = useState<string>('')
    const [images, setImages] = useState<string[]>([])

    const [status, setStatus] = useState<string>('')

    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;

        (async () => {
            // Fetch User Details for Reporter Name (fallback to email)
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setReporterName(user.user_metadata?.full_name || user.email || '')
            }

            // 1. Check if GPS is on
            const servicesEnabled = await Location.hasServicesEnabledAsync()
            if (!servicesEnabled) {
                setPermissionStatus('GPS is off. Enable Location Services.')
                return
            }

            // 2. Check Permissions
            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status !== 'granted') {
                setPermissionStatus('Permission denied')
                return
            }

            setPermissionStatus('Locating...')

            try {
                // 3. Start watching position (Real-time)
                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        distanceInterval: 5, // Update every 5 meters
                        timeInterval: 2000   // Minimum time interval of 2 seconds
                    },
                    (newLoc) => {
                        setLocation({
                            lat: newLoc.coords.latitude,
                            lng: newLoc.coords.longitude,
                        })
                        setPermissionStatus('')
                        // Optional: Debounce this if needed, but for now we update address on move
                        fetchAddress(newLoc.coords.latitude, newLoc.coords.longitude)
                    }
                )
            } catch (e) {
                console.log('Error watching location:', e)
                setPermissionStatus('GPS Signal Weak')
            }
        })()

        // Cleanup subscription on unmount
        return () => {
            if (subscription) {
                subscription.remove()
            }
        }
    }, [])

    const fetchAddress = async (lat: number, lng: number) => {
        try {
            const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
            if (geocode.length > 0) {
                const addr = geocode[0]
                const addressString = `${addr.street || ''} ${addr.city || ''}, ${addr.region || ''}`
                setAddress(addressString.trim())
            }
        } catch (e) { }
    }

    const handleSave = async () => {
        // Compute title and description from incident type and severity
        const computedTitle = computeTitle(incidentType)
        const computedDescription = buildDescription(incidentType, severity)

        // Ensure we have a reporter name (fallback to user email)
        let finalReporter = reporterName
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!finalReporter) {
                finalReporter = user?.user_metadata?.full_name || user?.email || 'Anonymous'
            }
        } catch (e) { }

        // Note: Title/Description are computed; no manual input enforcement


        let finalLocation = location

        if (!finalLocation) {
            try {
                setStatus('Getting location...')

                const servicesEnabled = await Location.hasServicesEnabledAsync()
                if (!servicesEnabled) {
                    setStatus('Please enable GPS')
                    return
                }

                const { status } = await Location.requestForegroundPermissionsAsync()
                if (status !== 'granted') {
                    setStatus('Permission denied')
                    return
                }

                let loc = await Location.getLastKnownPositionAsync({})
                if (!loc) {
                    loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
                }

                if (loc) {
                    finalLocation = {
                        lat: loc.coords.latitude,
                        lng: loc.coords.longitude,
                    }
                    setLocation(finalLocation)
                    fetchAddress(finalLocation.lat, finalLocation.lng)
                } else {
                    setStatus('Could not lock GPS')
                    return
                }
            } catch (error) {
                console.error(error)
                setStatus('Could not get GPS location')
                return
            }
        }

        try {
            await database.write(async () => {
                const reportsCollection = database.get<Report>('reports')
                await reportsCollection.create(report => {
                    report.title = computedTitle
                    // Append address to description if available, since we don't have an address column yet
                    report.description = address ? `${computedDescription}\n\n[Location: ${address}]` : computedDescription
                    report.reporterName = finalReporter
                    report.incidentType = incidentType
                    report.severity = severity
                    report.incidentTime = new Date()
                    report.userId = userId
                    report.latitude = finalLocation!.lat // We checked it's not null/undefined or returned
                    report.longitude = finalLocation!.lng
                    report.images = images
                    report.createdAt = new Date()
                    report.synced = false
                })
            })

            setStatus('Saved Locally')

            if (isOnline) {
                setStatus('Syncing...')
                try {
                    await sync()
                    setStatus('Saved & Synced! ☁️')
                } catch (err) {
                    console.warn('Immediate sync failed:', err)
                    setStatus('Saved (Sync Pending) ⏳')
                }
            } else {
                setStatus('Saved Offline 📡')
            }

            // Reset form (keep reporterName)
            setIncidentType(1)
            setSeverity(2)
            setImages([])
            // setLocation(null) 
            // setAddress('') 

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

    const { isConnected } = useNetInfo()
    const isOnline = isConnected === true

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>New Incident Report</Text>


            <TypeSelector />
            <SeveritySelector />



            <View style={styles.locationContainer}>
                <Text style={styles.label}>Location ({isOnline ? 'Online - Tap Map to Move' : 'Offline - GPS Only'}):</Text>

                {isOnline && (
                    <View style={styles.mapContainer}>
                        <WebView
                            originWhitelist={['*']}
                            source={{ html: getMapHtml(location) }}
                            onMessage={(event) => {
                                if (event.nativeEvent.data) {
                                    try {
                                        const data = JSON.parse(event.nativeEvent.data);
                                        if (data.type === 'click') {
                                            const newLoc = { lat: data.payload.lat, lng: data.payload.lng }
                                            setLocation(newLoc)
                                            fetchAddress(newLoc.lat, newLoc.lng)
                                        }
                                    } catch (e) { }
                                }
                            }}
                        />
                    </View>
                )}

                <Text style={styles.label}>GPS Coordinates:</Text>
                {location ? (
                    <>
                        <Text style={styles.coords}>
                            Lat: {location.lat.toFixed(5)}, Lng: {location.lng.toFixed(5)}
                        </Text>
                        {!!address && <Text style={styles.address}>📍 {address}</Text>}
                    </>
                ) : (
                    <Text style={[styles.coords, { color: 'orange' }]}>
                        {permissionStatus ? permissionStatus : 'Acquiring Satellite/GPS...'}
                    </Text>
                )}
            </View>

            <ImagePickerSection images={images} onImagesChange={setImages} />

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
    status: { marginTop: 15, fontSize: 16, color: 'blue', textAlign: 'center' },

    selectorContainer: { marginBottom: 15 },
    label: { marginBottom: 5, fontWeight: '600' },
    buttonGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    selectBtn: { padding: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, backgroundColor: '#f0f0f0' },
    selectBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    selectBtnText: { fontSize: 12, color: '#333' },
    selectBtnTextActive: { color: '#fff' },

    locationContainer: {
        marginTop: 10,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#eee'
    },
    mapContainer: {
        height: 200,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 10
    },
    coords: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 2
    },
    address: {
        fontSize: 14,
        color: '#007AFF',
        marginTop: 4,
        fontStyle: 'italic'
    },
})
