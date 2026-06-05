/**
 * Service Container for Dependency Injection
 * 
 * A lightweight IoC container that supports:
 * - Factory registration with `register()`
 * - Singleton registration with `registerSingleton()`
 * - Service resolution with `resolve()`
 * - Instance checking with `isRegistered()`
 * - Service reset with `reset()`
 */

import type { ServiceId } from './serviceIdentifiers';

interface ServiceDescriptor<T> {
  factory: () => T;
  singleton: boolean;
  instance?: T;
}

export class ServiceContainer {
  private services = new Map<ServiceId, ServiceDescriptor<unknown>>();

  /**
   * Register a factory for a service
   * @param id Service identifier (Symbol)
   * @param factory Factory function that creates the service instance
   */
  register<T>(id: ServiceId, factory: () => T): void {
    this.services.set(id, { factory, singleton: false });
  }

  /**
   * Register a singleton service
   * The factory is called only once, and the same instance is returned on subsequent resolves
   * @param id Service identifier (Symbol)
   * @param factory Factory function that creates the service instance
   */
  registerSingleton<T>(id: ServiceId, factory: () => T): void {
    this.services.set(id, { factory, singleton: true });
  }

  /**
   * Resolve a service by its identifier
   * @param id Service identifier (Symbol)
   * @returns The service instance
   * @throws Error if the service is not registered
   */
  resolve<T>(id: ServiceId): T {
    const descriptor = this.services.get(id);
    
    if (!descriptor) {
      throw new Error(`Service not registered: ${String(id)}`);
    }

    if (descriptor.singleton) {
      if (!descriptor.instance) {
        descriptor.instance = descriptor.factory();
      }
      return descriptor.instance as T;
    }

    return descriptor.factory() as T;
  }

  /**
   * Check if a service is registered
   * @param id Service identifier (Symbol)
   * @returns True if the service is registered
   */
  isRegistered(id: ServiceId): boolean {
    return this.services.has(id);
  }

  /**
   * Reset the container, clearing all registrations and singleton instances
   */
  reset(): void {
    this.services.clear();
  }

  /**
   * Override a service registration (useful for testing)
   * @param id Service identifier (Symbol)
   * @param instance The instance to use
   */
  override<T>(id: ServiceId, instance: T): void {
    this.services.set(id, { factory: () => instance, singleton: true, instance });
  }
}

/**
 * Global service container instance
 */
export const container = new ServiceContainer();