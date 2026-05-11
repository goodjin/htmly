<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const emit = defineEmits<{
  insertSymbol: [symbol: string];
  insertMathBlock: [];
  insertMathInline: [];
}>();

// Math symbols organized by category
const mathSymbols = [
  {
    name: 'Greek Letters',
    symbols: [
      { latex: '\\alpha', display: 'α' },
      { latex: '\\beta', display: 'β' },
      { latex: '\\gamma', display: 'γ' },
      { latex: '\\delta', display: 'δ' },
      { latex: '\\epsilon', display: 'ε' },
      { latex: '\\zeta', display: 'ζ' },
      { latex: '\\eta', display: 'η' },
      { latex: '\\theta', display: 'θ' },
      { latex: '\\iota', display: 'ι' },
      { latex: '\\kappa', display: 'κ' },
      { latex: '\\lambda', display: 'λ' },
      { latex: '\\mu', display: 'μ' },
      { latex: '\\nu', display: 'ν' },
      { latex: '\\xi', display: 'ξ' },
      { latex: '\\pi', display: 'π' },
      { latex: '\\rho', display: 'ρ' },
      { latex: '\\sigma', display: 'σ' },
      { latex: '\\tau', display: 'τ' },
      { latex: '\\upsilon', display: 'υ' },
      { latex: '\\phi', display: 'φ' },
      { latex: '\\chi', display: 'χ' },
      { latex: '\\psi', display: 'ψ' },
      { latex: '\\omega', display: 'ω' },
      { latex: '\\Gamma', display: 'Γ' },
      { latex: '\\Delta', display: 'Δ' },
      { latex: '\\Theta', display: 'Θ' },
      { latex: '\\Lambda', display: 'Λ' },
      { latex: '\\Xi', display: 'Ξ' },
      { latex: '\\Pi', display: 'Π' },
      { latex: '\\Sigma', display: 'Σ' },
      { latex: '\\Phi', display: 'Φ' },
      { latex: '\\Psi', display: 'Ψ' },
      { latex: '\\Omega', display: 'Ω' },
    ],
  },
  {
    name: 'Operators',
    symbols: [
      { latex: '+', display: '+' },
      { latex: '-', display: '−' },
      { latex: '\\times', display: '×' },
      { latex: '\\div', display: '÷' },
      { latex: '\\pm', display: '±' },
      { latex: '\\mp', display: '∓' },
      { latex: '\\cdot', display: '·' },
      { latex: '\\ast', display: '∗' },
      { latex: '\\star', display: '⋆' },
      { latex: '\\circ', display: '∘' },
      { latex: '\\bullet', display: '•' },
      { latex: '\\neq', display: '≠' },
      { latex: '\\leq', display: '≤' },
      { latex: '\\geq', display: '≥' },
      { latex: '\\approx', display: '≈' },
      { latex: '\\equiv', display: '≡' },
      { latex: '\\cong', display: '≅' },
      { latex: '\\sim', display: '∼' },
      { latex: '\\propto', display: '∝' },
      { latex: '\\ll', display: '≪' },
      { latex: '\\gg', display: '≫' },
      { latex: '\\subset', display: '⊂' },
      { latex: '\\supset', display: '⊃' },
      { latex: '\\in', display: '∈' },
      { latex: '\\notin', display: '∉' },
      { latex: '\\cup', display: '∪' },
      { latex: '\\cap', display: '∩' },
      { latex: '\\forall', display: '∀' },
      { latex: '\\exists', display: '∃' },
      { latex: '\\partial', display: '∂' },
      { latex: '\\nabla', display: '∇' },
      { latex: '\\infty', display: '∞' },
    ],
  },
  {
    name: 'Calculus',
    symbols: [
      { latex: '\\sum', display: '∑' },
      { latex: '\\prod', display: '∏' },
      { latex: '\\int', display: '∫' },
      { latex: '\\oint', display: '∮' },
      { latex: '\\partial', display: '∂' },
      { latex: '\\nabla', display: '∇' },
      { latex: '\\frac{d}{dx}', display: 'd/dx' },
      { latex: '\\lim', display: 'lim' },
      { latex: '\\lim_{x \\to 0}', display: 'lim→0' },
      { latex: '\\int_a^b', display: '∫ₐᵇ' },
      { latex: '\\iint', display: '∬' },
      { latex: '\\iiint', display: '∭' },
    ],
  },
  {
    name: 'Structures',
    symbols: [
      { latex: '\\sqrt{x}', display: '√x' },
      { latex: '\\sqrt[n]{x}', display: 'ⁿ√x' },
      { latex: 'x^2', display: 'x²' },
      { latex: 'x^n', display: 'xⁿ' },
      { latex: 'x_i', display: 'xᵢ' },
      { latex: 'x_{ij}', display: 'xᵢⱼ' },
      { latex: '\\frac{a}{b}', display: 'a/b' },
      { latex: '\\binom{n}{k}', display: 'C(n,k)' },
      { latex: '\\overline{x}', display: 'x̄' },
      { latex: '\\hat{x}', display: 'x̂' },
      { latex: '\\vec{x}', display: 'x⃗' },
      { latex: '\\dot{x}', display: 'ẋ' },
      { latex: '\\ddot{x}', display: 'ẍ' },
      { latex: '\\tilde{x}', display: 'x̃' },
      { latex: '\\bar{x}', display: 'x̄' },
      { latex: '\\underline{x}', display: 'x̲' },
      { latex: '\\left(\\right)', display: '( )' },
      { latex: '\\left[\\right]', display: '[ ]' },
      { latex: '\\left\\{\\right\\}', display: '{ }' },
      { latex: '\\left|\\right|', display: '| |' },
    ],
  },
  {
    name: 'Sets & Logic',
    symbols: [
      { latex: '\\mathbb{R}', display: 'ℝ' },
      { latex: '\\mathbb{Z}', display: 'ℤ' },
      { latex: '\\mathbb{N}', display: 'ℕ' },
      { latex: '\\mathbb{Q}', display: 'ℚ' },
      { latex: '\\mathbb{C}', display: 'ℂ' },
      { latex: '\\emptyset', display: '∅' },
      { latex: '\\land', display: '∧' },
      { latex: '\\lor', display: '∨' },
      { latex: '\\neg', display: '¬' },
      { latex: '\\implies', display: '⇒' },
      { latex: '\\iff', display: '⇔' },
      { latex: '\\therefore', display: '∴' },
      { latex: '\\because', display: '∵' },
    ],
  },
  {
    name: 'Arrows',
    symbols: [
      { latex: '\\rightarrow', display: '→' },
      { latex: '\\leftarrow', display: '←' },
      { latex: '\\uparrow', display: '↑' },
      { latex: '\\downarrow', display: '↓' },
      { latex: '\\leftrightarrow', display: '↔' },
      { latex: '\\Rightarrow', display: '⇒' },
      { latex: '\\Leftarrow', display: '⇐' },
      { latex: '\\Leftrightarrow', display: '⇔' },
      { latex: '\\mapsto', display: '↦' },
      { latex: '\\to', display: '→' },
      { latex: '\\gets', display: '←' },
      { latex: '\\longmapsto', display: '⟼' },
    ],
  },
];

