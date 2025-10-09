import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type MealOption = 'Yes' | 'No';
type GoodiesOption = 'Yes' | 'No';
const API_ENDPOINT = 'https://ioittenet.com/api/attendance';

export default function AttendanceScanner() {
    const [id, setId] = useState('');
    const [meal, setMeal] = useState<MealOption>('No');
    const [goodies, setGoodies] = useState<GoodiesOption>('No');
    const [eventName, setEventName] = useState('Hackathon');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [attendanceData, setAttendanceData] = useState<{
        id: string;
        eventName: string;
        attendanceMarked: boolean;
        timestamp: string | null;
        meal: string;
        goodies: string;
    } | null>(null);

    const resetForm = () => {
        setId('');
        setMeal('No');
        setGoodies('No');
        setScanned(false);
        setAttendanceData(null);
    };

    const markAttendance = async (scannedId?: string) => {
        if (isSubmitting) return;
        const attendeeId = scannedId ?? id;
        if (!attendeeId.trim() || !eventName.trim()) {
            Alert.alert('Validation Error', 'Please provide both Attendee ID and Event Name');
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    timestamp: new Date().toISOString(),
                    id: attendeeId.trim(),
                    meal,
                    goodies,
                    eventName: eventName.trim(),
                }),
            });
            const result = await response.json();
            if (response.ok) {
                Alert.alert(
                    'Success',
                    result.message ?? `Attendance marked for ID: ${attendeeId}`,
                    [{ text: 'OK', onPress: resetForm }]
                );
            } else {
                const errorMessage =
                    result.message ??
                    (response.status === 404
                        ? 'ID not found or sheet does not exist'
                        : response.status === 409
                            ? 'Attendance already marked for this ID'
                            : 'Failed to mark attendance');
                Alert.alert('Error', errorMessage);
            }
        } catch (err) {
            console.error('Attendance submission error:', err);
            Alert.alert('Network Error', 'Please check your connection and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchAttendance = async (scannedId?: string) => {
        const attendeeId = scannedId ?? id;
        if (!attendeeId.trim() || !eventName.trim()) {
            Alert.alert('Validation Error', 'Please provide both Attendee ID and Event Name');
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await fetch(
                `${API_ENDPOINT}?id=${encodeURIComponent(attendeeId)}&eventName=${encodeURIComponent(eventName)}`
            );
            const text = await response.text();
            console.log('Raw response:', text);
            const result = text ? JSON.parse(text) : {};
            if (response.ok) {
                setAttendanceData(result.data);
                if (result.data.attendanceMarked) {
                    Alert.alert(
                        'Attendance Found',
                        `ID: ${result.data.id}\nMeal: ${result.data.meal}\nGoodies: ${result.data.goodies}`,
                        [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: 'Update', onPress: () => {
                                    setMeal(result.data.meal as MealOption);
                                    setGoodies(result.data.goodies as GoodiesOption);
                                }
                            },
                        ]
                    );
                } else {
                    Alert.alert(
                        'No Attendance Found',
                        `ID: ${result.data.id}\nMark attendance?`,
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Mark', onPress: () => markAttendance(attendeeId) },
                        ]
                    );
                }
            } else {
                Alert.alert('Error', result.message || 'Failed to fetch data');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            Alert.alert('Network Error', 'Please check your connection and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleManualSubmit = async () => {
        await markAttendance();
    };

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);
        setId(data.trim());
        setIsScanning(false);
        fetchAttendance(data.trim());
    };

    const startScanner = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert('Permission Required', 'Camera permission is required to scan QR codes');
                return;
            }
        }
        setScanned(false);
        setIsScanning(true);
    };

    const stopScanner = () => {
        setIsScanning(false);
        setScanned(false);
    };

    if (isScanning) {
        return (
            <View style={styles.scannerContainer}>
                <CameraView
                    style={styles.camera}
                    facing="back"
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                />
                <View style={styles.scannerOverlay}>
                    <View style={styles.scannerHeader}>
                        <Text style={styles.scannerTitle}>Point camera at QR code</Text>
                    </View>
                    <View style={styles.scannerFrame}>
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                    </View>
                    <View style={styles.scannerFooter}>
                        <TouchableOpacity style={styles.cancelButton} onPress={stopScanner} disabled={isSubmitting}>
                            <Text style={styles.cancelButtonText}>Cancel Scan</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ThemedView style={styles.content}>
                    <View style={styles.header}>
                    </View>
                    <TouchableOpacity
                        style={[styles.scanButton, isSubmitting && styles.buttonDisabled]}
                        onPress={startScanner}
                        disabled={isSubmitting}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.scanButtonText}>Scan QR Code</Text>
                    </TouchableOpacity>
                    {attendanceData && (
                        <View style={styles.dataCard}>
                            <ThemedText style={styles.dataTitle}>Attendance Data</ThemedText>
                            <ThemedText>ID: {attendanceData.id}</ThemedText>
                            <ThemedText>Event: {attendanceData.eventName}</ThemedText>
                            <ThemedText>Attendance: {attendanceData.attendanceMarked ? 'Marked' : 'Not Marked'}</ThemedText>
                            <ThemedText>Meal: {attendanceData.meal}</ThemedText>
                            <ThemedText>Goodies: {attendanceData.goodies}</ThemedText>
                        </View>
                    )}
                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Attendee ID *</Text>
                            <TextInput
                                style={styles.input}
                                value={id}
                                onChangeText={setId}
                                placeholder="e.g., A123"
                                placeholderTextColor="#6B7280"
                                editable={!isSubmitting}
                                autoCapitalize="characters"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Event Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={eventName}
                                onChangeText={setEventName}
                                placeholder="e.g., Hackathon"
                                placeholderTextColor="#6B7280"
                                editable={!isSubmitting}
                            />
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.label}>Meal</Text>
                                <View style={styles.pickerContainer}>
                                    <TouchableOpacity
                                        style={[styles.pickerButton, meal === 'No' && styles.pickerButtonActive]}
                                        onPress={() => setMeal('No')}
                                        disabled={isSubmitting}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.pickerButtonText, meal === 'No' && styles.pickerButtonTextActive]}>No</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.pickerButton, meal === 'Yes' && styles.pickerButtonActive]}
                                        onPress={() => setMeal('Yes')}
                                        disabled={isSubmitting}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.pickerButtonText, meal === 'Yes' && styles.pickerButtonTextActive]}>Yes</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={[styles.inputGroup, styles.halfWidth]}>
                                <Text style={styles.label}>Goodies</Text>
                                <View style={styles.pickerContainer}>
                                    <TouchableOpacity
                                        style={[styles.pickerButton, goodies === 'No' && styles.pickerButtonActive]}
                                        onPress={() => setGoodies('No')}
                                        disabled={isSubmitting}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.pickerButtonText, goodies === 'No' && styles.pickerButtonTextActive]}>No</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.pickerButton, goodies === 'Yes' && styles.pickerButtonActive]}
                                        onPress={() => setGoodies('Yes')}
                                        disabled={isSubmitting}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.pickerButtonText, goodies === 'Yes' && styles.pickerButtonTextActive]}>Yes</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                (isSubmitting || !id.trim() || !eventName.trim()) && styles.buttonDisabled,
                            ]}
                            onPress={handleManualSubmit}
                            disabled={isSubmitting || !id.trim() || !eventName.trim()}
                            activeOpacity={0.8}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>Mark Attendance</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.footer}>Fields marked with * are required</Text>
                </ThemedView>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1F2937' },
    scrollContent: { flexGrow: 1, justifyContent: 'center' },
    content: { flex: 1, padding: 20, paddingVertical: 150, maxWidth: 500, width: '100%', alignSelf: 'center' },
    header: { alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#F9FAFB', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
    scanButton: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
    scanButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    submitButton: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    buttonDisabled: { backgroundColor: '#60A5FA', opacity: 0.6 },
    dataCard: { backgroundColor: '#374151', padding: 16, borderRadius: 12, marginTop: 20 },
    dataTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#F9FAFB' },
    form: { gap: 20 },
    inputGroup: { gap: 8 },
    label: { fontSize: 14, fontWeight: '500', color: '#D1D5DB' },
    input: {
        borderWidth: 1,
        borderColor: '#374151',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#374151',
        color: '#F9FAFB',
    },
    row: { flexDirection: 'row', gap: 12 },
    halfWidth: { flex: 1 },
    pickerContainer: { flexDirection: 'row', gap: 8 },
    pickerButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#374151',
        backgroundColor: '#374151',
        alignItems: 'center',
    },
    pickerButtonActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    pickerButtonText: { fontSize: 16, color: '#D1D5DB' },
    pickerButtonTextActive: { color: '#fff', fontWeight: '600' },
    footer: { textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 16 },
    scannerContainer: {
        flex: 1,
        position: 'relative',
    },
    camera: {
        flex: 1,
    },
    scannerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'space-between',
    },
    scannerHeader: { padding: 20, alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 40 },
    scannerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
    scannerFrame: { alignSelf: 'center', width: 250, height: 250, position: 'relative' },
    corner: { position: 'absolute', width: 40, height: 40, borderColor: '#3B82F6' },
    topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
    topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
    bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
    bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
    scannerFooter: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
    cancelButton: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 12, alignItems: 'center' },
    cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
