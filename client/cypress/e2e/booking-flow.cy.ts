describe("Appointment Booking Flow", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.loginAs("PATIENT");

    // Mock initial dashboard call so it doesn't fail
    cy.intercept("GET", "**/api/v1/patient/dashboard**", {
      statusCode: 200,
      body: { success: true, data: { upcomingAppointments: [], recentPrescriptions: [], recentLabResults: [], stats: {} } }
    }).as("getPatientDashboard");

    // Mock Doctors List API
    cy.intercept("GET", "**/api/v1/appointments/doctors-list", {
      statusCode: 200,
      body: {
        success: true,
        doctors: [
          {
            _id: "doc123",
            name: "Gregory House",
            email: "house@test.com",
            phone: "1234567890",
            avatarUrl: "",
            role: "DOCTOR",
            specialization: "General Medicine",
            degree: "MD"
          }
        ]
      }
    }).as("getDoctorsList");

    // Mock Booking API
    cy.intercept("POST", "**/api/v1/appointments/book", {
      statusCode: 201,
      body: {
        success: true,
        message: "Appointment booked successfully!",
        appointment: {
          _id: "appt123",
          department: "General Medicine",
          date: "2026-10-15",
          timeSlot: "10:00",
          status: "PENDING",
          type: "IN_PERSON",
          doctor: { name: "Gregory House" }
        }
      }
    }).as("bookAppointment");
  });

  it("should allow a patient to book a cash appointment", () => {
    // Visit patient dashboard
    cy.visit("/patient");
    cy.wait("@session");
    cy.wait("@getPatientDashboard");

    // Navigate to Book section
    cy.contains("Book").click();
    cy.wait("@getDoctorsList");

    // Verify Book Panel rendered
    cy.contains("Book an appointment").should("be.visible");

    // Select the doctor
    cy.contains("Dr. Gregory House").click();

    // Select Cash payment method
    cy.contains("Pay at Desk").click();

    // Select a date
    // We can't easily interact with the complex react-day-picker calendar deterministically in a simple test without custom classes.
    // However, the calendar usually has the current day enabled. We can try clicking the current day, or any available day.
    // The easiest way is to find a day button that is not disabled.
    cy.get(".rdp-day:not(.rdp-day_disabled)").first().click();

    // Select a time slot
    cy.contains("10:00").click();

    // Enter visit reason
    cy.get("textarea").type("Frequent headaches and fatigue.");

    // Submit booking
    cy.contains("Confirm Booking").click();
    cy.wait("@bookAppointment");

    // Verify success confirmation view
    cy.contains("Appointment Confirmed").should("be.visible");
    cy.contains("Dr. Gregory House").should("be.visible");
    cy.contains("General Medicine").should("be.visible");
  });
});
