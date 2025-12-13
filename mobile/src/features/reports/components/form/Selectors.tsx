import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

export const INCIDENT_TYPES = [
    { label: 'Flooding', value: 1 },
    { label: 'Landslide', value: 2 },
    { label: 'Powerline', value: 3 },
    { label: 'Roadblock', value: 4 },
]

export const SEVERITY_LEVELS = [
    { label: 'Low', value: 1 },
    { label: 'Medium', value: 2 },
    { label: 'High', value: 3 },
    { label: 'Critical', value: 4 },
]

interface SelectorProps {
    value: number
    onChange: (val: number) => void
}

export const IncidentTypeSelector: React.FC<SelectorProps> = ({ value, onChange }) => (
    <View style={styles.selectorContainer}>
        <Text style={styles.label}>Incident Type:</Text>
        <View style={styles.buttonGroup}>
            {INCIDENT_TYPES.map(t => (
                <TouchableOpacity
                    key={t.value}
                    style={[styles.selectBtn, value === t.value && styles.selectBtnActive]}
                    onPress={() => onChange(t.value)}
                >
                    <Text style={[styles.selectBtnText, value === t.value && styles.selectBtnTextActive]}>{t.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
)

export const SeveritySelector: React.FC<SelectorProps> = ({ value, onChange }) => (
    <View style={styles.selectorContainer}>
        <Text style={styles.label}>Severity:</Text>
        <View style={styles.buttonGroup}>
            {SEVERITY_LEVELS.map(s => (
                <TouchableOpacity
                    key={s.value}
                    style={[styles.selectBtn, value === s.value && styles.selectBtnActive]}
                    onPress={() => onChange(s.value)}
                >
                    <Text style={[styles.selectBtnText, value === s.value && styles.selectBtnTextActive]}>{s.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
)

const styles = StyleSheet.create({
    selectorContainer: { marginBottom: 15 },
    label: { marginBottom: 5, fontWeight: '600' },
    buttonGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    selectBtn: { padding: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, backgroundColor: '#f0f0f0' },
    selectBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    selectBtnText: { fontSize: 12, color: '#333' },
    selectBtnTextActive: { color: '#fff' },
})
