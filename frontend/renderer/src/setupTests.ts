import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Configuration globale pour Jest
global.jest = jest as unknown as typeof global.jest;

// Mock des API du navigateur
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock pour le gc global
Object.defineProperty(window, 'gc', { 
  value: jest.fn() 
});