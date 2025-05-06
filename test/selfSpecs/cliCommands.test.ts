/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import fs from 'fs';
import { step } from 'mocha-steps';
import { EnvironmentSettings } from '../../src/environmentSettings';
import { expect } from 'chai';
import {
  orgLoginSfdxUrl,
  scratchOrgCreate,
  orgList,
  orgDisplay,
  deleteScratchOrg,
  setAlias
} from '../../src/system-operations';

describe('CLI Commands', async () => {
  const environmentSettings = EnvironmentSettings.getInstance();
  const devHubUserName = environmentSettings.devHubUserName;
  const devHubAliasName = environmentSettings.devHubAliasName;
  const SFDX_AUTH_URL = environmentSettings.sfdxAuthUrl;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let scratchOrg: any;

  step('Authorize to Testing Org', async () => {
    const sfdxAuthUrl = String(SFDX_AUTH_URL);
    const authFilePath = 'authFile.txt';

    if (!devHubUserName) {
      throw new Error('No DEV_HUB_USER_NAME provided');
    }

    // create and write in a text file
    fs.writeFileSync(authFilePath, sfdxAuthUrl);

    const authorizeOrg = await orgLoginSfdxUrl(authFilePath);
    expect(authorizeOrg.stdout).to.include(`Successfully authorized ${devHubUserName}`);

    const setAliasResult = await setAlias(devHubAliasName, devHubUserName);
    expect(setAliasResult.stdout).to.include(devHubAliasName);
    expect(setAliasResult.stdout).to.include(devHubUserName);
    expect(setAliasResult.stdout).to.include('true');
  });

  step('Create a scratch org', async () => {
    const scratchOrgResult = await scratchOrgCreate('developer', 'NONE', 'foo', 1);
    expect(scratchOrgResult.exitCode).to.equal(0);
  });

  step('Find scratch org using org list', async () => {
    const orgListResult = await orgList();
    expect(orgListResult.exitCode).to.equal(0);
    const orgs = JSON.parse(orgListResult.stdout);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(orgs).to.not.be.undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scratchOrg = orgs.result.scratchOrgs.find((org: any) => org.alias === 'foo');
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(scratchOrg).to.not.be.undefined;
  });

  step('Display org using org display', async () => {
    const orgDisplayResult = await orgDisplay('foo');
    const org = JSON.parse(orgDisplayResult.stdout);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(org).to.not.be.undefined;
  });

  after('Delete the scratch org', async () => {
    if (scratchOrg) {
      await deleteScratchOrg('foo');
    }
  });
});
