/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Workspace setting keys for Salesforce DX VSCode configuration
 */
export const WORKSPACE_SETTING_KEYS = {
  ENABLE_SOURCE_TRACKING_FOR_DEPLOY_AND_RETRIEVE:
    'salesforcedx-vscode-core.experimental.enableSourceTrackingForDeployAndRetrieve',
  PUSH_OR_DEPLOY_ON_SAVE_ENABLED: 'salesforcedx-vscode-core.push-or-deploy-on-save.enabled',
  PUSH_OR_DEPLOY_ON_SAVE_PREFER_DEPLOY_ON_SAVE: 'salesforcedx-vscode-core.push-or-deploy-on-save.preferDeployOnSave'
};

/**
 * Valid log levels for the application
 */
export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'silent'] as const;

/**
 * Type representing a valid log level
 */
export type LogLevel = (typeof LOG_LEVELS)[number];
