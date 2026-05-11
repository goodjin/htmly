/**
 * Cloud Upload Composable
 * 
 * Handles image uploads to cloud storage providers (ImgBB, Cloudinary, S3).
 * Falls back to base64 encoding when no cloud storage is configured.
 */

import { ref, computed } from 'vue';
import type { CloudStorageConfig, CloudStorageProvider } from '../../../src/shared/types';

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadProgress {
  status: UploadStatus;
  progress: number; // 0-100
  message?: string;
  error?: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Upload state
const uploadState = ref<UploadProgress>({
  status: 'idle',
  progress: 0,
});

// Track if there's an active upload
const isUploading = computed(() => uploadState.value.status === 'uploading');

/**
 * Convert a File to a base64 data URL
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a base64 data URL to a Blob
 */
function base64ToBlob(base64: string): { blob: Blob; mimeType: string } {
  // Remove the data URL prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  const mimeTypeMatch = base64.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';
  
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  
  return { blob, mimeType };
}

/**
 * Upload to ImgBB
 */
async function uploadToImgBB(
  file: File | Blob,
  apiKey: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const formData = new FormData();
  
  // For File objects
  if (file instanceof File) {
    formData.append('image', file);
  } else {
    // Convert Blob to base64 for FormData
    const base64 = await blobToBase64(file);
    formData.append('image', base64);
  }
  
  try {
    // Use XMLHttpRequest for progress tracking
    const result = await new Promise<UploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.data?.url) {
              resolve({ success: true, url: response.data.url });
            } else {
              resolve({ success: false, error: response.error?.message || 'Upload failed' });
            }
          } catch {
            resolve({ success: false, error: 'Invalid response from ImgBB' });
          }
        } else {
          resolve({ success: false, error: `HTTP ${xhr.status}: ${xhr.statusText}` });
        }
      };
      
      xhr.onerror = () => resolve({ success: false, error: 'Network error' });
      xhr.ontimeout = () => resolve({ success: false, error: 'Request timed out' });
      
      xhr.open('POST', 'https://api.imgbb.com/1/upload');
      xhr.setRequestHeader('Authorization', `Client-ID ${apiKey.substring(0, 8)}...`);
      xhr.timeout = 60000; // 60 second timeout
      xhr.send(formData);
    });
    
    return result;
  } catch (error) {
    return { success: false, error: `ImgBB upload failed: ${error}` };
  }
}

/**
 * Convert Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload to Cloudinary
 */
async function uploadToCloudinary(
  file: File | Blob,
  cloudName: string,
  apiKey: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  // Cloudinary requires a signature for secure uploads
  // For simplicity, we'll use their unsigned upload endpoint
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'htmly_unsigned'); // User needs to configure this or use signed uploads
  
  try {
    const result = await new Promise<UploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.secure_url) {
              resolve({ success: true, url: response.secure_url });
            } else {
              resolve({ success: false, error: response.error?.message || 'Upload failed' });
            }
          } catch {
            resolve({ success: false, error: 'Invalid response from Cloudinary' });
          }
        } else {
          resolve({ success: false, error: `HTTP ${xhr.status}: ${xhr.statusText}` });
        }
      };
      
      xhr.onerror = () => resolve({ success: false, error: 'Network error' });
      xhr.ontimeout = () => resolve({ success: false, error: 'Request timed out' });
      
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      xhr.open('POST', uploadUrl);
      xhr.timeout = 60000;
      xhr.send(formData);
    });
    
    return result;
  } catch (error) {
    return { success: false, error: `Cloudinary upload failed: ${error}` };
  }
}

/**
 * Main upload function that routes to the appropriate provider
 */
