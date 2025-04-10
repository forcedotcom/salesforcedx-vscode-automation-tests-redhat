import { Locator } from 'vscode-extension-tester';
import { Duration } from '../core/miscellaneous';
import { getBrowser } from '../ui-interaction/workbench';

/**
 * Interface for combining a predicate function with a maximum wait time
 */
export interface PredicateWithTimeout {
  predicate: () => Promise<boolean>;
  maxWaitTime: Duration; // in milliseconds
}

/**
 * Standard predicate functions for common scenarios
 */
export const standardPredicates = {
  /**
   * A predicate that always returns true
   * Useful for testing or as a default value
   */
  alwaysTrue: async () => true,

  /**
   * Waits for an element to be displayed
   * @param selector - The locator for the element to wait for
   * @returns true when the element is displayed
   */
  waitForElement: async (selector: Locator) => {
    return await getBrowser().findElement(selector).isDisplayed();
  },

  /**
   * Polls until a condition is true
   * @param condition - A function that returns true when the desired condition is met
   * @returns true when the condition is satisfied
   */
  waitForCondition: async (condition: () => boolean) => {
    while (!condition()) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Adjust polling interval as needed
    }
    return true;
  }
};

/**
 * Creates a predicate with an associated timeout
 * @param predicate - The function to evaluate
 * @param maxWaitTime - Maximum time to wait for the predicate to return true
 * @returns A PredicateWithTimeout object
 */
export function createPredicateWithTimeout(
  predicate: () => Promise<boolean>,
  maxWaitTime: Duration
): PredicateWithTimeout {
  return {
    predicate,
    maxWaitTime
  };
}
