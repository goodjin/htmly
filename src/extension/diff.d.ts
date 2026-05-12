/**
 * Type declarations for the 'diff' package
 */
declare module 'diff' {
  export interface Change {
    value: string;
    added?: boolean;
    removed?: boolean;
  }

  export interface diffOptions {
    ignoreWhitespace?: boolean;
    ignoreNewlineAtEof?: boolean;
    stripTrailingCr?: boolean;
    newlineIsToken?: boolean;
  }

  export interface wordDiffOptions {
    ignoreCase?: boolean;
    intlSegmenter?: Intl.Segmenter;
  }

  export interface charDiffOptions {
    ignoreCase?: boolean;
  }

  export function diffChars(oldStr: string, newStr: string, options?: charDiffOptions): Change[];
  export function diffWords(oldStr: string, newStr: string, options?: wordDiffOptions): Change[];
  export function diffWordsWithSpace(oldStr: string, newStr: string, options?: wordDiffOptions): Change[];
  export function diffLines(oldStr: string, newStr: string, options?: diffOptions): Change[];
  export function diffSentences(oldStr: string, newStr: string, options?: diffOptions): Change[];
  export function diffCss(oldStr: string, newStr: string, options?: diffOptions): Change[];
  export function diffJson(oldObj: object, newObj: object, options?: diffOptions): Change[];
  export function diffArrays(oldArr: unknown[], newArr: unknown[], options?: { comparator?: (left: unknown, right: unknown) => boolean }): Change[];

  export interface PatchOptions {
    context?: number;
    ignoreWhitespace?: boolean;
    stripTrailingCr?: boolean;
  }

  export function createTwoFilesPatch(
    oldFileName: string,
    newFileName: string,
    oldStr: string,
    newStr: string,
    oldHeader?: string,
    newHeader?: string,
    options?: PatchOptions
  ): string;

  export function createUnifiedDiff(
    oldFileName: string,
    newFileName: string,
    oldStr: string,
    newStr: string,
    options?: PatchOptions
  ): string;
}
