import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Tests for GitHub Pages publish functionality
 * 
 * These tests verify that:
 * 1. The GitHub Actions workflow file exists
 * 2. The workflow has the correct structure
 * 3. The workflow is configured to publish to GitHub Pages
 */

describe('GitHub Pages Publish', () => {
  const workflowPath = path.join(__dirname, '..', '..', '.github', 'workflows', 'github-pages.yml');
  
  describe('workflow file existence', () => {
    it('should have github-pages.yml workflow file', () => {
      expect(fs.existsSync(workflowPath)).toBe(true);
    });
    
    it('should be a valid YAML file', () => {
      const content = fs.readFileSync(workflowPath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
      // Basic YAML structure validation
      expect(content).toContain('name:');
      expect(content).toContain('on:');
      expect(content).toContain('jobs:');
    });
  });
  
  describe('workflow configuration', () => {
    let workflowContent: string;
    
    beforeEach(() => {
      workflowContent = fs.readFileSync(workflowPath, 'utf-8');
    });
    
    it('should have Deploy to GitHub Pages name', () => {
      expect(workflowContent).toContain('name: Deploy to GitHub Pages');
    });
    
    it('should trigger on push to main branch', () => {
      expect(workflowContent).toContain('branches: [main]');
    });
    
    it('should allow manual workflow dispatch', () => {
      expect(workflowContent).toContain('workflow_dispatch');
    });
    
    it('should have correct permissions for GitHub Pages', () => {
      expect(workflowContent).toContain('pages: write');
      expect(workflowContent).toContain('id-token: write');
      expect(workflowContent).toContain('contents: read');
    });
  });
  
  describe('build job', () => {
    let workflowContent: string;
    
    beforeEach(() => {
      workflowContent = fs.readFileSync(workflowPath, 'utf-8');
    });
    
    it('should have a build job', () => {
      expect(workflowContent).toContain('jobs:');
      expect(workflowContent).toContain('build:');
    });
    
    it('should use ubuntu-latest runner', () => {
      expect(workflowContent).toContain("runs-on: ubuntu-latest");
    });
    
    it('should checkout repository', () => {
      expect(workflowContent).toContain('actions/checkout@v');
    });
    
    it('should setup Node.js', () => {
      expect(workflowContent).toContain('actions/setup-node@v');
    });
    
    it('should install dependencies', () => {
      expect(workflowContent).toContain('npm ci');
    });
    
    it('should build webview', () => {
      expect(workflowContent).toContain('npm run build:webview');
    });
    
    it('should upload pages artifact', () => {
      expect(workflowContent).toContain('actions/upload-pages-artifact@v');
    });
  });
  
  describe('deploy job', () => {
    let workflowContent: string;
    
    beforeEach(() => {
      workflowContent = fs.readFileSync(workflowPath, 'utf-8');
    });
    
    it('should have a deploy job', () => {
      expect(workflowContent).toContain('deploy:');
    });
    
    it('should depend on build job', () => {
      expect(workflowContent).toContain('needs: build');
    });
    
    it('should use deploy-pages action', () => {
      expect(workflowContent).toContain('actions/deploy-pages@v');
    });
    
    it('should have github-pages environment', () => {
      expect(workflowContent).toContain('name: github-pages');
    });
  });
  
  describe('custom domain support', () => {
    let workflowContent: string;
    
    beforeEach(() => {
      workflowContent = fs.readFileSync(workflowPath, 'utf-8');
    });
    
    it('should accept custom domain as workflow input', () => {
      expect(workflowContent).toContain('custom_domain');
      expect(workflowContent).toContain('workflow_dispatch');
    });
    
    it('should create CNAME file when custom domain is specified', () => {
      expect(workflowContent).toContain('inputs.custom_domain');
      expect(workflowContent).toContain('CNAME');
    });
  });
  
  describe('publishes to gh-pages', () => {
    let workflowContent: string;
    
    beforeEach(() => {
      workflowContent = fs.readFileSync(workflowPath, 'utf-8');
    });
    
    it('should configure GitHub Pages deployment', () => {
      expect(workflowContent).toContain('github-pages');
      expect(workflowContent).toContain('deploy-pages');
    });
    
    it('should use pages artifact for deployment', () => {
      expect(workflowContent).toContain('upload-pages-artifact');
      expect(workflowContent).toContain('deploy-pages');
    });
  });
});
