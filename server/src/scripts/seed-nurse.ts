import mongoose from "mongoose";
import { envConfig as env } from "../config/env.js";
import { FluidBalance } from "../models/fluid-balance.model.js";
import { CallBell } from "../models/call-bell.model.js";
import { MarDose } from "../models/mar-dose.model.js";
import { Wound } from "../models/wound.model.js";
import { Handover } from "../models/handover.model.js";
import { User } from "../models/user.model.js";

const marDoses = [
  { bed: "W3-06", patient: "Rahul Menon", drug: "Piperacillin/Tazobactam", dose: "4.5 g", route: "IV", time: "14:00", window: "13:45–14:15", state: "overdue", highAlert: true, note: "Second dose of sepsis bundle" },
  { bed: "W3-06", patient: "Rahul Menon", drug: "Paracetamol", dose: "1 g", route: "IV", time: "14:00", window: "13:45–14:15", state: "due" },
  { bed: "W3-09", patient: "Ayesha Khan", drug: "Enoxaparin", dose: "40 mg", route: "SC", time: "14:15", window: "14:00–14:30", state: "due" },
  { bed: "W3-09", patient: "Ayesha Khan", drug: "Oxycodone", dose: "5 mg", route: "PO", time: "14:30", window: "PRN q4h", state: "due", controlled: true, note: "Witness signature required" },
  { bed: "W3-11", patient: "Daniel Osei", drug: "Furosemide", dose: "40 mg", route: "IV", time: "13:30", window: "13:15–13:45", state: "given" },
  { bed: "W3-11", patient: "Daniel Osei", drug: "Ramipril", dose: "2.5 mg", route: "PO", time: "13:30", window: "13:15–13:45", state: "held", note: "Held — systolic 96, MO informed" },
  { bed: "W3-14", patient: "Lena Fischer", drug: "Insulin (Actrapid) infusion", dose: "3 units/hr", route: "IV", time: "hourly", window: "titrate to BGL", state: "due", highAlert: true },
  { bed: "W3-17", patient: "Ibrahim Sayed", drug: "Fascia iliaca block top-up", dose: "20 mL 0.25%", route: "IM", time: "15:00", window: "14:45–15:15", state: "due" },
];

const fluidBalances = [
  { bed: "W3-06", patient: "Rahul Menon", intakeOral: 350, intakeIV: 1800, outputUrine: 900, outputDrain: 0, target: 800 },
  { bed: "W3-09", patient: "Ayesha Khan", intakeOral: 700, intakeIV: 500, outputUrine: 1100, outputDrain: 60, target: 0 },
  { bed: "W3-11", patient: "Daniel Osei", intakeOral: 600, intakeIV: 120, outputUrine: 1650, outputDrain: 0, target: -1000, restriction: 1200 },
  { bed: "W3-14", patient: "Lena Fischer", intakeOral: 900, intakeIV: 2400, outputUrine: 2500, outputDrain: 0, target: 500 },
];

const wounds = [
  { bed: "W3-17", patient: "Ibrahim Sayed", site: "Sacrum", type: "Pressure injury", stage: "Stage 2", size: "3.1 × 2.4 cm", exudate: "low", dressing: "Hydrocolloid", lastChange: "Yesterday 21:10", nextChange: "Today 21:00", healing: [42, 40, 37, 33, 30, 28], photoNote: "Peri-wound intact, no odour", overdue: false },
  { bed: "W3-09", patient: "Ayesha Khan", site: "Port sites × 4", type: "Surgical", stage: "Primary closure", size: "12 mm each", exudate: "nil", dressing: "Island dressing", lastChange: "Today 08:00", nextChange: "Tomorrow 08:00", healing: [20, 18, 15, 12, 10, 8], photoNote: "Dry, edges apposed", overdue: false },
  { bed: "W3-11", patient: "Daniel Osei", site: "Right lower leg", type: "Venous ulcer", stage: "Granulating 60%", size: "5.8 × 4.2 cm", exudate: "high", dressing: "Foam + compression", lastChange: "Today 06:30", nextChange: "Today 14:00", healing: [70, 68, 66, 63, 61, 58], photoNote: "Strike-through at 06:30 — increase absorbency", overdue: true },
];

const handovers = [
  { bed: "W3-06", patientName: "Rahul Menon", situation: "Septic, NEWS2 8, escalated 13:40.", background: "CAP day 2, on O2 4L NP, lactate 3.1.", assessment: "Tachypnoeic 26, SpO2 89% on 4L, MAP 70.", recommendation: "Hourly obs, repeat lactate 15:00, ICU outreach reviewing.", acuity: "critical", status: "PENDING" },
  { bed: "W3-11", patientName: "Daniel Osei", situation: "Negative balance −1.0 L target, on track.", background: "HFrEF EF 28%, IV furosemide BD.", assessment: "Weight down 0.9 kg, mild ankle oedema.", recommendation: "Strict balance, daily weight 06:00, watch K+.", acuity: "stable", status: "PENDING" },
  { bed: "W3-17", patientName: "Ibrahim Sayed", situation: "Awaiting theatre, NBM from 22:00.", background: "NOF fracture, on fascia iliaca block.", assessment: "Pain 3/10 at rest, delirium screen due.", recommendation: "4AT screen this shift, pressure care 2-hourly.", acuity: "stable", status: "PENDING" },
];

const callBells = [
  { bed: "W3-06", patient: "Rahul Menon", type: "emergency", raised: "13:58", waitedSec: 42, state: "waiting" },
  { bed: "W3-14", patient: "Lena Fischer", type: "IV alarm", raised: "13:56", waitedSec: 168, state: "waiting" },
  { bed: "W3-17", patient: "Ibrahim Sayed", type: "bathroom", raised: "13:54", waitedSec: 300, state: "accepted", acceptedBy: "N. Rao" },
  { bed: "W3-09", patient: "Ayesha Khan", type: "pain", raised: "13:41", waitedSec: 96, state: "closed", acceptedBy: "S. Fernandes" },
];

async function seed() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected to MongoDB");

    await FluidBalance.deleteMany({});
    await CallBell.deleteMany({});
    await MarDose.deleteMany({});
    await Wound.deleteMany({});
    // ONLY delete handovers that were seeded for nurses (have bed field)
    await Handover.deleteMany({ bed: { $exists: true } });

    await FluidBalance.insertMany(fluidBalances);
    console.log("FluidBalances seeded");

    await CallBell.insertMany(callBells);
    console.log("CallBells seeded");

    await MarDose.insertMany(marDoses);
    console.log("MarDoses seeded");

    await Wound.insertMany(wounds);
    console.log("Wounds seeded");

    // For Handovers, we need ObjectIds for patient and fromDoctor to pass schema validation
    // Let's get any dummy user and doctor
    const dummyUser = await User.findOne() || new mongoose.Types.ObjectId();
    const dummyDoctor = await User.findOne({ role: "DOCTOR" }) || dummyUser;
    
    const mappedHandovers = handovers.map(h => ({
      ...h,
      patient: dummyUser._id,
      fromDoctor: dummyDoctor._id
    }));

    await Handover.insertMany(mappedHandovers);
    console.log("Handovers seeded");

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding DB:", error);
    process.exit(1);
  }
}

seed();
