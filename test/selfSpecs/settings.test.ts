/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { step } from 'mocha-steps';
import { Duration, pause } from '../../src/core';
import { disableBooleanSetting, enableBooleanSetting } from '../../src/system-operations';

describe('Settings', async () => {
  step('Test Settings', async () => {
    await disableBooleanSetting('editor.find.addExtraSpaceOnTop', 'user');
    await pause(Duration.seconds(5));
    await enableBooleanSetting('editor.find.addExtraSpaceOnTop', 'user');
    await pause(Duration.seconds(5));
  });
});