async function uploadImage(
  file: File,
  config: CloudStorageConfig
): Promise<UploadResult> {
  const { provider, imgbb, cloudinary, s3 } = config;
  
  // Update state to uploading
  uploadState.value = {
    status: 'uploading',
    progress: 0,
    message: 'Starting upload...',
  };
  
  try {
    switch (provider) {
      case 'imgbb':
        if (!imgbb.apiKey) {
          // Fall back to base64 if no API key configured
          const base64 = await fileToBase64(file);
          uploadState.value = { status: 'success', progress: 100 };
          return { success: true, url: base64 };
        }
        
        uploadState.value = { status: 'uploading', progress: 10, message: 'Uploading to ImgBB...' };
        const imgbbResult = await uploadToImgBB(file, imgbb.apiKey, (progress) => {
          uploadState.value = { status: 'uploading', progress: 10 + Math.round(progress * 0.8), message: 'Uploading...' };
        });
        
        if (imgbbResult.success && imgbbResult.url) {
          uploadState.value = { status: 'success', progress: 100 };
          return imgbbResult;
        } else {
          uploadState.value = { status: 'error', progress: 0, error: imgbbResult.error };
          return imgbbResult;
        }
        
      case 'cloudinary':
        if (!cloudinary.cloudName || !cloudinary.apiKey) {
          // Fall back to base64 if not configured
          const base64 = await fileToBase64(file);
          uploadState.value = { status: 'success', progress: 100 };
          return { success: true, url: base64 };
        }
        
        uploadState.value = { status: 'uploading', progress: 10, message: 'Uploading to Cloudinary...' };
        const cloudinaryResult = await uploadToCloudinary(file, cloudinary.cloudName, cloudinary.apiKey, (progress) => {
          uploadState.value = { status: 'uploading', progress: 10 + Math.round(progress * 0.8), message: 'Uploading...' };
        });
        
        if (cloudinaryResult.success && cloudinaryResult.url) {
          uploadState.value = { status: 'success', progress: 100 };
          return cloudinaryResult;
        } else {
          uploadState.value = { status: 'error', progress: 0, error: cloudinaryResult.error };
          return cloudinaryResult;
        }
        
      case 's3':
        // S3 requires server-side signing for secure uploads
        // For now, fall back to base64 with a message about S3 configuration
        const base64S3 = await fileToBase64(file);
        uploadState.value = { 
          status: 'error', 
          progress: 0, 
          error: 'S3 upload requires server-side configuration. Image saved as base64.' 
        };
        return { success: true, url: base64S3 };
        
      case 'none':
      default:
        // No cloud storage configured - use base64
        uploadState.value = { status: 'uploading', progress: 50, message: 'Converting to base64...' };
        const base64 = await fileToBase64(file);
        uploadState.value = { status: 'success', progress: 100 };
        return { success: true, url: base64 };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    uploadState.value = { status: 'error', progress: 0, error: errorMessage };
    return { success: false, error: errorMessage };
  }
}

/**
 * Reset upload state to idle
 */
function resetUploadState(): void {
  uploadState.value = {
    status: 'idle',
    progress: 0,
  };
}

/**
 * Check if a provider is properly configured
 */
function isProviderConfigured(provider: CloudStorageProvider, config: CloudStorageConfig): boolean {
  switch (provider) {
    case 'imgbb':
      return !!config.imgbb.apiKey;
    case 'cloudinary':
      return !!config.cloudinary.cloudName && !!config.cloudinary.apiKey;
    case 's3':
      return !!config.s3.accessKeyId && !!config.s3.secretAccessKey && !!config.s3.bucket;
    case 'none':
    default:
      return true; // base64 is always available
  }
}

/**
 * Get provider display name
 */
function getProviderDisplayName(provider: CloudStorageProvider): string {
  switch (provider) {
    case 'imgbb':
      return 'ImgBB';
    case 'cloudinary':
      return 'Cloudinary';
    case 's3':
      return 'AWS S3';
    case 'none':
    default:
      return 'Base64';
  }
}

export function useCloudUpload() {
  return {
    uploadState,
    isUploading,
    uploadImage,
    resetUploadState,
    isProviderConfigured,
    getProviderDisplayName,
    fileToBase64,
  };
}
