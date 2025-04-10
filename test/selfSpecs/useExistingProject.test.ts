/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { step } from 'mocha-steps';
import { TestSetup } from '../../src/testSetup';
import { ProjectShapeOption, TestReqConfig, log } from '../../src/core';
import { verifyProjectLoaded } from '../../src/ui-interaction';

describe('Use existing project', async () => {
  const testReqConfig: TestReqConfig = {
    projectConfig: {
      projectShape: ProjectShapeOption.NAMED,
      githubRepoUrl: 'https://github.com/trailheadapps/dreamhouse-lwc.git'
    },
    isOrgRequired: false,
    testSuiteSuffixName: 'UseExistingProject'
  };

  let testSetup: TestSetup;
  step('verify existing project is open', async () => {
    testSetup = await TestSetup.setUp(testReqConfig);
    log(`${testSetup.testSuiteSuffixName} - Verify existing project open`);
    await verifyProjectLoaded('dreamhouse-lwc');
  });
});