const isOpen = ref(false);
const activeCategory = ref(0);

function toggle() {
  isOpen.value = !isOpen.value;
}

function selectSymbol(symbol: { latex: string; display: string }) {
  emit('insertSymbol', symbol.latex);
  isOpen.value = false;
}

function insertMathBlock() {
  emit('insertMathBlock');
  isOpen.value = false;
}

function insertMathInline() {
  emit('insertMathInline');
  isOpen.value = false;
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.math-symbols-container')) {
    isOpen.value = false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div
    class="math-symbols-container"
    @keydown="handleKeydown"
  >
    <button
      class="math-symbols-trigger"
      :class="{ active: isOpen }"
      title="Math Symbols (Greek letters, operators)"
      @click.stop="toggle"
    >
      <span class="btn-icon">∑</span>
      <span class="dropdown-arrow">▼</span>
    </button>

    <div
      v-if="isOpen"
      class="math-symbols-dropdown"
      @click.stop
    >
      <div class="math-symbols-header">
        <button
          class="math-type-btn"
          title="Insert inline math $...$"
          @click="insertMathInline"
        >
          <span class="btn-icon">$x$</span>
          <span class="btn-label">Inline</span>
        </button>
        <button
          class="math-type-btn"
          title="Insert block math $$...$$"
          @click="insertMathBlock"
        >
          <span class="btn-icon">$$</span>
          <span class="btn-label">Block</span>
        </button>
      </div>
      
      <div class="math-symbols-tabs">
        <button
          v-for="(category, index) in mathSymbols"
          :key="category.name"
          class="math-tab"
          :class="{ active: activeCategory === index }"
          @click="activeCategory = index"
        >
          {{ category.name }}
        </button>
      </div>
      
      <div class="math-symbols-content">
        <div class="math-symbols-grid">
          <button
            v-for="symbol in mathSymbols[activeCategory].symbols"
            :key="symbol.latex"
            class="math-symbol-btn"
            :title="symbol.latex"
            @click="selectSymbol(symbol)"
          >
            {{ symbol.display }}
          </button>
        </div>
      </div>
      
      <div class="math-symbols-footer">
        <span class="footer-hint">Click to insert symbol</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.math-symbols-container {
  position: relative;
  display: inline-flex;
}

.math-symbols-trigger {
  background: transparent;
  border: 1px solid transparent;
  color: var(--vscode-editor-foreground, #ccc);
  border-radius: 3px;
  padding: 3px 6px;
  cursor: pointer;
  font-size: 13px;
  min-width: 36px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.dropdown-arrow {
  font-size: 8px;
  opacity: 0.7;
}

.math-symbols-trigger:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panel-border, #3c3c3c);
}

.math-symbols-trigger.active {
  background: var(--vscode-button-background, #0e639c);
  border-color: var(--vscode-button-background, #0e639c);
}

.math-symbols-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-editorWidget-border, #454545);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 10001;
  min-width: 280px;
  max-height: 360px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.math-symbols-header {
  display: flex;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid var(--vscode-editorWidget-border, #454545);
}

.math-type-btn {
  flex: 1;
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border: 1px solid var(--vscode-panel-border, #3c3c3c);
  color: var(--vscode-editor-foreground, #ccc);
  border-radius: 3px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.math-type-btn:hover {
  background: var(--vscode-button-background, #0e639c);
  border-color: var(--vscode-button-background, #0e639c);
}

.math-type-btn .btn-icon {
  font-family: monospace;
  font-weight: 600;
  font-size: 12px;
}

.math-type-btn .btn-label {
  font-size: 9px;
  opacity: 0.8;
}

.math-symbols-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--vscode-editorWidget-border, #454545);
  background: var(--vscode-editorGroupHeader-tabsBackground, #1e1e1e);
}

.math-tab {
  background: transparent;
  border: 1px solid transparent;
  color: var(--vscode-descriptionForeground, #888);
  border-radius: 3px;
  padding: 3px 8px;
  cursor: pointer;
  font-size: 10px;
  white-space: nowrap;
}

.math-tab:hover {
  color: var(--vscode-editor-foreground, #ccc);
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.math-tab.active {
  background: var(--vscode-button-background, #0e639c);
  border-color: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #fff);
}

.math-symbols-content {
  padding: 8px;
  overflow-y: auto;
  flex: 1;
}

.math-symbols-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
}

.math-symbol-btn {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  padding: 6px 4px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 32px;
  color: var(--vscode-editor-foreground, #ccc);
}

.math-symbol-btn:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panel-border, #3c3c3c);
}

.math-symbols-footer {
  padding: 6px 8px;
  border-top: 1px solid var(--vscode-editorWidget-border, #454545);
  background: var(--vscode-editorGroupHeader-tabsBackground, #1e1e1e);
}

.footer-hint {
  font-size: 10px;
  color: var(--vscode-descriptionForeground, #666);
}
</style>
