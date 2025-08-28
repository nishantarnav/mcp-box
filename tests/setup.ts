/**
 * Test Setup
 * Global setup for Jest tests including mocks and utilities
 */

import { jest } from '@jest/globals';

// Mock chalk module
jest.mock('chalk', () => ({
  default: {
    cyan: { bold: jest.fn((str: string) => str) },
    green: jest.fn((str: string) => str),
    red: jest.fn((str: string) => str),
    yellow: jest.fn((str: string) => str),
    gray: jest.fn((str: string) => str),
    bold: jest.fn((str: string) => str)
  }
}));

// Mock ora module
jest.mock('ora', () => {
  const mockSpinner = {
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    warn: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis()
  };
  return {
    default: jest.fn(() => mockSpinner)
  };
});

// Mock cli-table3 module
jest.mock('cli-table3', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      push: jest.fn(),
      toString: jest.fn().mockReturnValue('mocked table')
    }))
  };
});

// Mock keytar module for keychain tests
jest.mock('keytar', () => ({
  default: {
    setPassword: jest.fn(),
    getPassword: jest.fn(),
    deletePassword: jest.fn(),
    findCredentials: jest.fn()
  }
}));

// Mock fs-extra for file system tests
jest.mock('fs-extra', () => ({
  ...jest.requireActual('fs-extra'),
  ensureDir: jest.fn(),
  pathExists: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  stat: jest.fn()
}));

// Mock inquirer for interactive tests
jest.mock('inquirer', () => ({
  default: {
    prompt: jest.fn()
  }
}));

// Test utilities
export const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Mock console methods
  jest.spyOn(console, 'log').mockImplementation(mockConsole.log);
  jest.spyOn(console, 'error').mockImplementation(mockConsole.error);
  jest.spyOn(console, 'warn').mockImplementation(mockConsole.warn);
});

afterEach(() => {
  // Restore console methods
  jest.restoreAllMocks();
});