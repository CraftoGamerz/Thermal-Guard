// ThermalGuard — Manager Credentials Store
// Each manager is assigned to a specific state + district
// and can only see thermal data for their district.

export const MANAGERS = [
  { id: 'M001', state: 'Gujarat', district: 'Jamnagar', email: 'manager.jamnagar@thermalguard.in', password: 'TG@jam2026', name: 'Arun Patel', role: 'District Thermal Officer', phone: '+91 98765 43210', joined: '2024-03-15' },
  { id: 'M002', state: 'Gujarat', district: 'Surat', email: 'manager.surat@thermalguard.in', password: 'TG@sur2026', name: 'Priya Shah', role: 'District Thermal Officer', phone: '+91 98765 43211', joined: '2024-04-01' },
  { id: 'M003', state: 'Gujarat', district: 'Vadodara', email: 'manager.vadodara@thermalguard.in', password: 'TG@vad2026', name: 'Rajesh Kumar', role: 'District Thermal Officer', phone: '+91 98765 43212', joined: '2024-04-10' },
  { id: 'M004', state: 'Gujarat', district: 'Bharuch', email: 'manager.bharuch@thermalguard.in', password: 'TG@bha2026', name: 'Meera Desai', role: 'District Thermal Officer', phone: '+91 98765 43213', joined: '2024-05-01' },
  { id: 'M005', state: 'Gujarat', district: 'Ahmedabad', email: 'manager.ahmedabad@thermalguard.in', password: 'TG@ahm2026', name: 'Vikram Joshi', role: 'District Thermal Officer', phone: '+91 98765 43214', joined: '2024-05-15' },
  { id: 'M006', state: 'Punjab', district: 'Ludhiana', email: 'manager.ludhiana@thermalguard.in', password: 'TG@lud2026', name: 'Harpreet Singh', role: 'District Thermal Officer', phone: '+91 98765 43215', joined: '2024-06-01' },
  { id: 'M007', state: 'Punjab', district: 'Amritsar', email: 'manager.amritsar@thermalguard.in', password: 'TG@amr2026', name: 'Gurpreet Kaur', role: 'District Thermal Officer', phone: '+91 98765 43216', joined: '2024-06-15' },
  { id: 'M008', state: 'Punjab', district: 'Patiala', email: 'manager.patiala@thermalguard.in', password: 'TG@pat2026', name: 'Mandeep Sandhu', role: 'District Thermal Officer', phone: '+91 98765 43217', joined: '2024-07-01' },
  { id: 'M009', state: 'Maharashtra', district: 'Mumbai', email: 'manager.mumbai@thermalguard.in', password: 'TG@mum2026', name: 'Sneha Patil', role: 'District Thermal Officer', phone: '+91 98765 43218', joined: '2024-07-15' },
  { id: 'M010', state: 'Maharashtra', district: 'Pune', email: 'manager.pune@thermalguard.in', password: 'TG@pun2026', name: 'Amit Kulkarni', role: 'District Thermal Officer', phone: '+91 98765 43219', joined: '2024-08-01' },
  { id: 'M011', state: 'Rajasthan', district: 'Jaipur', email: 'manager.jaipur@thermalguard.in', password: 'TG@jai2026', name: 'Deepak Sharma', role: 'District Thermal Officer', phone: '+91 98765 43220', joined: '2024-08-15' },
  { id: 'M012', state: 'Tamil Nadu', district: 'Chennai', email: 'manager.chennai@thermalguard.in', password: 'TG@che2026', name: 'Lakshmi Venkat', role: 'District Thermal Officer', phone: '+91 98765 43221', joined: '2024-09-01' },
]

export const STATES_DISTRICTS = {
  'Gujarat': ['Jamnagar', 'Surat', 'Vadodara', 'Bharuch', 'Ahmedabad'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Patiala'],
  'Maharashtra': ['Mumbai', 'Pune'],
  'Rajasthan': ['Jaipur'],
  'Tamil Nadu': ['Chennai'],
}

export function validateLogin(state, district, email, password) {
  return MANAGERS.find(
    m => m.state === state && m.district === district &&
         m.email.toLowerCase() === email.toLowerCase() && m.password === password
  ) || null
}
