/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import { fail } from 'assert';
import { log } from 'console';
import { executeQuickPick, notificationIsPresentWithTimeout, attemptToFindOutputPanelText, getOperationTime, verifyOutputPanelText } from '../ui-interaction';
import { Duration } from '../core/miscellaneous';

/**
 * Runs a Salesforce deployment or retrieval command and validates the results
 * @param operation - The operation to perform (Deploy/Retrieve)
 * @param fromTo - The direction of the operation (To/From)
 * @param operationType - Text to identify operation type (source tracking enabled/disabled, deploy on save)
 * @param metadataType - The type of metadata being operated on
 * @param fullName - The full name of the metadata item
 * @param prefix - Optional prefix to check for in the output
 */
export const runAndValidateCommand = async (
  operation: string,
  fromTo: string,
  operationType: string,
  metadataType: string,
  fullName: string,
  prefix?: string
): Promise<void> => {
  log(`runAndValidateCommand()`);
  await executeQuickPick(`SFDX: ${operation} This Source ${fromTo} Org`, Duration.seconds(5));

  await validateCommand(operation, fromTo, operationType, metadataType, [fullName], prefix);
};

export const validateCommand = async (
  operation: string,
  fromTo: string,
  operationType: string, // Text to identify operation operationType (if it has source tracking enabled, disabled or if it was a deploy on save),
  metadataType: string,
  fullNames: string[],
  prefix = ''
): Promise<void> => {
  log(`validateCommand()`);
  const successNotificationWasFound = await notificationIsPresentWithTimeout(
    new RegExp(`SFDX: ${operation} This Source ${fromTo} Org successfully ran`),
    Duration.TEN_MINUTES
  );
  expect(successNotificationWasFound).to.equal(true);

  // Verify Output tab
  const outputPanelText = await attemptToFindOutputPanelText(
    'Salesforce CLI',
    `Starting SFDX: ${operation} This Source ${fromTo}`,
    10
  );

  log(`${operation} time ${operationType}: ` + (await getOperationTime(outputPanelText!)));

  const pathSeparator = process.platform === 'win32' ? '\\' : '/';
  const longestFullName = fullNames.reduce((a, b) => (a.length > b.length ? a : b), '');
  const expectedTexts = constructExpectedTexts(
    operation,
    fromTo,
    metadataType,
    fullNames,
    prefix,
    longestFullName,
    pathSeparator
  );

  if (!outputPanelText) {
    fail('No output panel text found');
  }
  await verifyOutputPanelText(outputPanelText, expectedTexts);
};

/**
 * Determines the number of spaces needed to align the output text
 * @param longestFullName - The longest full name in the list of full names
 * @param currentFileName - The full name of the current file that is used to calculate the size of the spacer
 * @returns - A string of spaces to align the output text
 */
export const calculateSpacer = (longestFullName: string, currentFileName: string): string => {
  let numberOfSpaces = 2;
  if (longestFullName.length < 'FULL_NAME'.length) {
    numberOfSpaces += 'FULL_NAME'.length - currentFileName.length;
  } else {
    numberOfSpaces += longestFullName.length - currentFileName.length;
  }
  return ' '.repeat(numberOfSpaces);
};

/**
 * Constructs the expected texts for validation based on metadata type and file paths.
 * @param operation - The operation being performed (e.g., Deploy, Retrieve).
 * @param fromTo - The direction of the operation (e.g., To, From).
 * @param metadataType - The type of metadata being processed.
 * @param fullNames - The list of metadata full names.
 * @param prefix - Optional prefix to check for in the Output Tab.
 * @param longestFullName - The longest full name in the list of full names.
 * @param pathSeparator - The platform-specific path separator.
 * @returns - An array of expected texts for validation.
 */
const constructExpectedTexts = (
  operation: string,
  fromTo: string,
  metadataType: string,
  fullNames: string[],
  prefix: string,
  longestFullName: string,
  pathSeparator: string
): string[] => {
  const expectedTexts = [
    `${operation}ed Source`.replace('Retrieveed', 'Retrieved'),
    `ended SFDX: ${operation} This Source ${fromTo} Org`
  ];

  const metadataPaths: Record<string, string> = {
    ApexClass: `force-app${pathSeparator}main${pathSeparator}default${pathSeparator}classes`,
    ExternalServiceRsegistration: `force-app${pathSeparator}main${pathSeparator}default${pathSeparator}externalServiceRegistrations`,
    CustomObject: `force-app${pathSeparator}main${pathSeparator}default${pathSeparator}objects`,
    CustomField: `force-app${pathSeparator}main${pathSeparator}default${pathSeparator}objects`
  };

  if (!metadataPaths[metadataType]) {
    return expectedTexts;
  }

  const metadataPath = metadataPaths[metadataType];
  const additionalTexts = fullNames.flatMap(fullName => {
    const spacer = calculateSpacer(longestFullName, fullName);
    if (metadataType === 'CustomObject') {
      return [
        `${prefix}${fullName}${spacer}${metadataType}  ${metadataPath}${pathSeparator}${fullName}${pathSeparator}${fullName}.object-meta.xml`
      ];
    } else if (metadataType === 'ExternalServiceRegistration') {
      return [
        `${prefix}${fullName}${spacer}${metadataType}  ${metadataPath}${pathSeparator}${fullName}.externalServiceRegistration-meta.xml`
      ];
    } else if (metadataType === 'ApexClass') {
      return [
        `${prefix}${fullName}${spacer}${metadataType}  ${metadataPath}${pathSeparator}${fullName}.cls`,
        `${prefix}${fullName}${spacer}${metadataType}  ${metadataPath}${pathSeparator}${fullName}.cls-meta.xml`
      ];
    } else if (metadataType === 'CustomField') {
      const [objectName, fieldName] = fullName.split('.');
      const customObjectSpacer = calculateSpacer(fullName, objectName);
      if (operation === 'Retrieve') {
        return [
          `${prefix}${fullName}${spacer}${metadataType}   ${metadataPath}${pathSeparator}${objectName}${pathSeparator}fields${pathSeparator}${fieldName}.field-meta.xml`,
          `${prefix}${objectName}${customObjectSpacer}CustomObject  ${metadataPath}${pathSeparator}${objectName}${pathSeparator}${objectName}.object-meta.xml`
        ];
      } else {
        return `${prefix}${fullName}${spacer}${metadataType}  ${metadataPath}${pathSeparator}${objectName}${pathSeparator}fields${pathSeparator}${fieldName}.field-meta.xml`;
      }
    }
  });

  additionalTexts.filter((text): text is string => text !== undefined).forEach(text => expectedTexts.push(text));
  return expectedTexts;
};
