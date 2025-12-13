import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import * as Location from 'expo-location'
import { useNetInfo } from '@react-native-community/netinfo'

interface LocationPickerProps {
    location: { lat: number; lng: number } | null
    address: string
    onLocationUpdate: (loc: { lat: number; lng: number }, addr?: string) => void
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

export default function LocationPicker({ location, address, onLocationUpdate }: LocationPickerProps) {
    const netInfo = useNetInfo()
    const [permissionStatus, setPermissionStatus] = useState<string>('')

    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;

        (async () => {
            const servicesEnabled = await Location.hasServicesEnabledAsync()
            if (!servicesEnabled) { setPermissionStatus('GPS is off. Enable Location Services.'); return }

            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status !== 'granted') { setPermissionStatus('Permission denied'); return }

            setPermissionStatus('Locating...')

            try {
                subscription = await Location.watchPositionAsync(
                    { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 2000 },
                    (newLoc) => {
                        handleNewLocation(newLoc.coords.latitude, newLoc.coords.longitude)
                        setPermissionStatus('')
                    }
                )
            } catch (e) {
                console.log('Error watching location:', e)
                setPermissionStatus('GPS Signal Weak')
            }
        })()

        return () => { if (subscription) subscription.remove() }
    }, [])

    const handleNewLocation = async (lat: number, lng: number) => {
        // Trigger generic update first (optimistic)
        onLocationUpdate({ lat, lng })

        // Then reverse geocode
        try {
            const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
            if (geocode.length > 0) {
                const addr = geocode[0]
                const addressStr = `${addr.street || ''} ${addr.city || ''}, ${addr.region || ''}`.trim()
                onLocationUpdate({ lat, lng }, addressStr)
            }
        } catch (e) { }
    }

    return (
        <View style={styles.locationContainer}>
            <Text style={styles.label}>Location ({netInfo.isConnected ? 'Online' : 'Offline Mode'}):</Text>

            {netInfo.isConnected ? (
                <View style={styles.mapContainer}>
                    <WebView
                        originWhitelist={['*']}
                        source={{ html: getMapHtml(location) }}
                        onMessage={(event) => {
                            if (event.nativeEvent.data) {
                                try {
                                    const data = JSON.parse(event.nativeEvent.data);
                                    if (data.type === 'click') {
                                        handleNewLocation(data.payload.lat, data.payload.lng)
                                    }
                                } catch (e) { }
                            }
                        }}
                    />
                </View>
            ) : (
                <View style={styles.offlineBox}>
                    <Text style={styles.offlineText}>📡 Offline - Using GPS Sensors</Text>
                    {permissionStatus ? <Text style={{ color: 'red' }}>{permissionStatus}</Text> : null}
                </View>
            )}

            {location && (
                <View style={styles.coordsBox}>
                    <Text style={styles.coords}>Lat: {location.lat.toFixed(5)}, Lng: {location.lng.toFixed(5)}</Text>
                    {!!address && <Text style={styles.address}>📍 {address}</Text>}
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    label: { marginBottom: 5, fontWeight: '600' },
    locationContainer: { marginTop: 10, marginBottom: 20 },
    mapContainer: { height: 200, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd', marginTop: 5 },
    offlineBox: { padding: 20, backgroundColor: '#eee', borderRadius: 10, alignItems: 'center', marginTop: 5 },
    offlineText: { fontSize: 16, fontWeight: 'bold', color: '#555' },
    coordsBox: { marginTop: 10, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 5, borderWidth: 1, borderColor: '#eee' },
    coords: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    address: { fontSize: 14, color: '#007AFF', marginTop: 4, fontStyle: 'italic' }
})
