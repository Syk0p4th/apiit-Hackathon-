import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native'
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
    { label: 'Flooding', value: 1, icon: '💧', color: '#3B82F6', description: 'Water levels rising' },
    { label: 'Landslide', value: 2, icon: '🏔️', color: '#78716C', description: 'Debris & Rockfall' },
    { label: 'Powerline', value: 3, icon: '⚡', color: '#EAB308', description: 'Live wires exposed' },
    { label: 'Roadblock', value: 4, icon: '🚧', color: '#F97316', description: 'Impassable route' },
]

const SEVERITY_LEVELS = [
    { label: 'Low', value: 1, color: '#10B981' },
    { label: 'Moderate', value: 2, color: '#84CC16' },
    { label: 'Elevated', value: 3, color: '#EAB308' },
    { label: 'High', value: 4, color: '#F97316' },
    { label: 'Critical', value: 5, color: '#DC2626' },
]

export default function ReportForm({ userId }: ReportFormProps) {
    const [reporterName, setReporterName] = useState<string>('')
    const [incidentType, setIncidentType] = useState<number | null>(null)
    const [severity, setSeverity] = useState<number | null>(null)

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

    // Animation for SOS button pulse
    const pulseAnim = useRef(new Animated.Value(1)).current

    useEffect(() => {
        if (incidentType !== null && severity !== null) {
            // Start pulse animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start()
        } else {
            pulseAnim.setValue(1)
        }
    }, [incidentType, severity])

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
                        distanceInterval: 5,
                        timeInterval: 2000
                    },
                    (newLoc) => {
                        setLocation({
                            lat: newLoc.coords.latitude,
                            lng: newLoc.coords.longitude,
                        })
                        setPermissionStatus('')
                        fetchAddress(newLoc.coords.latitude, newLoc.coords.longitude)
                    }
                )
            } catch (e) {
                console.log('Error watching location:', e)
                setPermissionStatus('GPS Signal Weak')
            }
        })()

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
        if (incidentType === null || severity === null) {
            setStatus('Please select incident type and severity')
            return
        }

        const computedTitle = computeTitle(incidentType)
        const computedDescription = buildDescription(incidentType, severity)

        let finalReporter = reporterName
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!finalReporter) {
                finalReporter = user?.user_metadata?.full_name || user?.email || 'Anonymous'
            }
        } catch (e) { }

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
                    report.description = address ? `${computedDescription}\n\n[Location: ${address}]` : computedDescription
                    report.reporterName = finalReporter
                    report.incidentType = incidentType
                    report.severity = severity
                    report.incidentTime = new Date()
                    report.userId = userId
                    report.latitude = finalLocation!.lat
                    report.longitude = finalLocation!.lng
                    report.images = images
                    report.createdAt = new Date()
                    report.synced = false
                })
            })

            setStatus('🚨 Emergency Report Sent!')

            if (isOnline) {
                setStatus('📡 Syncing with Emergency Services...')
                try {
                    await sync()
                    setStatus('✅ Report Delivered Successfully!')
                } catch (err) {
                    console.warn('Immediate sync failed:', err)
                    setStatus('📤 Report Saved (Sync Pending)')
                }
            } else {
                setStatus('💾 Saved Offline - Will Sync When Online')
            }

            // Reset form
            setIncidentType(null)
            setSeverity(null)
            setImages([])

            setTimeout(() => setStatus(''), 4000)
        } catch (e) {
            console.error(e)
            setStatus('❌ Error saving report')
        }
    }

    const TypeSelector = () => (
        <View style={styles.selectorContainer}>
            <Text style={styles.sectionTitle}>SPECIFY DISASTER TYPE</Text>
            <View style={styles.cardGrid}>
                {INCIDENT_TYPES.map(t => (
                    <TouchableOpacity
                        key={t.value}
                        style={[
                            styles.typeCard,
                            incidentType === t.value && { ...styles.typeCardActive, borderColor: t.color }
                        ]}
                        onPress={() => setIncidentType(t.value)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: t.color + '20' }]}>
                            <Text style={styles.iconText}>{t.icon}</Text>
                        </View>
                        <Text style={styles.typeLabel}>{t.label}</Text>
                        <Text style={styles.typeDescription}>{t.description}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    )

    const SeveritySelector = () => (
        <View style={styles.selectorContainer}>
            <View style={styles.severityHeader}>
                <Text style={styles.sectionTitle}>SEVERITY LEVEL</Text>
                <View style={styles.requiredBadge}>
                    <Text style={styles.requiredText}>REQUIRED</Text>
                </View>
            </View>
            <View style={styles.severityGrid}>
                {SEVERITY_LEVELS.map(s => (
                    <TouchableOpacity
                        key={s.value}
                        style={[
                            styles.severityButton,
                            severity === s.value && { ...styles.severityButtonActive, borderColor: s.color }
                        ]}
                        onPress={() => setSeverity(s.value)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.severityIndicator, { backgroundColor: s.color }]} />
                        <Text style={[
                            styles.severityNumber,
                            severity === s.value && { color: s.color }
                        ]}>{s.value}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={styles.severityLabels}>
                <Text style={styles.severityLabelText}>Low Risk</Text>
                <Text style={[styles.severityLabelText, styles.severityLabelCritical]}>Critical Risk</Text>
            </View>
        </View>
    )

    const { isConnected } = useNetInfo()
    const isOnline = isConnected === true

    const isFormValid = incidentType !== null && severity !== null

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.mainTitle}>Is there an emergency?</Text>
                <Text style={styles.subtitle}>Select severity level to activate SOS</Text>
            </View>

            {/* SOS Button */}
            <View style={styles.sosContainer}>
                <Animated.View style={[
                    styles.sosButtonWrapper,
                    { transform: [{ scale: pulseAnim }] }
                ]}>
                    <TouchableOpacity
                        style={[
                            styles.sosButton,
                            isFormValid && styles.sosButtonActive
                        ]}
                        onPress={handleSave}
                        disabled={!isFormValid}
                        activeOpacity={0.8}
                    >
                        <Text style={[
                            styles.sosIcon,
                            isFormValid && styles.sosIconActive
                        ]}>🚨</Text>
                        <Text style={[
                            styles.sosText,
                            isFormValid && styles.sosTextActive
                        ]}>SOS</Text>
                    </TouchableOpacity>
                </Animated.View>
                <Text style={styles.sosWarning}>
                    Emergency Services will be notified immediately
                </Text>
            </View>

            <TypeSelector />
            <SeveritySelector />

            <View style={styles.locationContainer}>
                <Text style={styles.sectionTitle}>
                    LOCATION {isOnline ? '(Online - Tap Map to Move)' : '(Offline - GPS Only)'}
                </Text>

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

                <Text style={styles.coordsLabel}>GPS Coordinates:</Text>
                {location ? (
                    <>
                        <Text style={styles.coords}>
                            📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                        </Text>
                        {!!address && <Text style={styles.address}>{address}</Text>}
                    </>
                ) : (
                    <Text style={[styles.coords, { color: '#F97316' }]}>
                        {permissionStatus ? permissionStatus : 'Acquiring Satellite/GPS...'}
                    </Text>
                )}
            </View>

            <ImagePickerSection images={images} onImagesChange={setImages} />

            {!!status && (
                <View style={styles.statusContainer}>
                    <Text style={styles.statusText}>{status}</Text>
                </View>
            )}

            <View style={styles.bottomSpacer} />
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    mainTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        color: '#1a1a1a',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },

    // SOS Button Styles
    sosContainer: {
        alignItems: 'center',
        marginVertical: 24,
    },
    sosButtonWrapper: {
        marginBottom: 12,
    },
    sosButton: {
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: '#E5E5E5',
        borderWidth: 6,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sosButtonActive: {
        backgroundColor: '#EA2A33',
        borderColor: '#EA2A33',
        shadowColor: '#EA2A33',
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 12,
    },
    sosIcon: {
        fontSize: 64,
        marginBottom: 8,
        opacity: 0.4,
    },
    sosIconActive: {
        opacity: 1,
    },
    sosText: {
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 4,
        color: '#999',
    },
    sosTextActive: {
        color: '#fff',
    },
    sosWarning: {
        fontSize: 11,
        color: '#666',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        overflow: 'hidden',
        fontWeight: '500',
    },

    // Section Styles
    selectorContainer: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1,
        color: '#666',
        marginBottom: 16,
    },

    // Type Card Styles
    cardGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    typeCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    typeCardActive: {
        borderWidth: 2,
        backgroundColor: '#F8F9FA',
        shadowOpacity: 0.15,
        elevation: 4,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    iconText: {
        fontSize: 24,
    },
    typeLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    typeDescription: {
        fontSize: 11,
        color: '#666',
    },

    // Severity Styles
    severityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    requiredBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
    },
    requiredText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#EA2A33',
        letterSpacing: 0.5,
    },
    severityGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    severityButton: {
        flex: 1,
        aspectRatio: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    severityButtonActive: {
        borderWidth: 2,
        backgroundColor: '#F8F9FA',
        shadowOpacity: 0.15,
        elevation: 3,
    },
    severityIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
    },
    severityNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#666',
    },
    severityLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingHorizontal: 4,
    },
    severityLabelText: {
        fontSize: 10,
        color: '#999',
    },
    severityLabelCritical: {
        fontWeight: 'bold',
        color: '#EA2A33',
    },

    // Location Styles
    locationContainer: {
        marginTop: 10,
        padding: 16,
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    mapContainer: {
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    coordsLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    coords: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    address: {
        fontSize: 13,
        color: '#3B82F6',
        fontStyle: 'italic',
        marginTop: 4,
    },

    // Status Styles
    statusContainer: {
        marginTop: 24,
        padding: 16,
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
    },
    statusText: {
        fontSize: 15,
        color: '#1E40AF',
        textAlign: 'center',
        fontWeight: '600',
    },

    bottomSpacer: {
        height: 40,
    },
})