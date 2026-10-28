import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';

// ---- Configuration (loaded from .env) ----
const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const EMAILJS_SERVICE_ID = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY;

const CATEGORIES = [
  'Account Problem',
  'Technical Issue',
  'Payment Concern',
  'Other',
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function App() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState(null); // { uri, mimeType, fileName }
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');

  // ---- Image selection ----
  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          'Please allow access to your photos in Settings so you can attach a screenshot.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (result.canceled) {
        // User cancelled: keep whatever was selected before
        return;
      }

      setImage(result.assets[0]);
    } catch (err) {
      Alert.alert('Error', 'Could not open the gallery. Please try again.');
    }
  };

  const removeImage = () => setImage(null);

  // ---- Validation ----
  const validate = () => {
    if (!name.trim()) return 'Please enter your name.';
    if (!email.trim()) return 'Please enter your email address.';
    if (!EMAIL_REGEX.test(email.trim())) return 'Please enter a valid email address.';
    if (!category) return 'Please choose an issue category.';
    if (!message.trim()) return 'Please describe your issue.';
    if (!image) return 'Please attach a screenshot.';
    return null;
  };

  // ---- Cloudinary upload ----
     const uploadToCloudinary = async (asset) => {
     const mime = asset.mimeType || 'image/jpeg';
     const formData = new FormData();
     formData.append('file', `data:${mime};base64,${asset.base64}`);
     formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

     const response = await fetch(
       `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
       { method: 'POST', body: formData }
     );
     const data = await response.json();

     if (!response.ok || !data.secure_url) {
       throw new Error(data?.error?.message || 'Image upload failed.');
     }
     return data.secure_url;
   };

  // ---- EmailJS send (REST API) ----
  const sendEmail = async (imageUrl) => {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          name: name.trim(),
          reply_to: email.trim(),
          issue_category: category,
          message: message.trim(),
          image_url: imageUrl,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Email could not be sent.');
    }
  };

  // ---- Submit workflow ----
  const handleSubmit = async () => {
    if (loading) return; // prevent duplicate submissions

    const error = validate();
    if (error) {
      Alert.alert('Missing information', error);
      return;
    }

    setLoading(true);
    try {
      setStatusText('Uploading screenshot...');
      const imageUrl = await uploadToCloudinary(image); // must succeed first

      setStatusText('Sending your request...');
      await sendEmail(imageUrl);

      Alert.alert('Success', 'Your support request has been sent.');
      setName('');
      setEmail('');
      setCategory('');
      setMessage('');
      setImage(null);
    } catch (err) {
      // If the upload fails we never reach sendEmail
      Alert.alert('Something went wrong', err.message || 'Please try again.');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Customer Support</Text>
        <Text style={styles.subtitle}>Tell us what went wrong and attach a screenshot.</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your full name"
          value={name}
          onChangeText={setName}
          editable={!loading}
        />

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <Text style={styles.label}>Issue Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, category === c && styles.chipActive]}
              onPress={() => setCategory(c)}
              disabled={loading}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the problem..."
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          editable={!loading}
        />

        <Text style={styles.label}>Screenshot</Text>
        {image ? (
          <View style={styles.previewBox}>
            <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="contain" />
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={pickImage}
                disabled={loading}
              >
                <Text style={styles.secondaryBtnText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, styles.removeBtn]}
                onPress={removeImage}
                disabled={loading}
              >
                <Text style={[styles.secondaryBtnText, styles.removeText]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBtn} onPress={pickImage} disabled={loading}>
            <Text style={styles.uploadBtnText}>Upload Screenshot</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.submitText}>  {statusText}</Text>
            </View>
          ) : (
            <Text style={styles.submitText}>Submit</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f5f7fb' },
  container: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', color: '#1b2a49' },
  subtitle: { fontSize: 14, color: '#5c6b8a', marginBottom: 20, marginTop: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#1b2a49', marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d5dbe8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: { minHeight: 110 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d5dbe8',
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#2f5bea', borderColor: '#2f5bea' },
  chipText: { color: '#1b2a49', fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  uploadBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#2f5bea',
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#eef2ff',
  },
  uploadBtnText: { color: '#2f5bea', fontWeight: '600', fontSize: 15 },
  previewBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d5dbe8',
    padding: 10,
  },
  preview: { width: '100%', height: 220, borderRadius: 8 },
  previewActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#eef2ff',
  },
  secondaryBtnText: { color: '#2f5bea', fontWeight: '600' },
  removeBtn: { backgroundColor: '#fdecec' },
  removeText: { color: '#d33' },
  submitBtn: {
    marginTop: 26,
    backgroundColor: '#2f5bea',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
});