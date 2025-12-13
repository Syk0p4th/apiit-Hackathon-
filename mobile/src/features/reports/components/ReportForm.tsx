import React, { useState } from 'react'
import { View, TextInput, Button, Text, StyleSheet } from 'react-native'
import database from '../../../services/database'
import 'react-native-get-random-values'
import Report from '../models/Report'

export default function ReportForm() {
    const [title, setTitle] = useState<string>('')
    const [description, setDescription] = useState<string>('')
    const [status, setStatus] = useState<string>('')

    const handleSave = async () => {
        if (!title || !description) return

        try {
            await database.write(async () => {
                const reportsCollection = database.get<Report>('reports')
                await reportsCollection.create(report => {
                    report.title = title
                    report.description = description
                    report.userId = 'current-user-id'
                })
            })
            setStatus('Saved Offline')
            setTitle('')
            setDescription('')

            setTimeout(() => setStatus(''), 3000)
        } catch (e) {
            console.error(e)
            setStatus('Error saving')
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.header}>New Report</Text>
            <TextInput
                placeholder="Title"
                value={title}
                onChangeText={setTitle}
                style={styles.input}
            />
            <TextInput
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
                style={styles.input}
            />
            <Button title="Save Report" onPress={handleSave} />
            {!!status && <Text style={styles.status}>{status}</Text>}
        </View>
    )
}

const styles = StyleSheet.create({
    container: { padding: 20 },
    header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 15 },
    status: { marginTop: 15, fontSize: 16, color: 'blue', textAlign: 'center' }
})
