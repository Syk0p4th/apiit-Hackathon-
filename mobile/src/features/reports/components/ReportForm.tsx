import React, { useState, useEffect } from 'react'
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import * as Location from 'expo-location'
import database from '../../../services/database'
import { supabase } from '../../../services/api/supabase'
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
    const [address, setAddress] = useState<string>('')
    const [permissionStatus, setPermissionStatus] = useState<string>('')

    const [status, setStatus] = useState<string>('')

    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;

        (async () => {
            // Fetch User Details for Reporter Name
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.user_metadata?.full_name) {
                setReporterName(user.user_metadata.full_name)
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
        if (!title || !description) {
            setStatus('Title and Description are required')
            setTimeout(() => setStatus(''), 3000)
            return
        }

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
                    report.title = title
                    // Append address to description if available, since we don't have an address column yet
                    report.description = address ? `${description}\n\n[Location: ${address}]` : description
                    report.reporterName = reporterName
                    report.incidentType = incidentType
                    report.severity = severity
                    report.incidentTime = new Date()
                    report.userId = userId
                    report.latitude = finalLocation!.lat // We checked it's not null/undefined or returned
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
            // setLocation(null) 
            // setAddress('') // Keep address visible or clear? Let's clear to avoid stale info if they move significantly, but useEffect only runs once. 
            // Actually, if we clear, the next report won't have it unless we re-fetch.
            // Let's keep it for now.

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

            <View style={styles.locationContainer}>
                <Text style={styles.label}>GPS Location:</Text>
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
