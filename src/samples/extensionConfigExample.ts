/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TestSetup } from '../testSetup';
import { TestReqConfig, ProjectShapeOption, ExtensionConfig } from '../core/types';

/**
 * Example: Configure a test with default Salesforce extensions
 */
async function runTestWithDefaultExtensions() {
  // Basic test configuration using all default Salesforce extensions
  const testConfig: TestReqConfig = {
    projectConfig: {
      projectShape: ProjectShapeOption.NEW
    },
    isOrgRequired: false,
    testSuiteSuffixName: 'DefaultExtensions'
  };

  const testSetup = await TestSetup.setUp(testConfig);

  try {
    // Run your test here...
    console.log('Test with default extensions is running');
  } finally {
    await testSetup.tearDown();
  }
}

/**
 * Example: Configure a test with only core extensions
 */
async function runTestWithCoreExtensionsOnly() {
  // Configure test to only use core extensions (Apex and CLI Integration)
  const coreExtensions: ExtensionConfig[] = [
    {
      extensionId: 'salesforcedx-vscode-core',
      shouldInstall: 'always',
      shouldVerifyActivation: true
    },
    {
      extensionId: 'salesforcedx-vscode-apex',
      shouldInstall: 'always',
      shouldVerifyActivation: true
    }
  ];

  const testConfig: TestReqConfig = {
    projectConfig: {
      projectShape: ProjectShapeOption.NEW
    },
    isOrgRequired: false,
    extensionConfigs: coreExtensions,
    testSuiteSuffixName: 'CoreExtensionsOnly'
  };

  const testSetup = await TestSetup.setUp(testConfig);

  try {
    // Run your test here...
    console.log('Test with core extensions only is running');
  } finally {
    await testSetup.tearDown();
  }
}

/**
 * Example: Configure a test with third-party extensions
 */
async function runTestWithThirdPartyExtensions() {
  // Configure test with third-party VS Code extensions
  const extensionConfigs: ExtensionConfig[] = [
    // Required core extension for Salesforce
    {
      extensionId: 'salesforcedx-vscode-core',
      shouldInstall: 'always',
      shouldVerifyActivation: true
    },
    // Third-party RedHat YAML extension
    {
      extensionId: 'redhat.vscode-yaml',
      name: 'YAML',
      shouldInstall: 'always',
      shouldVerifyActivation: true
    },
    // Third-party Prettier extension
    {
      extensionId: 'esbenp.prettier-vscode',
      name: 'Prettier - Code formatter',
      shouldInstall: 'optional',
      shouldVerifyActivation: true
    }
  ];

  const testConfig: TestReqConfig = {
    projectConfig: {
      projectShape: ProjectShapeOption.NEW
    },
    isOrgRequired: false,
    extensionConfigs: extensionConfigs,
    testSuiteSuffixName: 'ThirdPartyExtensions'
  };

  const testSetup = await TestSetup.setUp(testConfig);

  try {
    // Run your test here...
    console.log('Test with third-party extensions is running');
  } finally {
    await testSetup.tearDown();
  }
}

/**
 * Example: Configure a test with a custom VSIX extension
 */
async function runTestWithCustomVsixExtension() {
  // Configure test with a custom extension from a VSIX file
  const extensionConfigs: ExtensionConfig[] = [
    {
      extensionId: 'my-custom-extension',
      name: 'My Custom Extension',
      shouldInstall: 'always',
      shouldVerifyActivation: true,
      vsixPath: '/path/to/custom-extension.vsix'
    }
  ];

  const testConfig: TestReqConfig = {
    projectConfig: {
      projectShape: ProjectShapeOption.NEW
    },
    isOrgRequired: false,
    extensionConfigs: extensionConfigs,
    testSuiteSuffixName: 'CustomExtension'
  };

  const testSetup = await TestSetup.setUp(testConfig);

  try {
    // Run your test here...
    console.log('Test with custom extension is running');
  } finally {
    await testSetup.tearDown();
  }
}

/**
 * Example: Configure a test with excluded extensions (backward compatibility)
 */
async function runTestWithExcludedExtensions() {
  // Configure test excluding specific extensions
  const testConfig: TestReqConfig = {
    projectConfig: {
      projectShape: ProjectShapeOption.NEW
    },
    isOrgRequired: false,
    excludedExtensions: ['salesforcedx-vscode-apex-debugger', 'salesforcedx-vscode-apex-replay-debugger'],
    testSuiteSuffixName: 'ExcludedExtensions'
  };

  const testSetup = await TestSetup.setUp(testConfig);

  try {
    // Run your test here...
    console.log('Test with excluded extensions is running');
  } finally {
    await testSetup.tearDown();
  }
}

/**
 * Example: Configure a test with mixed extension settings
 */
async function runTestWithMixedExtensionSettings() {
  // Configure test with mixed extension settings
  const extensionConfigs: ExtensionConfig[] = [
    // Required core extensions from Salesforce
    {
      extensionId: 'salesforcedx-vscode-core',
      shouldInstall: 'always',
      shouldVerifyActivation: true
    },
    // Optional extensions that we verify
    {
      extensionId: 'salesforcedx-vscode-apex',
      shouldInstall: 'optional',
      shouldVerifyActivation: true
    },
    // Extensions that we don't need or verify
    {
      extensionId: 'salesforcedx-vscode-lightning',
      shouldInstall: 'never',
      shouldVerifyActivation: false
    },
    // Third-party extension
    {
      extensionId: 'dbaeumer.vscode-eslint',
      name: 'ESLint',
      shouldInstall: 'always',
      shouldVerifyActivation: true
    }
  ];

  const testConfig: TestReqConfig = {
    projectConfig: {
      projectShape: ProjectShapeOption.NEW
    },
    isOrgRequired: false,
    extensionConfigs: extensionConfigs,
    testSuiteSuffixName: 'MixedExtensionSettings'
  };

  const testSetup = await TestSetup.setUp(testConfig);

  try {
    // Run your test here...
    console.log('Test with mixed extension settings is running');

    // You can access the configured extensions during the test
    const requiredExtensions = testSetup.getExtensionsToInstall('always');
    console.log(`Required extensions: ${requiredExtensions.map(ext => ext.extensionId).join(', ')}`);

    const optionalExtensions = testSetup.getExtensionsToInstall('optional');
    console.log(`Optional extensions: ${optionalExtensions.map(ext => ext.extensionId).join(', ')}`);
  } finally {
    await testSetup.tearDown();
  }
}

// Export the example functions
export {
  runTestWithDefaultExtensions,
  runTestWithCoreExtensionsOnly,
  runTestWithThirdPartyExtensions,
  runTestWithCustomVsixExtension,
  runTestWithExcludedExtensions,
  runTestWithMixedExtensionSettings
};
