import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView } from 'react-native'
import * as ImagePicker from 'expo-image-picker'

interface ImagePickerSectionProps {
    images: string[]
    onImagesChange: (images: string[]) => void
}

export default function ImagePickerSection({ images, onImagesChange }: ImagePickerSectionProps) {
    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.5, // Reduced quality for base64 performance
                base64: true,
            })

            if (!result.canceled && result.assets && result.assets.length > 0) {
                console.log('ImagePicker Result:', result)
                const asset = result.assets[0]
                if (asset.base64) {
                    const base64Img = `data:image/jpeg;base64,${asset.base64}`
                    console.log('Base64 Image Length:', base64Img.length)
                    // console.log('Base64 Image:', base64Img) // Uncomment if full string needed
                    onImagesChange([...images, base64Img])
                }
            }
        } catch (e) {
            Alert.alert('Error', 'Could not select image.')
        }
    }

    const removeImage = (uri: string) => {
        onImagesChange(images.filter(img => img !== uri))
    }

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Photos (Optional):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList}>
                {images.map((img, index) => (
                    <View key={index} style={styles.imageWrapper}>
                        <Image source={{ uri: img }} style={styles.image} />
                        <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(img)}>
                            <Text style={styles.removeBtnText}>X</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                <TouchableOpacity style={styles.addButton} onPress={pickImage}>
                    <Text style={styles.addText}>+ Add Photo</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { marginTop: 20, marginBottom: 10 },
    label: { fontWeight: '600', marginBottom: 10 },
    imageList: { flexDirection: 'row' },
    imageWrapper: { marginRight: 10, position: 'relative' },
    image: { width: 100, height: 100, borderRadius: 8, backgroundColor: '#eee' },
    removeBtn: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: 'red',
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1
    },
    removeBtnText: { color: 'white', fontWeight: 'bold', fontSize: 10 },
    addButton: {
        width: 100,
        height: 100,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fafafa'
    },
    addText: { color: '#666', fontSize: 12 }
})
