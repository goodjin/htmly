/**
 * Dependency Injection Container
 * 
 * A lightweight IoC container for htmly that enables:
 * - Proper dependency injection for testability
 * - Singleton and factory registration patterns
 * - Decoupled module architecture
 * 
 * @example
 * ```typescript
 * import { container, SERVICE_IDS } from './di';
 * 
 * // Register a singleton service
 * container.registerSingleton(SERVICE_IDS.BACKLINKS_INDEX, () => new BacklinksIndex());
 * 
 * // Resolve the service
 * const backlinksIndex = container.resolve(SERVICE_IDS.BACKLINKS_INDEX);
 * ```
 */

export { ServiceContainer, container } from './container';
export { SERVICE_IDS } from './serviceIdentifiers';
export type { ServiceId } from './serviceIdentifiers';