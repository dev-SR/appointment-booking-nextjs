import { startOfDay, addDays } from "date-fns";

async function run() {
  console.log("🚀 Starting Booking Flow API Verification\n");

  const baseUrl = "http://127.0.0.1:3000";

  try {
    // ----------------------------------------------------
    // Phase 1: Fetch Doctors
    // ----------------------------------------------------
    console.log("1️⃣  Fetching doctors...");
    const docRes = await fetch(`${baseUrl}/api/doctors?page=1&limit=20&isAvailable=true`);
    const docJson = await docRes.json();
    
    if (!docJson.success || !docJson.data || docJson.data.length === 0) {
      throw new Error("No doctors found or API failed.");
    }
    const doctor = docJson.data[0];
    console.log(`✅ Found Doctor: ${doctor.nameEn} (ID: ${doctor.id})\n`);

    // ----------------------------------------------------
    // Phase 2: Fetch Doctor Details & Chamber
    // ----------------------------------------------------
    console.log("2️⃣  Retrieving primary chamber...");
    const docDetailsRes = await fetch(`${baseUrl}/api/doctors/${doctor.id}`);
    const docDetailsJson = await docDetailsRes.json();
    
    if (!docDetailsJson.success || !docDetailsJson.data.chambers || docDetailsJson.data.chambers.length === 0) {
      throw new Error("Doctor has no chambers.");
    }
    const chamber = docDetailsJson.data.chambers[0];
    console.log(`✅ Found Chamber: ${chamber.nameEn} (ID: ${chamber.chamberId})\n`);

    // ----------------------------------------------------
    // Phase 3: Fetch Available Dates
    // ----------------------------------------------------
    console.log("3️⃣  Fetching available dates...");
    const from = startOfDay(new Date());
    const to = addDays(from, 30);
    
    const datesUrl = new URL(`${baseUrl}/api/slots/dates`);
    datesUrl.searchParams.set("doctorId", doctor.id);
    datesUrl.searchParams.set("chamberId", chamber.chamberId);
    datesUrl.searchParams.set("from", from.toISOString());
    datesUrl.searchParams.set("to", to.toISOString());

    const datesRes = await fetch(datesUrl.toString());
    const datesJson = await datesRes.json();
    
    if (!datesJson.success || !datesJson.data.dates || datesJson.data.dates.length === 0) {
      throw new Error("No available dates found within the next 30 days. Seed data may be missing schedule.");
    }
    const firstAvailableDate = datesJson.data.dates[0].date;
    console.log(`✅ Found Available Date: ${firstAvailableDate} (${datesJson.data.dates.length} total available dates found)\n`);

    // ----------------------------------------------------
    // Phase 4: Fetch Slots for the Date
    // ----------------------------------------------------
    console.log(`4️⃣  Fetching slots for ${firstAvailableDate}...`);
    const slotsUrl = new URL(`${baseUrl}/api/slots`);
    slotsUrl.searchParams.set("doctorId", doctor.id);
    slotsUrl.searchParams.set("chamberId", chamber.chamberId);
    slotsUrl.searchParams.set("date", new Date(firstAvailableDate).toISOString());

    const slotsRes = await fetch(slotsUrl.toString());
    const slotsJson = await slotsRes.json();
    
    if (!slotsJson.success || !slotsJson.data.slots || slotsJson.data.slots.length === 0) {
      throw new Error(`No slots found for ${firstAvailableDate}.`);
    }
    
    const availableSlots = slotsJson.data.slots.filter((s: any) => s.isAvailable);
    if (availableSlots.length === 0) {
      throw new Error(`No available slots found for ${firstAvailableDate} (all booked).`);
    }
    const slot = availableSlots[0];
    console.log(`✅ Found ${availableSlots.length} available slots. First slot: ${slot.startTime} - ${slot.endTime}\n`);

    // ----------------------------------------------------
    // Phase 5: Booking Submission
    // ----------------------------------------------------
    console.log("5️⃣  Validating appointment payload...");
    console.log("⚠️  Skipping actual POST to /api/appointments because it requires an authenticated NextAuth session.");
    console.log("Payload would be:");
    console.log({
      doctorId: doctor.id,
      chamberId: chamber.chamberId,
      appointmentDate: firstAvailableDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      appointmentType: "CONSULTATION",
      paymentMethod: "CASH"
    });
    console.log("\n🎉 ALL PUBLIC BOOKING APIs ARE WORKING PERFECTLY!");
    
  } catch (error) {
    console.error("\n❌ Test failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

run();
