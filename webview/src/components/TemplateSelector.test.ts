import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TemplateSelector from './TemplateSelector.vue';
import { BUILT_IN_TEMPLATES } from '../core/templates/registry';

describe('TemplateSelector.vue', () => {
  describe('Rendering', () => {
    it('does not render when visible is false', () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: false },
      });
      expect(wrapper.find('.template-selector-backdrop').exists()).toBe(false);
    });

    it('renders when visible is true', () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      expect(wrapper.find('.template-selector-backdrop').exists()).toBe(true);
      expect(wrapper.find('.template-selector').exists()).toBe(true);
    });

    it('shows template selector header with title', () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      expect(wrapper.find('.selector-title').text()).toBe('Templates');
    });

    it('renders search input', () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      expect(wrapper.find('.search-input').exists()).toBe(true);
    });

    it('renders all category tabs', () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const tabs = wrapper.findAll('.category-tab');
      // All + 5 categories = 6 tabs
      expect(tabs).toHaveLength(6);
    });

    it('renders all built-in templates in grid', () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const items = wrapper.findAll('.template-item');
      expect(items).toHaveLength(BUILT_IN_TEMPLATES.length);
    });
  });

  describe('Category Filtering', () => {
    it('shows all templates when no category is selected', () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const items = wrapper.findAll('.template-item');
      expect(items).toHaveLength(BUILT_IN_TEMPLATES.length);
    });

    it('filters templates by blog category', async () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const tabs = wrapper.findAll('.category-tab');
      // Click "Blog" tab (index 2, after "All" and "Product Page")
      await tabs[1].trigger('click');
      await wrapper.vm.$nextTick();
      
      const items = wrapper.findAll('.template-item');
      const blogTemplates = BUILT_IN_TEMPLATES.filter(t => t.category === 'blog');
      expect(items).toHaveLength(blogTemplates.length);
    });

    it('shows "All" category when "All" tab is clicked', async () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const tabs = wrapper.findAll('.category-tab');
      
      // First click a category
      await tabs[1].trigger('click');
      await wrapper.vm.$nextTick();
      
      // Then click "All"
      await tabs[0].trigger('click');
      await wrapper.vm.$nextTick();
      
      const items = wrapper.findAll('.template-item');
      expect(items).toHaveLength(BUILT_IN_TEMPLATES.length);
    });
  });

  describe('Search Functionality', () => {
    it('filters templates by search query', async () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const searchInput = wrapper.find('.search-input');
      
      await searchInput.setValue('blog');
      await wrapper.vm.$nextTick();
      
      const items = wrapper.findAll('.template-item');
      expect(items.length).toBeLessThan(BUILT_IN_TEMPLATES.length);
      expect(items.length).toBeGreaterThan(0);
    });

    it('shows all templates for empty search', async () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const searchInput = wrapper.find('.search-input');
      
      await searchInput.setValue('blog');
      await wrapper.vm.$nextTick();
      
      await searchInput.setValue('');
      await wrapper.vm.$nextTick();
      
      const items = wrapper.findAll('.template-item');
      expect(items).toHaveLength(BUILT_IN_TEMPLATES.length);
    });

    it('search is case-insensitive', async () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const searchInput = wrapper.find('.search-input');
      
      await searchInput.setValue('BLOG');
      await wrapper.vm.$nextTick();
      
      const items = wrapper.findAll('.template-item');
      expect(items.length).toBeGreaterThan(0);
    });

    it('shows no results message when search matches nothing', async () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const searchInput = wrapper.find('.search-input');
      
      await searchInput.setValue('nonexistenttemplatexyz');
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('.no-results').exists()).toBe(true);
    });
  });

  describe('Interaction', () => {
    it('emits select when template is clicked', async () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const firstItem = wrapper.findAll('.template-item')[0];
      await firstItem.trigger('click');
      
      expect(wrapper.emitted('select')).toBeTruthy();
      const selectEvent = wrapper.emitted('select')![0];
      expect(selectEvent[0]).toHaveProperty('id');
      expect(selectEvent[0]).toHaveProperty('name');
      expect(selectEvent[0]).toHaveProperty('content');
    });

    it('emits cancel when backdrop is clicked', async () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      await wrapper.find('.template-selector-backdrop').trigger('mousedown');
      expect(wrapper.emitted('cancel')).toBeTruthy();
    });

    it('updates preview on hover', async () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const firstItem = wrapper.findAll('.template-item')[0];
      await firstItem.trigger('mouseenter');
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('.preview-panel:not(.empty)').exists()).toBe(true);
      expect(wrapper.find('.preview-title').text()).toBe(firstItem.find('.template-name').text());
    });
  });

  describe('Keyboard Navigation', () => {
    it('emits cancel on Escape key', async () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      await wrapper.find('.template-selector').trigger('keydown', { key: 'Escape' });
      expect(wrapper.emitted('cancel')).toBeTruthy();
    });

    it('highlights next template on ArrowDown key', async () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      await wrapper.find('.template-selector').trigger('keydown', { key: 'ArrowDown' });
      await wrapper.vm.$nextTick();
      
      const items = wrapper.findAll('.template-item');
      expect(items[0].classes()).toContain('hovered');
    });

    it('navigates through templates with arrow keys', async () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const selector = wrapper.find('.template-selector');
      
      await selector.trigger('keydown', { key: 'ArrowDown' });
      await wrapper.vm.$nextTick();
      
      let items = wrapper.findAll('.template-item');
      expect(items[0].classes()).toContain('hovered');
      
      await selector.trigger('keydown', { key: 'ArrowDown' });
      await wrapper.vm.$nextTick();
      
      items = wrapper.findAll('.template-item');
      // Second item should be hovered
      expect(items[1].classes()).toContain('hovered');
    });

    it('emits select on Enter when template is highlighted', async () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const selector = wrapper.find('.template-selector');
      
      // Navigate to first template
      await selector.trigger('keydown', { key: 'ArrowDown' });
      await wrapper.vm.$nextTick();
      
      // Press Enter
      await selector.trigger('keydown', { key: 'Enter' });
      
      expect(wrapper.emitted('select')).toBeTruthy();
    });

    it('switches category with arrow keys', async () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const selector = wrapper.find('.template-selector');
      const tabs = wrapper.findAll('.category-tab');
      
      // "All" should be active initially
      expect(tabs[0].classes()).toContain('active');
      
      // Press ArrowRight to go to next category
      await selector.trigger('keydown', { key: 'ArrowRight' });
      await wrapper.vm.$nextTick();
      
      // Second tab should now be active
      expect(tabs[1].classes()).toContain('active');
    });
  });

  describe('Preview Panel', () => {
    it('shows empty preview state initially', () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      expect(wrapper.find('.preview-panel.empty').exists()).toBe(true);
      expect(wrapper.find('.preview-empty').exists()).toBe(true);
    });

    it('shows template preview when hovering', async () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const firstItem = wrapper.findAll('.template-item')[0];
      await firstItem.trigger('mouseenter');
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('.preview-panel:not(.empty)').exists()).toBe(true);
      expect(wrapper.find('.preview-title').text()).toBe(BUILT_IN_TEMPLATES[0].name);
      expect(wrapper.find('.preview-category').text()).toBe('Blog');
    });

    it('shows template iframe with content', async () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const firstItem = wrapper.findAll('.template-item')[0];
      await firstItem.trigger('mouseenter');
      await wrapper.vm.$nextTick();
      
      const iframe = wrapper.find('.preview-iframe');
      expect(iframe.exists()).toBe(true);
      expect(iframe.attributes('srcdoc')).toBe(BUILT_IN_TEMPLATES[0].content);
    });

    it('shows template description in preview', async () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const firstItem = wrapper.findAll('.template-item')[0];
      await firstItem.trigger('mouseenter');
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('.preview-description').text()).toBe(BUILT_IN_TEMPLATES[0].description);
    });
  });

  describe('Footer', () => {
    it('shows keyboard navigation hints', () => {
      const wrapper = mount(TemplateSelector, {
        props: { visible: true },
      });
      const hint = wrapper.find('.hint');
      expect(hint.text()).toContain('Navigate');
      expect(hint.text()).toContain('Select');
      expect(hint.text()).toContain('Close');
    });
  });
});
