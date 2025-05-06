# Extension Configuration in Tests

This document describes how to configure extensions for automated VS Code testing.

## Overview

The extension configuration system allows you to control which VS Code extensions are installed and verified during test setup. This makes it possible to run tests with different combinations of extensions based on test requirements.

## Key Components

- **TestReqConfig**: The main configuration type used for test setup
- **ExtensionConfig**: Configuration for individual extensions
- **TestSetup**: Class that handles setting up the test environment
- **salesforceExtensions.ts**: Predefined Salesforce extensions (separated from core utilities)

## Using Extension Configurations

### Basic Usage

By default, all Salesforce extensions will be configured with their default settings:

```typescript
const testConfig: TestReqConfig = {
  projectConfig: {
    projectShape: ProjectShapeOption.NEW
  },
  isOrgRequired: false,
  testSuiteSuffixName: 'DefaultExtensions'
};

const testSetup = await TestSetup.setUp(testConfig);
```

### Configuring Specific Extensions

To specify which extensions to use and how they should be configured:

```typescript
const extensionConfigs: ExtensionConfig[] = [
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
  extensionConfigs: extensionConfigs,
  testSuiteSuffixName: 'CustomExtensionConfig'
};
```

### Using Custom Extensions

You can now specify any VS Code extension, not just the predefined Salesforce extensions:

```typescript
const extensionConfigs: ExtensionConfig[] = [
  // Required core extension
  {
    extensionId: 'salesforcedx-vscode-core',
    shouldInstall: 'always',
    shouldVerifyActivation: true
  },
  // Custom third-party extension
  {
    extensionId: 'redhat.vscode-yaml',
    name: 'YAML',
    shouldInstall: 'always',
    shouldVerifyActivation: true
  },
  // Custom extension from a VSIX file
  {
    extensionId: 'my-custom-extension',
    name: 'My Custom Extension',
    shouldInstall: 'always',
    shouldVerifyActivation: true,
    vsixPath: '/path/to/my-extension.vsix'
  }
];
```

### Excluding Extensions (Backward Compatibility)

For backward compatibility, you can still exclude extensions:

```typescript
const testConfig: TestReqConfig = {
  projectConfig: {
    projectShape: ProjectShapeOption.NEW
  },
  isOrgRequired: false,
  excludedExtensions: ['salesforcedx-vscode-apex-debugger', 'salesforcedx-vscode-apex-replay-debugger'],
  testSuiteSuffixName: 'ExcludedExtensions'
};
```

## Extension Configuration Options

Each extension can be configured with the following options:

- **extensionId**: The ID of the extension (can be any valid VS Code extension ID)
- **name**: Optional display name for the extension (defaults to extensionId if not provided)
- **shouldInstall**: Whether the extension should be installed
  - `'always'`: Always install the extension
  - `'never'`: Never install the extension
  - `'optional'`: Install the extension if available
- **shouldVerifyActivation**: Whether to verify the extension is activated during test setup
- **vsixPath**: Optional path to a VSIX file for custom extension installation

## Accessing Extension Configuration During Tests

Once the test is set up, you can access the configured extensions:

```typescript
// Get extensions that should be verified
const extensionsToVerify = testSetup.getExtensionsToVerify();

// Get extensions with specific installation option
const requiredExtensions = testSetup.getExtensionsToInstall('always');
const optionalExtensions = testSetup.getExtensionsToInstall('optional');
```

## Predefined Extensions

The predefined Salesforce extensions are now defined in a separate file `salesforceExtensions.ts`, which makes it easier to maintain and customize. If you need to reference the default Salesforce extensions directly, you can import them:

```typescript
import { salesforceExtensions } from './testing/salesforceExtensions';
```

## Example Usage

See `src/samples/extensionConfigExample.ts` for complete examples of different extension configuration scenarios.

## VSIX Installation Directory

In addition to configuring individual extensions, you can specify a dedicated directory containing VSIX files to be installed during test setup using the `vsixToInstallDir` property in the `TestConfig` interface. This separates the source of VSIX files from the extensions folder where they get installed.

You can configure this in two ways:

1. Environment variable: `VSIX_TO_INSTALL`
2. Programmatically through the `TestConfig` interface

Example setting a custom VSIX directory in your test:

```typescript
import { TestSetupAndRunner, TestConfig } from '@salesforce/salesforcedx-vscode-test-tools';

const testConfig: Partial<TestConfig> = {
  vsixToInstallDir: '/path/to/vsix-directory'
};

const testRunner = new TestSetupAndRunner(testConfig);
await testRunner.setup();
```

If a VSIX installation directory is specified, the framework will:

1. Look for VSIX files in this directory first
2. Install all VSIX files found in this directory
3. Skip looking in the extensions folder if VSIXs are found in the specified directory

If both the `TestConfig` and environment variable are set, the `TestConfig` value takes precedence.
