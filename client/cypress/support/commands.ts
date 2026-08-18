// cypress/support/commands.ts

/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Mocks the NextAuth session for a specific role
       * @example cy.loginAs('PATIENT')
       */
      loginAs(role: 'PATIENT' | 'ADMIN' | 'DOCTOR' | 'NURSE' | 'RECEPTIONIST' | 'PHARMACIST' | 'LAB_TECHNICIAN' | 'RADIOLOGIST'): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginAs', (role) => {
  // Intercept the NextAuth session endpoint to return a mock session
  cy.intercept('GET', '/api/auth/session', {
    statusCode: 200,
    body: {
      user: {
        id: "mock-user-id",
        name: `Mock ${role}`,
        email: `mock_${role.toLowerCase()}@example.com`,
        role: role,
        isEmailVerified: true
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  }).as('session');

  // Intercept the NextAuth providers endpoint
  cy.intercept('GET', '/api/auth/providers', {
    statusCode: 200,
    body: {}
  }).as('providers');
});

export {};
