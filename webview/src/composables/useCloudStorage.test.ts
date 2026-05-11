/**
 * Cloud Storage Settings Tests
 * 
 * Tests for cloud storage settings configuration and handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

// Mock VS Code API
const mockPostMessage = vi.fn();
const mockGetState = vi.fn(() => ({}));
const mockSetState = vi.fn();

vi.stubGlobal('acquireVsCodeApi', () => ({
  postMessage: mockPostMessage,
  getState: mockGetState,
  setState: mockSetState,
}));

// Import the useVSCode composable
import { useVSCode, __resetVsApiForTest } from './useVSCode';
import type { CloudStorageConfig, CloudStorageProvider } from '../../../src/shared/types';

describe('useVSCode - Cloud Storage Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetVsApiForTest();
  });

  describe('Cloud storage configuration', () => {
    it('should handle settings message with cloud storage config', () => {
      const handler = vi.fn();
      const { onMessage } = useVSCode();
      onMessage(handler);

      // Simulate receiving settings with cloud storage
      const cloudStorageConfig: CloudStorageConfig = {
        provider: 'cloudinary',
        s3: {
          accessKeyId: '',
          secretAccessKey: '',
          bucket: '',
          region: 'us-east-1',
        },
        cloudinary: {
          apiKey: '',
          apiSecret: '',
          cloudName: 'test-cloud-name',
        },
        imgbb: {
          apiKey: '',
        },
      };

      window.dispatchEvent(new MessageEvent('message', {
        data: {
          type: 'settings',
          settings: {
            defaultMode: 'wysiwyg',
            showButtonLabels: true,
            autoHideToolbarInPreview: true,
            defaultFontSize: 14,
            enableMarkdownShortcuts: true,
            splitScreenDirection: 'horizontal',
            customTheme: { primaryColor: '#0e639c' },
            cloudStorage: cloudStorageConfig,
          },
        },
      }));

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'settings',
        settings: expect.objectContaining({
          cloudStorage: expect.objectContaining({
            provider: 'cloudinary',
            cloudinary: expect.objectContaining({
              cloudName: 'test-cloud-name',
            }),
          }),
        }),
      }));
    });

    it('should handle settings message with S3 config', () => {
      const handler = vi.fn();
      const { onMessage } = useVSCode();
      onMessage(handler);

      const s3Config: CloudStorageConfig = {
        provider: 's3',
        s3: {
          accessKeyId: '',
          secretAccessKey: '',
          bucket: 'my-images-bucket',
          region: 'us-west-2',
        },
        cloudinary: {
          apiKey: '',
          apiSecret: '',
          cloudName: '',
        },
        imgbb: {
          apiKey: '',
        },
      };

      window.dispatchEvent(new MessageEvent('message', {
        data: {
          type: 'settings',
          settings: {
            defaultMode: 'source',
            showButtonLabels: false,
            autoHideToolbarInPreview: false,
            defaultFontSize: 16,
            enableMarkdownShortcuts: false,
            splitScreenDirection: 'vertical',
            customTheme: { primaryColor: '#ff0000' },
            cloudStorage: s3Config,
          },
        },
      }));

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'settings',
        settings: expect.objectContaining({
          cloudStorage: expect.objectContaining({
            provider: 's3',
            s3: expect.objectContaining({
              bucket: 'my-images-bucket',
              region: 'us-west-2',
            }),
          }),
        }),
      }));
    });

    it('should handle settings message with ImgBB config', () => {
      const handler = vi.fn();
      const { onMessage } = useVSCode();
      onMessage(handler);

      const imgbbConfig: CloudStorageConfig = {
        provider: 'imgbb',
        s3: {
          accessKeyId: '',
          secretAccessKey: '',
          bucket: '',
          region: 'us-east-1',
        },
        cloudinary: {
          apiKey: '',
          apiSecret: '',
          cloudName: '',
        },
        imgbb: {
          apiKey: 'test_imgbb_key',
        },
      };

      window.dispatchEvent(new MessageEvent('message', {
        data: {
          type: 'settings',
          settings: {
            defaultMode: 'preview',
            showButtonLabels: true,
            autoHideToolbarInPreview: true,
            defaultFontSize: 14,
            enableMarkdownShortcuts: true,
            splitScreenDirection: 'horizontal',
            customTheme: { primaryColor: '#0e639c' },
            cloudStorage: imgbbConfig,
          },
        },
      }));

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'settings',
        settings: expect.objectContaining({
          cloudStorage: expect.objectContaining({
            provider: 'imgbb',
            imgbb: expect.objectContaining({
              apiKey: 'test_imgbb_key',
            }),
          }),
        }),
      }));
    });

    it('should handle settings message with provider=none (base64 fallback)', () => {
      const handler = vi.fn();
      const { onMessage } = useVSCode();
      onMessage(handler);

      const noneConfig: CloudStorageConfig = {
        provider: 'none',
        s3: {
          accessKeyId: '',
          secretAccessKey: '',
          bucket: '',
          region: 'us-east-1',
        },
        cloudinary: {
          apiKey: '',
          apiSecret: '',
          cloudName: '',
        },
        imgbb: {
          apiKey: '',
        },
      };

      window.dispatchEvent(new MessageEvent('message', {
        data: {
          type: 'settings',
          settings: {
            defaultMode: 'wysiwyg',
            showButtonLabels: true,
            autoHideToolbarInPreview: false,
            defaultFontSize: 14,
            enableMarkdownShortcuts: true,
            splitScreenDirection: 'horizontal',
            customTheme: { primaryColor: '#0e639c' },
            cloudStorage: noneConfig,
          },
        },
      }));

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'settings',
        settings: expect.objectContaining({
          cloudStorage: expect.objectContaining({
            provider: 'none',
          }),
        }),
      }));
    });
  });

  describe('Cloud storage provider types', () => {
    it('should support all valid provider values', () => {
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
});

describe('Cloud Storage Settings Schema Validation', () => {
  // These tests verify the settings schema matches expected structure
  
  it('should have valid default cloud storage config structure', () => {
    const defaultConfig: CloudStorageConfig = {
      provider: 'none',
      s3: {
        accessKeyId: '',
        secretAccessKey: '',
        bucket: '',
        region: 'us-east-1',
      },
      cloudinary: {
        apiKey: '',
        apiSecret: '',
        cloudName: '',
      },
      imgbb: {
        apiKey: '',
      },
    };

    expect(defaultConfig.provider).toBe('none');
    expect(defaultConfig.s3.region).toBe('us-east-1');
  });

  it('should have valid S3 config structure', () => {
    const s3Config = {
      provider: 's3' as CloudStorageProvider,
      s3: {
        accessKeyId: 'test_access_key',
        secretAccessKey: 'test_secret',
        bucket: 'my-images-bucket',
        region: 'us-west-2',
      },
      cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
      imgbb: { apiKey: '' },
    };

    expect(s3Config.s3.accessKeyId).toBeTruthy();
    expect(s3Config.s3.secretAccessKey).toBeTruthy();
    expect(s3Config.s3.bucket).toBeTruthy();
    expect(s3Config.s3.region).toBeTruthy();
  });

  it('should have valid Cloudinary config structure', () => {
    const cloudinaryConfig = {
      provider: 'cloudinary' as CloudStorageProvider,
      s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
      cloudinary: {
        apiKey: 'test_key',
        apiSecret: 'test_secret',
        cloudName: 'my-cloud',
      },
      imgbb: { apiKey: '' },
    };

    expect(cloudinaryConfig.cloudinary.apiKey).toBeTruthy();
    expect(cloudinaryConfig.cloudinary.apiSecret).toBeTruthy();
    expect(cloudinaryConfig.cloudinary.cloudName).toBeTruthy();
  });

  it('should have valid ImgBB config structure', () => {
    const imgbbConfig = {
      provider: 'imgbb' as CloudStorageProvider,
      s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: 'us-east-1' },
      cloudinary: { apiKey: '', apiSecret: '', cloudName: '' },
      imgbb: { apiKey: 'test_key' },
    };

    expect(imgbbConfig.imgbb.apiKey).toBeTruthy();
  });
});
