import React, { useState } from 'react'
import { TextInput, Button, Text, StyleSheet, ScrollView } from 'react-native'
import * as Location from 'expo-location'
import database from '../../../services/database'
import 'react-native-get-random-values'
import Report from '../models/Report'

// Components
import { IncidentTypeSelector, SeveritySelector } from './form/Selectors'
import LocationPicker from './form/LocationPicker'
import ImagePickerSection from './form/ImagePickerSection'

interface ReportFormProps {
    userId: string
}

export default function ReportForm({ userId }: ReportFormProps) {
    const [title, setTitle] = useState<string>('')
    const [description, setDescription] = useState<string>('')
    const [reporterName, setReporterName] = useState<string>('')

    const [incidentType, setIncidentType] = useState<number>(1)
    const [severity, setSeverity] = useState<number>(2)

    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [address, setAddress] = useState<string>('')
    const [images, setImages] = useState<string[]>([])
    const [status, setStatus] = useState<string>('')

    const handleLocationUpdate = (loc: { lat: number; lng: number }, addr?: string) => {
        setLocation(loc)
        if (addr) setAddress(addr)
    }

    const handleSave = async () => {
        if (!title || !description) { setStatus('Title and Description Required'); return }

        let finalLocation = location
        // Fallback if no location yet
        if (!finalLocation) {
            try {
                const loc = await Location.getCurrentPositionAsync({})
                finalLocation = { lat: loc.coords.latitude, lng: loc.coords.longitude }
            } catch (e) { }
        }

        try {
            await database.write(async () => {
                const reportsCollection = database.get<Report>('reports')
                await reportsCollection.create(report => {
                    report.title = title
                    report.description = address ? `${description}\n\n[Location: ${address}]` : description
                    report.reporterName = reporterName
                    report.incidentType = incidentType
                    report.severity = severity
                    report.incidentTime = new Date()
                    report.userId = userId
                    report.latitude = finalLocation?.lat || 0
                    report.longitude = finalLocation?.lng || 0
                    report.images = images
                    report.createdAt = new Date()
                    report.synced = false
                })
            })
            setStatus('Saved Offline')
            // Reset
            setTitle(''); setDescription(''); setReporterName('')
            setIncidentType(1); setSeverity(2); setImages([])
            // We keep location to continue tracking user path

            setTimeout(() => setStatus(''), 3000)
        } catch (e) { setStatus('Error Saving'); console.error(e) }
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>New Incident Report</Text>

            <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} />
            <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={[styles.input, { height: 80 }]} multiline />
            <TextInput placeholder="Reporter Name" value={reporterName} onChangeText={setReporterName} style={styles.input} />

            <IncidentTypeSelector value={incidentType} onChange={setIncidentType} />
            <SeveritySelector value={severity} onChange={setSeverity} />

            <LocationPicker
                location={location}
                address={address}
                onLocationUpdate={handleLocationUpdate}
            />

            <ImagePickerSection images={images} onImagesChange={setImages} />

            <Button title="Save Report" onPress={handleSave} />
            {!!status && <Text style={styles.status}>{status}</Text>}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: { padding: 20 },
    header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 15, backgroundColor: '#fff' },
    status: { marginTop: 15, fontSize: 16, color: 'blue', textAlign: 'center' },
})
