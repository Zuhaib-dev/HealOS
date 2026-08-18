describe("Critical Clinical Flows", () => {
  beforeEach(() => {
    // Clear cookies before each test
    cy.clearCookies();
  });

  describe("Authentication", () => {
    it("should show the landing page for unauthenticated users", () => {
      cy.visit("/");
      cy.contains("Your Health Journey, Simplified").should("be.visible");
    });

    it("should redirect unauthenticated users away from protected routes", () => {
      cy.visit("/patient");
      // Should redirect to auth/login or home
      cy.url().should("not.include", "/patient");
    });
  });

  describe("Patient Flow", () => {
    beforeEach(() => {
      // Mock patient login and data
      cy.loginAs("PATIENT");
      
      // Mock the dashboard stats API call
      cy.intercept("GET", "**/api/v1/patient/dashboard**", {
        statusCode: 200,
        body: {
          success: true,
          data: {
            upcomingAppointments: [],
            recentPrescriptions: [],
            recentLabResults: [],
            stats: {
              totalAppointments: 2,
              activePrescriptions: 1,
              unreadReports: 0
            }
          }
        }
      }).as("getPatientDashboard");
    });

    it("should allow a patient to view their dashboard", () => {
      cy.visit("/patient");
      cy.wait("@session");
      cy.wait("@getPatientDashboard");

      // Verify patient dashboard renders
      cy.contains("Overview").should("be.visible");
      cy.contains("Upcoming Appointments").should("be.visible");
    });
  });

  describe("Admin Flow", () => {
    beforeEach(() => {
      // Mock admin login
      cy.loginAs("ADMIN");
      
      // Mock the admin stats API call
      cy.intercept("GET", "**/api/v1/admin/stats**", {
        statusCode: 200,
        body: {
          success: true,
          data: {
            totalPatients: 150,
            totalDoctors: 25,
            totalAppointments: 300,
            revenue: 45000
          }
        }
      }).as("getAdminStats");
    });

    it("should allow an admin to view their dashboard", () => {
      cy.visit("/admin");
      cy.wait("@session");
      
      // Since admin stats might be fetched, we can wait if necessary, 
      // but verifying basic rendering is enough for structural E2E.
      cy.contains("System Administration").should("be.visible");
      cy.contains("Manage Users").should("be.visible");
    });
  });
});
