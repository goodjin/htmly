import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Allowed domains for iframe embeds
 */
const ALLOWED_EMBED_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'codepen.io',
  'codesandbox.io',
];

/**
 * Convert various URL formats to embed URLs
 */
export function toEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // YouTube: Convert watch URL to embed URL
    const ytMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    // YouTube short URLs
    if (parsed.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${parsed.pathname}`;
    }

    // Vimeo
    if (parsed.hostname.endsWith('vimeo.com')) {
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      }
    }

    // CodePen - convert to embed format
    if (parsed.hostname.endsWith('codepen.io')) {
      const cpMatch = url.match(/codepen\.io\/([^/]+)\/pen\/([^/?]+)/);
      if (cpMatch) {
        return `https://codepen.io/${cpMatch[1]}/embed/${cpMatch[2]}?default-tab=result`;
      }
      // Already in embed format
      if (url.includes('/embed/')) {
        return url;
      }
    }

    // CodeSandbox
    if (parsed.hostname.endsWith('codesandbox.io')) {
      const csMatch = url.match(/codesandbox\.io\/s\/([^/?]+)/);
      if (csMatch) {
        return `https://codesandbox.io/embed/${csMatch[1]}?fontsize=14&hidenavigation=1&theme=dark&view=preview`;
      }
      // Already in embed format
      if (url.includes('/embed/')) {
        return url;
      }
    }

    // Validate domain is in allowlist
    if (!ALLOWED_EMBED_DOMAINS.some((d) => parsed.hostname.endsWith(d))) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is from an allowed embed domain
 */
export function isAllowedEmbedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_EMBED_DOMAINS.some((d) => parsed.hostname.endsWith(d));
  } catch {
    return false;
  }
}

/**
 * Get domain label for error messages
 */
export function getEmbedDomainLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

/**
 * Embed block extension for Tiptap
 *
 * Provides an iframe embed with:
 * - URL sanitization for security
 * - Support for YouTube, Vimeo, CodePen, CodeSandbox
 * - 16:9 aspect ratio container
 * - Responsive sizing
 *
 * Serializes to: <div class="embed-block"><iframe src="..."></iframe></div>
 */
export const Embed = Node.create({
  name: 'embed',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => {
          const iframe = element.querySelector('iframe');
          return iframe?.getAttribute('src') || null;
        },
        renderHTML: (attributes) => {
          if (!attributes.src) return {};
          return { 'data-src': attributes.src };
        },
      },
      type: {
        default: 'youtube',
        parseHTML: (element) => {
          const iframe = element.querySelector('iframe');
          const src = iframe?.getAttribute('src') || '';
          if (src.includes('youtube.com') || src.includes('youtu.be')) return 'youtube';
          if (src.includes('vimeo.com')) return 'vimeo';
          if (src.includes('codepen.io')) return 'codepen';
          if (src.includes('codesandbox.io')) return 'codesandbox';
          return 'other';
        },
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div.embed-block' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const src = node.attrs.src;
    if (!src) {
      return ['div', mergeAttributes({ class: 'embed-block embed-block--empty' }), ['p', {}, 'Invalid embed URL']];
    }

    return [
      'div',
      mergeAttributes({ class: 'embed-block' }, HTMLAttributes),
      ['iframe', { src, frameborder: '0', allowfullscreen: '', allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture', loading: 'lazy' }],
    ];
  },

  addCommands() {
    return {
      insertEmbed:
        (src: string) =>
        ({ commands }) => {
          const embedUrl = toEmbedUrl(src);
          if (!embedUrl) {
            return false;
          }
          return commands.insertContent({
            type: this.name,
            attrs: { src: embedUrl },
          });
        },
      updateEmbedSrc:
        (src: string) =>
        ({ commands }) => {
          const embedUrl = toEmbedUrl(src);
          if (!embedUrl) {
            return false;
          }
          return commands.updateAttributes(this.name, { src: embedUrl });
        },
    };
  },

  addKeyboardShortcuts() {
    return {};
  },
});
