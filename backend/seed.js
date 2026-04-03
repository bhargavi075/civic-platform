require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Department = require('./models/Department');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/civic_platform');
  console.log('🔌 Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Complaint.deleteMany({});
  await Department.deleteMany({});
  console.log('🗑️ Cleared existing data');

  // Departments
  const depts = await Department.insertMany([
    { name: 'Roads Department',       keywords: ['pothole', 'road', 'street', 'pavement', 'crack', 'bump'],                              description: 'Handles road and street maintenance',        slaHigh: 24, slaMedium: 72,  slaLow: 168 },
    { name: 'Municipal Department',   keywords: ['garbage', 'waste', 'trash', 'litter', 'sanitation', 'dirty'],                          description: 'Handles waste management and sanitation',    slaHigh: 24, slaMedium: 72,  slaLow: 168 },
    { name: 'Electricity Department', keywords: ['streetlight', 'power outage', 'electricity', 'electric', 'blackout', 'lamp'],          description: 'Handles electrical infrastructure',          slaHigh: 24, slaMedium: 72,  slaLow: 168 },
    { name: 'Water Department',       keywords: ['water', 'leak', 'pipe', 'drainage', 'flood', 'sewage'],                                description: 'Handles water supply and drainage',          slaHigh: 24, slaMedium: 72,  slaLow: 168 },
    { name: 'Parks Department',       keywords: ['park', 'tree', 'garden', 'playground', 'bench', 'grass'],                              description: 'Handles parks and green spaces',             slaHigh: 72, slaMedium: 168, slaLow: 336  }
  ]);
  console.log('✅ Departments seeded');

  // Admin
  const admin = new User({ name: 'Admin User', email: 'admin@demo.com', password: 'demo123', role: 'admin' });
  await admin.save();

  // ─── Officers: 5 per department (25 total) ────────────────────────────────
  const officerData = [
    // Roads Department
    { name: 'John Officer',    email: 'officer@demo.com',              password: 'demo123', department: 'Roads Department',       jurisdiction: 'Hyderabad Central', jurisdictionCoords: { lat: 17.3850, lng: 78.4867, radius: 8 } },
    { name: 'Arjun Reddy',     email: 'arjun.reddy@roads.gov',        password: 'demo123', department: 'Roads Department',       jurisdiction: 'Secunderabad',      jurisdictionCoords: { lat: 17.4399, lng: 78.4983, radius: 8 } },
    { name: 'Suresh Kumar',    email: 'suresh.kumar@roads.gov',       password: 'demo123', department: 'Roads Department',       jurisdiction: 'LB Nagar',          jurisdictionCoords: { lat: 17.3467, lng: 78.5524, radius: 8 } },
    { name: 'Kavitha Rao',     email: 'kavitha.rao@roads.gov',        password: 'demo123', department: 'Roads Department',       jurisdiction: 'Kukatpally',        jurisdictionCoords: { lat: 17.4849, lng: 78.3995, radius: 8 } },
    { name: 'Venkat Naidu',    email: 'venkat.naidu@roads.gov',       password: 'demo123', department: 'Roads Department',       jurisdiction: 'Uppal',             jurisdictionCoords: { lat: 17.4053, lng: 78.5597, radius: 8 } },

    // Municipal Department
    { name: 'Priya Sharma',    email: 'officer2@demo.com',            password: 'demo123', department: 'Municipal Department',   jurisdiction: 'Hyderabad North',   jurisdictionCoords: { lat: 17.4580, lng: 78.4711, radius: 8 } },
    { name: 'Ramesh Gupta',    email: 'ramesh.gupta@municipal.gov',   password: 'demo123', department: 'Municipal Department',   jurisdiction: 'Jubilee Hills',     jurisdictionCoords: { lat: 17.4320, lng: 78.4071, radius: 8 } },
    { name: 'Lakshmi Devi',    email: 'lakshmi.devi@municipal.gov',   password: 'demo123', department: 'Municipal Department',   jurisdiction: 'Ameerpet',          jurisdictionCoords: { lat: 17.3720, lng: 78.4510, radius: 8 } },
    { name: 'Srinivas Rao',    email: 'srinivas.rao@municipal.gov',   password: 'demo123', department: 'Municipal Department',   jurisdiction: 'Dilsukhnagar',      jurisdictionCoords: { lat: 17.3687, lng: 78.5265, radius: 8 } },
    { name: 'Anand Teja',      email: 'anand.teja@municipal.gov',     password: 'demo123', department: 'Municipal Department',   jurisdiction: 'Mehdipatnam',       jurisdictionCoords: { lat: 17.3947, lng: 78.4346, radius: 8 } },

    // Electricity Department
    { name: 'Ravi Shankar',    email: 'ravi.shankar@electricity.gov', password: 'demo123', department: 'Electricity Department', jurisdiction: 'Banjara Hills',     jurisdictionCoords: { lat: 17.4100, lng: 78.4400, radius: 8 } },
    { name: 'Deepa Menon',     email: 'deepa.menon@electricity.gov',  password: 'demo123', department: 'Electricity Department', jurisdiction: 'Gachibowli',        jurisdictionCoords: { lat: 17.4400, lng: 78.3489, radius: 8 } },
    { name: 'Sunil Varma',     email: 'sunil.varma@electricity.gov',  password: 'demo123', department: 'Electricity Department', jurisdiction: 'Malakpet',          jurisdictionCoords: { lat: 17.3794, lng: 78.5000, radius: 8 } },
    { name: 'Pooja Nair',      email: 'pooja.nair@electricity.gov',   password: 'demo123', department: 'Electricity Department', jurisdiction: 'KPHB Colony',       jurisdictionCoords: { lat: 17.4903, lng: 78.3900, radius: 8 } },
    { name: 'Kishore Babu',    email: 'kishore.babu@electricity.gov', password: 'demo123', department: 'Electricity Department', jurisdiction: 'Nacharam',          jurisdictionCoords: { lat: 17.4100, lng: 78.5500, radius: 8 } },

    // Water Department
    { name: 'Madhavi Latha',   email: 'madhavi.latha@water.gov',      password: 'demo123', department: 'Water Department',       jurisdiction: 'Nampally',          jurisdictionCoords: { lat: 17.3840, lng: 78.4730, radius: 8 } },
    { name: 'Prakash Reddy',   email: 'prakash.reddy@water.gov',      password: 'demo123', department: 'Water Department',       jurisdiction: 'Tarnaka',           jurisdictionCoords: { lat: 17.4312, lng: 78.5310, radius: 8 } },
    { name: 'Swathi Rao',      email: 'swathi.rao@water.gov',         password: 'demo123', department: 'Water Department',       jurisdiction: 'Himayatnagar',      jurisdictionCoords: { lat: 17.4022, lng: 78.4806, radius: 8 } },
    { name: 'Naveen Chandra',  email: 'naveen.chandra@water.gov',     password: 'demo123', department: 'Water Department',       jurisdiction: 'Malkajgiri',        jurisdictionCoords: { lat: 17.4533, lng: 78.5259, radius: 8 } },
    { name: 'Bhavani Devi',    email: 'bhavani.devi@water.gov',       password: 'demo123', department: 'Water Department',       jurisdiction: 'Alwal',             jurisdictionCoords: { lat: 17.4953, lng: 78.5100, radius: 8 } },

    // Parks Department
    { name: 'Vinod Kumar',     email: 'vinod.kumar@parks.gov',        password: 'demo123', department: 'Parks Department',       jurisdiction: 'Necklace Road',     jurisdictionCoords: { lat: 17.4060, lng: 78.4720, radius: 8 } },
    { name: 'Saritha Reddy',   email: 'saritha.reddy@parks.gov',      password: 'demo123', department: 'Parks Department',       jurisdiction: 'Sanjeevaiah Park',  jurisdictionCoords: { lat: 17.4210, lng: 78.4620, radius: 8 } },
    { name: 'Ashok Babu',      email: 'ashok.babu@parks.gov',         password: 'demo123', department: 'Parks Department',       jurisdiction: 'KBR Park',          jurisdictionCoords: { lat: 17.4290, lng: 78.4240, radius: 8 } },
    { name: 'Rekha Kumari',    email: 'rekha.kumari@parks.gov',       password: 'demo123', department: 'Parks Department',       jurisdiction: 'Indira Park',       jurisdictionCoords: { lat: 17.4170, lng: 78.4740, radius: 8 } },
    { name: 'Sanjay Verma',    email: 'sanjay.verma@parks.gov',       password: 'demo123', department: 'Parks Department',       jurisdiction: 'Lumbini Park',      jurisdictionCoords: { lat: 17.4030, lng: 78.4720, radius: 8 } },
  ];

  const savedOfficers = [];
  for (const data of officerData) {
    const officer = new User({ ...data, role: 'officer' });
    await officer.save();
    savedOfficers.push(officer);
  }
  console.log(`✅ ${savedOfficers.length} officers seeded (5 per department)`);

  // Helper
  const byDept = (name) => savedOfficers.filter(o => o.department === name);
  const roadsOfficers       = byDept('Roads Department');
  const municipalOfficers   = byDept('Municipal Department');
  const electricityOfficers = byDept('Electricity Department');
  const waterOfficers       = byDept('Water Department');
  const parksOfficers       = byDept('Parks Department');

  // Citizens
  const citizen1 = new User({ name: 'Rahul Citizen', email: 'citizen@demo.com',  password: 'demo123', role: 'citizen' });
  const citizen2 = new User({ name: 'Anita Verma',   email: 'citizen2@demo.com', password: 'demo123', role: 'citizen' });
  await citizen1.save();
  await citizen2.save();
  console.log('✅ Citizens seeded');

  // Sample complaints
  const sampleComplaints = [
    { title: 'Large pothole on MG Road near bus stop',         description: 'There is a dangerous pothole approximately 2 feet wide and 6 inches deep near the main bus stop causing accidents',  latitude: 17.3850, longitude: 78.4867, isAnonymous: false, citizenId: citizen1._id, severity: 4, votes: 23, status: 'InProgress',  officerId: roadsOfficers[0]._id },
    { title: 'Road crack on Tank Bund Road',                   description: 'A long crack has appeared on the road surface posing risk to two-wheelers',                                          latitude: 17.4180, longitude: 78.4720, isAnonymous: false, citizenId: citizen2._id, severity: 3, votes: 10, status: 'Pending',     officerId: roadsOfficers[1]._id },
    { title: 'Garbage overflowing from bins in Jubilee Hills', description: 'The garbage bins near Jubilee Hills market have not been cleared for 3 days and garbage is spilling onto the road', latitude: 17.4320, longitude: 78.4071, isAnonymous: true,  severity: 3, votes: 12, status: 'Pending' },
    { title: 'Waste dumping near Ameerpet flyover',            description: 'Unscientific waste dumping is happening near the flyover creating a health hazard',                                  latitude: 17.3720, longitude: 78.4510, isAnonymous: false, citizenId: citizen1._id, severity: 4, votes: 18, status: 'InProgress',  officerId: municipalOfficers[2]._id },
    { title: 'Street light not working near school',           description: 'Three street lights near Government Primary School have been non-functional for over a week',                        latitude: 17.3600, longitude: 78.5000, isAnonymous: false, citizenId: citizen2._id, severity: 3, votes: 8,  status: 'Pending' },
    { title: 'Power outage in Gachibowli residential area',    description: 'Recurring power outages lasting 4+ hours affecting work-from-home professionals',                                   latitude: 17.4400, longitude: 78.3489, isAnonymous: false, citizenId: citizen1._id, severity: 4, votes: 30, status: 'InProgress',  officerId: electricityOfficers[1]._id },
    { title: 'Water pipeline burst on Banjara Hills road',     description: 'A major water pipeline has burst causing water logging and disruption to traffic and water supply',                  latitude: 17.4100, longitude: 78.4400, isAnonymous: false, citizenId: citizen1._id, severity: 5, votes: 45, status: 'Resolved',    officerId: waterOfficers[0]._id, resolutionNote: 'Pipeline repaired and road restored. Water supply normalized.' },
    { title: 'Leaking tap in public restroom Tarnaka',         description: 'Public restroom tap has been leaking for two weeks causing water wastage',                                          latitude: 17.4312, longitude: 78.5310, isAnonymous: true,  severity: 2, votes: 5,  status: 'Pending',     officerId: waterOfficers[1]._id },
    { title: 'Broken playground equipment in Necklace Road',   description: 'The swings and slide in the children park near Necklace Road are broken and pose a safety hazard',                  latitude: 17.4060, longitude: 78.4720, isAnonymous: false, citizenId: citizen2._id, severity: 2, votes: 5,  status: 'Pending',     officerId: parksOfficers[0]._id },
    { title: 'Dead trees in KBR Park need removal',            description: 'Several dead trees are at risk of falling and injuring park visitors',                                               latitude: 17.4290, longitude: 78.4240, isAnonymous: false, citizenId: citizen1._id, severity: 3, votes: 14, status: 'InProgress',  officerId: parksOfficers[2]._id },
    { title: 'Sewage overflow near Ameerpet',                  description: 'Sewage water is overflowing onto the footpath in Ameerpet residential area creating unhygienic conditions',        latitude: 17.3720, longitude: 78.4510, isAnonymous: true,  severity: 4, votes: 31, status: 'InProgress',  officerId: waterOfficers[2]._id },
    { title: 'No street lights on Uppal bypass road',          description: 'The entire stretch of the Uppal bypass road has no functional street lights making it dangerous at night',          latitude: 17.4053, longitude: 78.5597, isAnonymous: false, citizenId: citizen2._id, severity: 5, votes: 40, status: 'Pending',     officerId: electricityOfficers[4]._id },
  ];

  for (const c of sampleComplaints) {
    const complaint = new Complaint(c);
    complaint.priority = complaint.calculatePriority();
    await complaint.save();
  }
  console.log('✅ Sample complaints seeded');

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('Demo credentials:');
  console.log('  Admin:    admin@demo.com      / demo123');
  console.log('  Officers: officer@demo.com    / demo123  (Roads - Hyderabad Central)');
  console.log('            officer2@demo.com   / demo123  (Municipal - Hyderabad North)');
  console.log('  Citizen:  citizen@demo.com    / demo123\n');
  console.log('Officers per department:');
  console.log('  Roads Department       → 5 officers');
  console.log('  Municipal Department   → 5 officers');
  console.log('  Electricity Department → 5 officers');
  console.log('  Water Department       → 5 officers');
  console.log('  Parks Department       → 5 officers');
  console.log('  Total                  → 25 officers\n');

  process.exit(0);
};

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
