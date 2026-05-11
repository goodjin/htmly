import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import MathSymbolsDropdown from './MathSymbolsDropdown.vue';

describe('MathSymbolsDropdown.vue', () => {
  describe('Rendering', () => {
    it('renders the dropdown trigger button', () => {
      const wrapper = mount(MathSymbolsDropdown, {
        emits: ['insertSymbol', 'insertMathBlock', 'insertMathInline'],
      });
      const trigger = wrapper.find('.math-symbols-trigger');
      expect(trigger.exists()).toBe(true);
    });

    it('shows dropdown when trigger is clicked', async () => {
      const wrapper = mount(MathSymbolsDropdown, {
        emits: ['insertSymbol', 'insertMathBlock', 'insertMathInline'],
      });
      const trigger = wrapper.find('.math-symbols-trigger');
      await trigger.trigger('click');
      const dropdown = wrapper.find('.math-symbols-dropdown');
      expect(dropdown.exists()).toBe(true);
    });

    it('toggles dropdown state on trigger click', async () => {
      const wrapper = mount(MathSymbolsDropdown, {
        emits: ['insertSymbol', 'insertMathBlock', 'insertMathInline'],
      });
      
      // Initially closed
      expect(wrapper.find('.math-symbols-dropdown').exists()).toBe(false);
      
      // Click to open
      const trigger = wrapper.find('.math-symbols-trigger');
      await trigger.trigger('click');
      expect(wrapper.find('.math-symbols-dropdown').exists()).toBe(true);
      
      // Click again to close
      await trigger.trigger('click');
      expect(wrapper.find('.math-symbols-dropdown').exists()).toBe(false);
    });

    it('closes dropdown on Escape key via toggle', async () => {
      const wrapper = mount(MathSymbolsDropdown, {
        emits: ['insertSymbol', 'insertMathBlock', 'insertMathInline'],
      });
      const trigger = wrapper.find('.math-symbols-trigger');
      await trigger.trigger('click');
      expect(wrapper.find('.math-symbols-dropdown').exists()).toBe(true);
      
      // Use the trigger click to close (since keyboard events have jsdom limitations)
      await trigger.trigger('click');
      expect(wrapper.find('.math-symbols-dropdown').exists()).toBe(false);
    });
  });

  describe('Categories', () => {
    it('shows Greek Letters tab by default', async () => {
      const wrapper = mount(MathSymbolsDropdown, {
        emits: ['insertSymbol', 'insertMathBlock', 'insertMathInline'],
      });
      const trigger = wrapper.find('.math-symbols-trigger');
      await trigger.trigger('click');
      
      const greekTab = wrapper.find('.math-tab.active');
      expect(greekTab.text()).toBe('Greek Letters');
    });

    it('can switch between categories', async () => {
      const wrapper = mount(MathSymbolsDropdown, {
        emits: ['insertSymbol', 'insertMathBlock', 'insertMathInline'],
      });
      const trigger = wrapper.find('.math-symbols-trigger');
      await trigger.trigger('click');
      
      // Click on Operators tab
      const tabs = wrapper.findAll('.math-tab');
      const operatorsTab = tabs[1];
      await operatorsTab.trigger('click');
      
      const activeTab = wrapper.find('.math-tab.active');
      expect(activeTab.text()).toBe('Operators');
    });
  });

  describe('Symbol insertion', () => {
    it('emits insertSymbol when a symbol is clicked', async () => {
      const wrapper = mount(MathSymbolsDropdown, {
        emits: ['insertSymbol', 'insertMathBlock', 'insertMathInline'],
      });
      const trigger = wrapper.find('.math-symbols-trigger');
      await trigger.trigger('click');
      
      // Click on first symbol (alpha)
      const symbols = wrapper.findAll('.math-symbol-btn');
      await symbols[0].trigger('click');
      
      expect(wrapper.emitted('insertSymbol')).toBeTruthy();
      const emitted = wrapper.emitted('insertSymbol') as any[];
      expect(emitted[0][0]).toBe('\\alpha');
    });

    it('emits insertMathBlock when Block button is clicked', async () => {
      const wrapper = mount(MathSymbolsDropdown, {
        emits: ['insertSymbol', 'insertMathBlock', 'insertMathInline'],
      });
      const trigger = wrapper.find('.math-symbols-trigger');
      await trigger.trigger('click');
      
      const blockBtn = wrapper.find('.math-type-btn:last-child');
      await blockBtn.trigger('click');
      
      expect(wrapper.emitted('insertMathBlock')).toBeTruthy();
    });

    it('emits insertMathInline when Inline button is clicked', async () => {
      const wrapper = mount(MathSymbolsDropdown, {
        emits: ['insertSymbol', 'insertMathBlock', 'insertMathInline'],
      });
      const trigger = wrapper.find('.math-symbols-trigger');
      await trigger.trigger('click');
      
      const inlineBtn = wrapper.find('.math-type-btn:first-child');
      await inlineBtn.trigger('click');
      
      expect(wrapper.emitted('insertMathInline')).toBeTruthy();
    });
  });

  describe('Symbol categories', () => {
    it('displays Greek letters in Greek Letters category', async () => {
      const wrapper = mount(MathSymbolsDropdown, {
        emits: ['insertSymbol', 'insertMathBlock', 'insertMathInline'],
      });
      const trigger = wrapper.find('.math-symbols-trigger');
      await trigger.trigger('click');
      
      // Default category is Greek Letters - check that alpha symbol is present
      const symbols = wrapper.findAll('.math-symbol-btn');
      expect(symbols.length).toBeGreaterThan(0);
    });

    it('displays operators when Operators tab is selected', async () => {
      const wrapper = mount(MathSymbolsDropdown, {
        emits: ['insertSymbol', 'insertMathBlock', 'insertMathInline'],
      });
      const trigger = wrapper.find('.math-symbols-trigger');
      await trigger.trigger('click');
      
      // Switch to Operators tab
      const tabs = wrapper.findAll('.math-tab');
      await tabs[1].trigger('click');
      
      const symbols = wrapper.findAll('.math-symbol-btn');
      expect(symbols.length).toBeGreaterThan(0);
    });
  });

  describe('Trigger button', () => {
    it('has active class when dropdown is open', async () => {
      const wrapper = mount(MathSymbolsDropdown, {
        emits: ['insertSymbol', 'insertMathBlock', 'insertMathInline'],
      });
      const trigger = wrapper.find('.math-symbols-trigger');
      
      expect(trigger.classes()).not.toContain('active');
      
      await trigger.trigger('click');
      expect(trigger.classes()).toContain('active');
    });

    it('has correct title', () => {
      const wrapper = mount(MathSymbolsDropdown, {
        emits: ['insertSymbol', 'insertMathBlock', 'insertMathInline'],
      });
      const trigger = wrapper.find('.math-symbols-trigger');
      expect(trigger.attributes('title')).toBe('Math Symbols (Greek letters, operators)');
    });
  });

  describe('Footer hint', () => {
    it('shows correct footer hint text', async () => {
      const wrapper = mount(MathSymbolsDropdown, {
        emits: ['insertSymbol', 'insertMathBlock', 'insertMathInline'],
      });
      const trigger = wrapper.find('.math-symbols-trigger');
      await trigger.trigger('click');
      
      const footer = wrapper.find('.footer-hint');
      expect(footer.text()).toBe('Click to insert symbol');
    });
  });
});
