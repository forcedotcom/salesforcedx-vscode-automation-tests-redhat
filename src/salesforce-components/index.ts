/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Salesforce Development Components
 *
 * This module provides utilities for working with various Salesforce components
 * such as Apex classes, Lightning Web Components, Visualforce pages, and deployment operations.
 */

// Apex Development
export * from './apexUtils';

// Web Components
export * from './lwcUtils';

// Visualforce
export * from './visualforceUtils';

// Deployment
export * from './deployAndRetrieve';

// Org Management
export * from './orgBrowser';

// Re-export everything from authorization except OrgEdition
export { setUpScratchOrg, authorizeDevHub, deleteScratchOrgInfo } from './authorization';

// Re-export CLI commands
export * from '../system-operations/cliCommands';
