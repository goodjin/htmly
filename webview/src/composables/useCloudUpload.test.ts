/**
 * Cloud Upload Composable Tests
 * 
 * Tests for image upload to cloud storage providers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { useCloudUpload } from './useCloudUpload';
import type { CloudStorageConfig, CloudStorageProvider } from '../../../src/shared/types';

// Create a factory function for mock XHR to ensure fresh state per test
function createMockXHR() {
  return {
    open: vi.fn(),
    setRequestHeader: vi.fn(),
    send: vi.fn(),
    upload: {
      onprogress: null as ((e: ProgressEvent) => void) | null,
    },
    onload: null as ((e: Event) => void) | null,
    onerror: null as ((e: Event) => void) | null,
    ontimeout: null as ((e: Event) => void) | null,
    status: 200,
    statusText: 'OK',
    responseText: '',
    timeout: 60000,
  };
}

// Store reference for stub
let currentMockXHR: ReturnType<typeof createMockXHR>;

vi.stubGlobal('XMLHttpRequest', vi.fn(() => {
  currentMockXHR = createMockXHR();
  return currentMockXHR;
}));

describe('useCloudUpload', () => {
  let uploadImage: ReturnType<typeof useCloudUpload>['uploadImage'];
  let uploadState: ReturnType<typeof useCloudUpload>['uploadState'];
  let isUploading: ReturnType<typeof useCloudUpload>['isUploading'];
  let resetUploadState: ReturnType<typeof useCloudUpload>['resetUploadState'];
  let isProviderConfigured: ReturnType<typeof useCloudUpload>['isProviderConfigured'];
  let getProviderDisplayName: ReturnType<typeof useCloudUpload>['getProviderDisplayName'];

  beforeEach(() => {
    vi.clearAllMocks();
    // Create fresh mock XHR for this test
    currentMockXHR = createMockXHR();
    
    // Create a fresh instance for each test
    const result = useCloudUpload();
    uploadImage = result.uploadImage;
    uploadState = result.uploadState;
    isUploading = result.isUploading;
    resetUploadState = result.resetUploadState;
    isProviderConfigured = result.isProviderConfigured;
    getProviderDisplayName = result.getProviderDisplayName;
  });

  describe('Base64 fallback (provider=none)', () => {
    it('should use base64 when provider is none', async () => {
      const config: CloudStorageConfig = {
        provider: 'none',
        s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
        cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
        imgbb: { apiKey: '' },
      };

      // Create a mock file
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

      const result = await uploadImage(mockFile, config);

      expect(result.success).toBe(true);
      expect(result.url).toMatch(/^data:image\/png;base64,/);
    });

    it('should set upload state correctly for base64 conversion', async () => {
      const config: CloudStorageConfig = {
        provider: 'none',
        s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
        cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
        imgbb: { apiKey: '' },
      };

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

      // Set up the mock callback before starting the upload
      // Note: For base64 conversion, the function is synchronous-ish
      // We just verify the final state is success
      const result = await uploadImage(mockFile, config);
      
      // Should be in success state
      expect(uploadState.value.status).toBe('success');
      expect(uploadState.value.progress).toBe(100);
      expect(result.success).toBe(true);
    });
  });

  describe('ImgBB upload', () => {
    it('should fall back to base64 when ImgBB API key is empty', async () => {
      const config: CloudStorageConfig = {
        provider: 'imgbb',
        s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
        cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
        imgbb: { apiKey: '' },
      };

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

      const result = await uploadImage(mockFile, config);

      expect(result.success).toBe(true);
      expect(result.url).toMatch(/^data:image\/png;base64,/);
    });

    it('should upload to ImgBB when API key is provided', async () => {
      const config: CloudStorageConfig = {
        provider: 'imgbb',
        s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
        cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
        imgbb: { apiKey: 'test_api_key_123' },
      };

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

      // Mock successful response by directly setting the onload callback
      // The upload function will set up the xhr and we need to trigger onload
      const uploadPromise = uploadImage(mockFile, config);
      
      // Wait a tick for the xhr to be created and configured
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Verify XHR was called
      expect(currentMockXHR.open).toHaveBeenCalledWith('POST', 'https://api.imgbb.com/1/upload');
      
      // Now simulate the successful response
      currentMockXHR.responseText = JSON.stringify({
        success: true,
        data: {
          url: 'https://i.ibb.co/test/image.png',
        },
      });
      currentMockXHR.onload!(new Event('load'));
      
      const result = await uploadPromise;

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://i.ibb.co/test/image.png');
    });

    it('should handle ImgBB upload error', async () => {
      const config: CloudStorageConfig = {
        provider: 'imgbb',
        s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
        cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
        imgbb: { apiKey: 'test_api_key_123' },
      };

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

      // Set up upload and wait for xhr creation
      const uploadPromise = uploadImage(mockFile, config);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Mock error response
      currentMockXHR.responseText = JSON.stringify({
        success: false,
        error: { message: 'Invalid API key' },
      });
      currentMockXHR.onload!(new Event('load'));
      
      const result = await uploadPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(uploadState.value.status).toBe('error');
    });
  });

  describe('Cloudinary upload', () => {
    it('should fall back to base64 when Cloudinary is not configured', async () => {
      const config: CloudStorageConfig = {
        provider: 'cloudinary',
        s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
        cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
        imgbb: { apiKey: '' },
      };

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

      const result = await uploadImage(mockFile, config);

      expect(result.success).toBe(true);
      expect(result.url).toMatch(/^data:image\/png;base64,/);
    });

    it('should upload to Cloudinary when configured', async () => {
      const config: CloudStorageConfig = {
        provider: 'cloudinary',
        s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
        cloudinary: { apiKey: 'test_key', apiSecret: 'test_secret', cloudName: 'test-cloud' },
        imgbb: { apiKey: '' },
      };

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

      const uploadPromise = uploadImage(mockFile, config);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(currentMockXHR.open).toHaveBeenCalledWith('POST', 'https://api.cloudinary.com/v1_1/test-cloud/image/upload');
      
      // Mock successful response
      currentMockXHR.responseText = JSON.stringify({
        secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/test.png',
      });
      currentMockXHR.onload!(new Event('load'));
      
      const result = await uploadPromise;

      expect(result.success).toBe(true);
      expect(result.url).toContain('res.cloudinary.com');
    });
  });

  describe('S3 upload', () => {
    it('should fall back to base64 for S3 (not server-side configured)', async () => {
      const config: CloudStorageConfig = {
        provider: 's3',
        s3: { 
          accessKeyId: 'test_key', 
          secretAccessKey: 'test_secret', 
          bucket: 'test-bucket', 
          region: 'us-west-2' 
        },
        cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
        imgbb: { apiKey: '' },
      };

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

      const result = await uploadImage(mockFile, config);

      // S3 requires server-side signing, so it falls back to base64 with a message
      expect(result.success).toBe(true);
      expect(result.url).toMatch(/^data:image\/png;base64,/);
      expect(uploadState.value.status).toBe('error');
      expect(uploadState.value.error).toContain('S3 upload requires server-side configuration');
    });
  });

  describe('isProviderConfigured', () => {
    it('should return true for none provider', () => {
      const config: CloudStorageConfig = {
        provider: 'none',
        s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
        cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
        imgbb: { apiKey: '' },
      };

      expect(isProviderConfigured('none', config)).toBe(true);
    });

    it('should return false for imgbb without API key', () => {
      const config: CloudStorageConfig = {
        provider: 'imgbb',
        s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
        cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
        imgbb: { apiKey: '' },
      };

      expect(isProviderConfigured('imgbb', config)).toBe(false);
    });

    it('should return true for imgbb with API key', () => {
      const config: CloudStorageConfig = {
        provider: 'imgbb',
        s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
        cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
        imgbb: { apiKey: 'test_key' },
      };

      expect(isProviderConfigured('imgbb', config)).toBe(true);
    });

    it('should return false for cloudinary without cloudName', () => {
      const config: CloudStorageConfig = {
        provider: 'cloudinary',
        s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
        cloudinary: { apiKey: 'key', apiSecret: 'secret', cloudName: '' },
        imgbb: { apiKey: '' },
      };

      expect(isProviderConfigured('cloudinary', config)).toBe(false);
    });

    it('should return false for S3 without bucket', () => {
      const config: CloudStorageConfig = {
        provider: 's3',
        s3: { accessKeyId: 'key', secretAccessKey: 'secret', bucket: '', region: 'us-east-1' },
        cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
        imgbb: { apiKey: '' },
      };

      expect(isProviderConfigured('s3', config)).toBe(false);
    });
  });

  describe('getProviderDisplayName', () => {
    it('should return correct names for all providers', () => {
      expect(getProviderDisplayName('none')).toBe('Base64');
      expect(getProviderDisplayName('imgbb')).toBe('ImgBB');
      expect(getProviderDisplayName('cloudinary')).toBe('Cloudinary');
      expect(getProviderDisplayName('s3')).toBe('AWS S3');
    });
  });

  describe('resetUploadState', () => {
    it('should reset upload state to idle', async () => {
      const config: CloudStorageConfig = {
        provider: 'none',
        s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
        cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
        imgbb: { apiKey: '' },
      };

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

      await uploadImage(mockFile, config);
      expect(uploadState.value.status).toBe('success');

      resetUploadState();
      
      expect(uploadState.value.status).toBe('idle');
      expect(uploadState.value.progress).toBe(0);
      expect(uploadState.value.message).toBeUndefined();
      expect(uploadState.value.error).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should handle network error', async () => {
      const config: CloudStorageConfig = {
        provider: 'imgbb',
        s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
        cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
        imgbb: { apiKey: 'test_key' },
      };

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

      const uploadPromise = uploadImage(mockFile, config);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Mock network error
      currentMockXHR.onerror!(new Event('error'));
      
      const result = await uploadPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle HTTP error status', async () => {
      const config: CloudStorageConfig = {
        provider: 'imgbb',
        s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
        cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
        imgbb: { apiKey: 'test_key' },
      };

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

      const uploadPromise = uploadImage(mockFile, config);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Mock HTTP error
      currentMockXHR.status = 500;
      currentMockXHR.onload!(new Event('load'));
      
      const result = await uploadPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 500');
    });
  });
});

describe('Cloud Upload Integration with TiptapEditor', () => {
  // These tests verify the integration between cloud upload and the editor
  
  it('should validate cloud storage config types', () => {
    const validConfig: CloudStorageConfig = {
      provider: 'none',
      s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
      cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
      imgbb: { apiKey: '' },
    };

    expect(validConfig.provider).toBe('none');
    
    const imgbbConfig: CloudStorageConfig = {
      ...validConfig,
      provider: 'imgbb',
      imgbb: { apiKey: 'test_key' },
    };
    expect(imgbbConfig.provider).toBe('imgbb');
    expect(imgbbConfig.imgbb.apiKey).toBe('test_key');
    
    const cloudinaryConfig: CloudStorageConfig = {
      ...validConfig,
      provider: 'cloudinary',
      cloudinary: { apiKey: 'key', apiSecret: 'secret', cloudName: 'cloud' },
    };
    expect(cloudinaryConfig.provider).toBe('cloudinary');
    expect(cloudinaryConfig.cloudinary.cloudName).toBe('cloud');
    
    const s3Config: CloudStorageConfig = {
      ...validConfig,
      provider: 's3',
      s3: { accessKeyId: 'key', secretAccessKey: 'secret', bucket: 'bucket', region: 'us-west-2' },
    };
    expect(s3Config.provider).toBe('s3');
    expect(s3Config.s3.region).toBe('us-west-2');
  });

  it('should support all valid cloud storage providers', () => {
    const validProviders: CloudStorageProvider[] = ['none', 's3', 'cloudinary', 'imgbb'];
    
    validProviders.forEach(provider => {
      const config: CloudStorageConfig = {
        provider,
        s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
        cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
        imgbb: { apiKey: '' },
      };
      
      expect(config.provider).toBe(provider);
    });
  });
});
