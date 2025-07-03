import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);

// Upload image to Firebase Storage
export const uploadImageToFirebase = async (file, folder = 'incident-attachments') => {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;
    
    // Create storage reference
    const storageRef = ref(storage, `${folder}/${fileName}`);
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      success: true,
      url: downloadURL,
      fileName: fileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
      path: snapshot.ref.fullPath
    };
  } catch (error) {
    console.error('Error uploading image to Firebase:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete image from Firebase Storage
export const deleteImageFromFirebase = async (imagePath) => {
  try {
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting image from Firebase:', error);
    return { success: false, error: error.message };
  }
};

// Upload multiple images
export const uploadMultipleImages = async (files, folder = 'incident-attachments') => {
  const uploadPromises = files.map(file => uploadImageToFirebase(file, folder));
  const results = await Promise.all(uploadPromises);
  
  const successful = results.filter(result => result.success);
  const failed = results.filter(result => !result.success);
  
  return {
    successful,
    failed,
    totalUploaded: successful.length,
    totalFailed: failed.length
  };
};

export default app;