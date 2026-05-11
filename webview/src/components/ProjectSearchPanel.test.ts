import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ProjectSearchPanel from './ProjectSearchPanel.vue';

// Mock v-html directive
vi.stubGlobal('Directive', {
  vHtml: {
    mounted: vi.fn(),
    updated: vi.fn(),
  },
});

describe('ProjectSearchPanel', () => {
  function createWrapper(props = {}) {
    return mount(ProjectSearchPanel, {
      props: {
        visible: true,
        isSearching: false,
        results: [],
        currentResultIndex: -1,
        query: '',
        isRegex: false,
        error: null,
        ...props,
      },
      global: {
        stubs: {
          teleport: true,
        },
      },
    });
  }

  it('should not render when visible is false', () => {
    const wrapper = createWrapper({ visible: false });
    expect(wrapper.find('.search-panel').exists()).toBe(false);
  });

  it('should render when visible is true', () => {
    const wrapper = createWrapper({ visible: true });
    expect(wrapper.find('.search-panel').exists()).toBe(true);
  });

  it('should have a search input', () => {
    const wrapper = createWrapper();
    const input = wrapper.find('input.search-input');
    expect(input.exists()).toBe(true);
    expect(input.attributes('placeholder')).toBe('Search in workspace...');
  });

  it('should emit close event when close button is clicked', async () => {
    const wrapper = createWrapper();
    const buttons = wrapper.findAll('button');
    const closeButton = buttons[buttons.length - 1];
    await closeButton.trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('should show searching indicator when isSearching is true', () => {
    const wrapper = createWrapper({ isSearching: true, query: 'test' });
    expect(wrapper.find('.searching-indicator').exists()).toBe(true);
  });

  it('should show no results message when query is set but no results', () => {
    const wrapper = createWrapper({ query: 'test', results: [] });
    expect(wrapper.find('.no-results').exists()).toBe(true);
    expect(wrapper.find('.no-results').text()).toContain('No matches found');
  });

  it('should show enter search term message when no query', () => {
    const wrapper = createWrapper({ query: '' });
    expect(wrapper.find('.no-results').exists()).toBe(true);
    expect(wrapper.find('.no-results').text()).toContain('Enter a search term');
  });

  it('should show error message when error is set', () => {
    const wrapper = createWrapper({ error: 'Search failed: invalid regex' });
    expect(wrapper.find('.error-message').exists()).toBe(true);
    expect(wrapper.find('.error-message').text()).toBe('Search failed: invalid regex');
  });

  it('should toggle regex mode when regex button is clicked', async () => {
    const wrapper = createWrapper({ isRegex: false });
    const regexButton = wrapper.find('.regex-toggle');
    await regexButton.trigger('click');
    expect(wrapper.emitted('toggleRegex')).toBeTruthy();
  });

  it('should show regex mode styling when isRegex is true', () => {
    const wrapper = createWrapper({ isRegex: true });
    expect(wrapper.find('input.search-input.regex-mode').exists()).toBe(true);
  });

  it('should have regex toggle with active class when regex is enabled', () => {
    const wrapper = createWrapper({ isRegex: true });
    expect(wrapper.find('.regex-toggle.active').exists()).toBe(true);
  });

  it('should disable navigation buttons when no results', () => {
    const wrapper = createWrapper({ results: [] });
    const buttons = wrapper.findAll('button');

    // Check that navigation buttons are disabled
    const prevButton = buttons[buttons.length - 3];
    const nextButton = buttons[buttons.length - 2];

    expect(prevButton.attributes('disabled')).toBeDefined();
    expect(nextButton.attributes('disabled')).toBeDefined();
  });

  it('should show correct match label with no results', () => {
    const wrapper = createWrapper({ query: 'test', results: [], isSearching: false });
    expect(wrapper.find('.match-count').text()).toBe('No results');
  });

  it('should show correct match label with results', () => {
    const wrapper = createWrapper({
      query: 'test',
      results: [{ filePath: '/a.html', fileName: 'a.html', line: 1, column: 1, matchText: 'a', contextBefore: '', contextAfter: '' }],
      currentResultIndex: 0,
      isSearching: false,
    });
    expect(wrapper.find('.match-count').text()).toBe('1/1');
  });
});
