/**
 * Main entry point for the Salesforce VSCode Test Tools package
 *
 * This framework provides a comprehensive set of utilities for automating tests
 * for Salesforce Extensions for VS Code. It helps with common tasks such as:
 * - Managing scratch orgs and DevHub connections
 * - Interacting with VS Code UI elements
 * - Executing CLI commands
 * - Managing files and settings
 * - Testing Salesforce-specific components
 *
 * @packageDocumentation
 */

/**
 * Core utilities including basic types, constants, and common functions
 * @module Core
 */
export * from './core';

/**
 * System operation utilities for file system, CLI commands, git, and settings
 * @module SystemOperations
 */
export * from './system-operations';

/**
 * Testing utilities for extension management, test execution, and assertions
 * @module Testing
 */
export * from './testing';

/**
 * UI interaction utilities for working with VS Code interface elements
 * @module UIInteraction
 */
export * from './ui-interaction';

/**
 * Salesforce-specific component utilities for Apex, LWC, Visualforce, etc.
 * @module SalesforceComponents
 */
export * from './salesforce-components';

/**
 * Environment settings for configuring test behavior
 * @module Environment
 */
export * from './environmentSettings';

/**
 * Test setup and runner functionality
 * @module TestSetup
 */
export * from './test-setup-and-runner';
export * from './testSetup';

export { TestConfig } from './core/types';
export { EnvironmentSettings } from './environmentSettings';
