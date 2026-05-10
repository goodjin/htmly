<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Editor } from '@tiptap/core';
import type { TOCHeading } from '../extensions/TOC';

const props = defineProps<{
  editor: Editor | undefined;
}>();

const headings = ref<TOCHeading[]>([]);
const visible = ref(false);

// Watch for editor changes to update TOC
watch(
  () => props.editor,
  (editor) => {
    if (!editor) return;
    
    // Initial update
    updateTOC(editor);
    
    // Listen for document changes
    editor.on('update', () => updateTOC(editor));
    editor.on('selectionUpdate', () => updateTOC(editor));
  },
  { immediate: true }
);

function updateTOC(editor: Editor) {
  if (!editor) return;
  
  const state = editor.state;
  // Get headings from document directly (since our plugin state isn't easily accessible from Vue)
  const newHeadings: TOCHeading[] = [];
  
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading' && node.attrs.level <= 3) {
      const text = node.textContent;
      const slug = slugify(text);
      newHeadings.push({
        level: node.attrs.level,
        text,
        pos,
        slug,
      });
    }
  });
  
  headings.value = newHeadings;
}

// Generate slug matching the TOC plugin
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function scrollToHeading(slug: string) {
  if (!props.editor) return;
  
  // Use the editor's view to find and scroll to the heading
  const editorDom = props.editor.view.dom as HTMLElement;
  const headingElements = editorDom.querySelectorAll('h1, h2, h3');
  
  for (const el of headingElements) {
    if (slugify(el.textContent || '') === slug) {
      // Calculate position with offset for toolbar
      const toolbarHeight = 40;
      const editorContainer = editorDom.closest('.editor-wrap') as HTMLElement;
      
      if (editorContainer) {
        const elementTop = el.getBoundingClientRect().top;
        const containerTop = editorContainer.getBoundingClientRect().top;
        const scrollTarget = elementTop - containerTop + editorDom.scrollTop - toolbarHeight;
        
        editorDom.scrollTo({
          top: Math.max(0, scrollTarget),
          behavior: 'smooth',
        });
        
        // Update URL hash
        const newHash = `#h-${slug}`;
        if (window.location.hash !== newHash) {
          history.replaceState(null, '', newHash);
        }
      }
      
      // Focus the editor
      props.editor.commands.focus();
      
      // Select the heading
      const pos = props.editor.view.posAtDOM(el as HTMLElement, 0);
      props.editor.commands.setTextSelection(pos);
      
      break;
    }
  }
}

// Indent level for nested headings
function getIndentClass(level: number): string {
  switch (level) {
    case 1:
      return 'toc-h1';
    case 2:
      return 'toc-h2';
    case 3:
      return 'toc-h3';
    default:
      return '';
  }
}

// Get indentation style
function getIndentStyle(level: number): string {
  const baseIndent = 8; // px
  const indentPerLevel = 16; // px per level
  return `padding-left: ${baseIndent + (level - 1) * indentPerLevel}px`;
}
</script>

<template>
  <div v-if="headings.length > 0" class="toc-panel">
    <div class="toc-header">
      <span class="toc-title">Table of Contents</span>
    </div>
    <nav class="toc-nav">
      <ul class="toc-list">
        <li
          v-for="heading in headings"
          :key="heading.slug"
          :class="['toc-item', getIndentClass(heading.level)]"
        >
          <a
            :href="`#h-${heading.slug}`"
            class="toc-link"
            :style="getIndentStyle(heading.level)"
            @click.prevent="scrollToHeading(heading.slug)"
          >
            {{ heading.text }}
          </a>
        </li>
      </ul>
    </nav>
  </div>
</template>

<style scoped>
.toc-panel {
  position: fixed;
  right: 16px;
  top: 60px;
  width: 280px;
  max-height: calc(100vh - 100px);
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-panel-border, #454545);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.toc-header {
  padding: 10px 12px;
  border-bottom: 1px solid var(--vscode-panel-border, #454545);
  background: var(--vscode-editorGroupHeader-tabsBackground, #2d2d2d);
  flex-shrink: 0;
}

.toc-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vscode-editor-foreground, #d4d4d4);
}

.toc-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.toc-item {
  margin: 0;
}

.toc-link {
  display: block;
  padding: 5px 12px;
  font-size: 12px;
  color: var(--vscode-editor-foreground, #d4d4d4);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.1s ease;
}

.toc-link:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  color: var(--vscode-textLink-foreground, #4fc1ff);
}

.toc-link:active {
  background: var(--vscode-button-background, #0e639c);
}

/* Indent levels for hierarchy */
.toc-h1 .toc-link {
  font-weight: 600;
  color: var(--vscode-editor-foreground, #d4d4d4);
}

.toc-h2 .toc-link {
  font-weight: normal;
}

.toc-h3 .toc-link {
  font-weight: normal;
  color: var(--vscode-descriptionForeground, #888);
  font-size: 11px;
}
</style>
