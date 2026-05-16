const SEED_USERS = [
  {
    id: 'admin-001',
    firstName: 'James', lastName: 'Harrison',
    name: 'Dr. James Harrison',
    email: 'admin@neural.ai',
    password: 'Admin@2024',
    role: 'admin',
    approved: true, rejected: false,
    avatar: 'JH',
    specialty: 'Chief Medical Officer',
    department: 'Neurology & AI Research',
    created: '2024-01-01T00:00:00Z',
  },
  {
    id: 'doc-001',
    firstName: 'Sarah', lastName: 'Chen',
    name: 'Dr. Sarah Chen',
    email: 'sarah.chen@neural.ai',
    password: 'Doctor@123',
    role: 'doctor',
    approved: true, rejected: false,
    avatar: 'SC',
    specialty: 'Neurology',
    license: 'MED-2019-45821',
    hospital: 'MedVision Medical Center',
    experience: '8',
    phone: '+1 (555) 234-5678',
    created: '2024-02-15T10:00:00Z',
  },
  {
    id: 'doc-002',
    firstName: 'Marcus', lastName: 'Williams',
    name: 'Dr. Marcus Williams',
    email: 'marcus.w@neural.ai',
    password: 'Doctor@456',
    role: 'doctor',
    approved: false, rejected: false,
    avatar: 'MW',
    specialty: 'Cardiology',
    license: 'MED-2021-78934',
    hospital: 'City General Hospital',
    experience: '5',
    phone: '+1 (555) 345-6789',
    created: '2024-05-01T09:00:00Z',
  },
  {
    id: 'doc-003',
    firstName: 'Priya', lastName: 'Patel',
    name: 'Dr. Priya Patel',
    email: 'priya.patel@neural.ai',
    password: 'Doctor@789',
    role: 'doctor',
    approved: false, rejected: false,
    avatar: 'PP',
    specialty: 'Radiology',
    license: 'MED-2022-12345',
    hospital: 'Metropolitan Medical Institute',
    experience: '3',
    phone: '+1 (555) 456-7890',
    created: '2024-06-10T14:00:00Z',
  },
  {
    id: 'pat-001',
    firstName: 'Alex', lastName: 'Morgan',
    name: 'Alex Morgan',
    email: 'alex.morgan@email.com',
    password: 'Patient@123',
    role: 'patient',
    approved: true, rejected: false,
    avatar: 'AM',
    dob: '1990-03-22',
    bloodType: 'A+',
    phone: '+1 (555) 567-8901',
    assignedDoctorId: 'doc-001',
    created: '2024-03-10T08:00:00Z',
  },
  {
    id: 'pat-002',
    firstName: 'Jordan', lastName: 'Lee',
    name: 'Jordan Lee',
    email: 'jordan.lee@email.com',
    password: 'Patient@456',
    role: 'patient',
    approved: true, rejected: false,
    avatar: 'JL',
    dob: '1985-07-14',
    bloodType: 'O-',
    phone: '+1 (555) 678-9012',
    assignedDoctorId: 'doc-001',
    created: '2024-04-05T11:00:00Z',
  },
];

export function initAuth() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem('neural_users')) {
    localStorage.setItem('neural_users', JSON.stringify(SEED_USERS));
  }
  if (!localStorage.getItem('neural_patients_linked')) {
    const users = getUsers();
    const migrated = users.map(u => {
      if (u.id === 'pat-001' && !u.assignedDoctorId) return { ...u, assignedDoctorId: 'doc-001' };
      if (u.id === 'pat-002' && !u.assignedDoctorId) return { ...u, assignedDoctorId: 'doc-001' };
      return u;
    });
    localStorage.setItem('neural_users', JSON.stringify(migrated));
    localStorage.setItem('neural_patients_linked', '1');
  }
  if (!localStorage.getItem('neural_notifications_seeded')) {
    const pending = getUsers().filter(u => u.role === 'doctor' && !u.approved && !u.rejected);
    const notifs = pending.map(doc => ({
      id: `notif-seed-${doc.id}`,
      type: 'new_doctor',
      doctorId: doc.id,
      doctorName: doc.name,
      doctorAvatar: doc.avatar || '??',
      specialty: doc.specialty || '—',
      hospital: doc.hospital || '—',
      license: doc.license || '—',
      experience: doc.experience || '—',
      timestamp: doc.created,
      dismissed: false,
    }));
    localStorage.setItem('neural_notifications', JSON.stringify(notifs));
    localStorage.setItem('neural_notifications_seeded', '1');
  }
  if (!localStorage.getItem('neural_appointments_seeded')) {
    localStorage.setItem('neural_appointments', JSON.stringify([
      { id:'appt-s-001', patientId:'pat-001', patientName:'Alex Morgan', doctorId:'doc-001', doctorName:'Dr. Sarah Chen', doctorAvatar:'SC', specialty:'Neurology', date:'2026-05-12', time:'10:00', reason:'Annual neurological checkup', status:'confirmed', created:'2026-05-01T10:00:00Z' },
      { id:'appt-s-002', patientId:'pat-001', patientName:'Alex Morgan', doctorId:'doc-001', doctorName:'Dr. Sarah Chen', doctorAvatar:'SC', specialty:'Neurology', date:'2026-05-20', time:'14:30', reason:'Follow-up consultation', status:'pending', created:'2026-05-05T09:00:00Z' },
    ]));
    localStorage.setItem('neural_appointments_seeded', '1');
  }
  if (!localStorage.getItem('neural_reviews_seeded')) {
    localStorage.setItem('neural_reviews', JSON.stringify([
      { id:'rev-s-001', patientId:'pat-001', patientName:'Alex Morgan', patientAvatar:'AM', doctorId:'doc-001', doctorName:'Dr. Sarah Chen', specialty:'Neurology', rating:5, comment:'Exceptional care and very thorough in explaining my condition. Dr. Chen took the time to answer all my questions. Highly recommend!', created:'2026-04-15T10:00:00Z' },
      { id:'rev-s-002', patientId:'pat-002', patientName:'Jordan Lee', patientAvatar:'JL', doctorId:'doc-001', doctorName:'Dr. Sarah Chen', specialty:'Neurology', rating:4, comment:'Very professional and knowledgeable. The consultation was smooth and I felt well cared for. Would definitely see her again.', created:'2026-04-20T14:00:00Z' },
    ]));
    localStorage.setItem('neural_reviews_seeded', '1');
  }
  if (!localStorage.getItem('neural_chat_permissions_seeded')) {
    localStorage.setItem('neural_chat_permissions', JSON.stringify([
      { id:'perm-seed-001', patientId:'pat-001', patientName:'Alex Morgan', patientAvatar:'AM', doctorId:'doc-001', status:'approved', timestamp:'2026-05-05T09:00:00Z', respondedAt:'2026-05-05T10:00:00Z' },
      { id:'perm-seed-002', patientId:'pat-002', patientName:'Jordan Lee', patientAvatar:'JL', doctorId:'doc-001', status:'approved', timestamp:'2026-05-06T09:00:00Z', respondedAt:'2026-05-06T10:00:00Z' },
    ]));
    localStorage.setItem('neural_chat_permissions_seeded', '1');
  }
  if (!localStorage.getItem('neural_messages_seeded')) {
    localStorage.setItem('neural_messages', JSON.stringify([
      { id:'msg-s-001', fromId:'pat-001', toId:'doc-001', fromName:'Alex Morgan', fromAvatar:'AM', fromRole:'patient', toName:'Dr. Sarah Chen', toAvatar:'SC', toRole:'doctor', text:"Hello Dr. Chen, I've been experiencing some mild headaches lately. Should I be concerned?", timestamp:'2026-05-06T09:00:00Z', read:true },
      { id:'msg-s-002', fromId:'doc-001', toId:'pat-001', fromName:'Dr. Sarah Chen', fromAvatar:'SC', fromRole:'doctor', toName:'Alex Morgan', toAvatar:'AM', toRole:'patient', text:"Hi Alex! Mild headaches can have many causes. Are they occurring at a specific time of day? Any changes in sleep or stress levels recently?", timestamp:'2026-05-06T10:15:00Z', read:true },
      { id:'msg-s-003', fromId:'pat-001', toId:'doc-001', fromName:'Alex Morgan', fromAvatar:'AM', fromRole:'patient', toName:'Dr. Sarah Chen', toAvatar:'SC', toRole:'doctor', text:"They tend to happen in the afternoon. I've been more stressed at work lately.", timestamp:'2026-05-06T10:30:00Z', read:true },
      { id:'msg-s-004', fromId:'doc-001', toId:'pat-001', fromName:'Dr. Sarah Chen', fromAvatar:'SC', fromRole:'doctor', toName:'Alex Morgan', toAvatar:'AM', toRole:'patient', text:"That makes sense — tension headaches are very common with stress. Stay hydrated, take regular breaks, and aim for 7–8 hours of sleep. If they persist or worsen, let's schedule a check-up.", timestamp:'2026-05-06T10:45:00Z', read:true },
      { id:'msg-s-005', fromId:'pat-001', toId:'doc-001', fromName:'Alex Morgan', fromAvatar:'AM', fromRole:'patient', toName:'Dr. Sarah Chen', toAvatar:'SC', toRole:'doctor', text:"Thank you so much, Doctor! I'll follow your advice. See you at my appointment on the 12th 🙏", timestamp:'2026-05-06T11:00:00Z', read:true },
      { id:'msg-s-006', fromId:'doc-001', toId:'pat-001', fromName:'Dr. Sarah Chen', fromAvatar:'SC', fromRole:'doctor', toName:'Alex Morgan', toAvatar:'AM', toRole:'patient', text:"Perfect! Looking forward to seeing you then. Don't hesitate to message me if anything comes up before that. Take care!", timestamp:'2026-05-06T11:05:00Z', read:true },
      { id:'msg-s-007', fromId:'pat-002', toId:'doc-001', fromName:'Jordan Lee', fromAvatar:'JL', fromRole:'patient', toName:'Dr. Sarah Chen', toAvatar:'SC', toRole:'doctor', text:"Hi Dr. Chen, I wanted to ask about my latest MRI results. When will they be available for review?", timestamp:'2026-05-07T14:00:00Z', read:true },
      { id:'msg-s-008', fromId:'doc-001', toId:'pat-002', fromName:'Dr. Sarah Chen', fromAvatar:'SC', fromRole:'doctor', toName:'Jordan Lee', toAvatar:'JL', toRole:'patient', text:"Hi Jordan! The results should be ready within 24-48 hours. I'll review them personally and reach out to you as soon as I have feedback. In the meantime, please don't worry — your previous scan showed no concerns.", timestamp:'2026-05-07T14:30:00Z', read:false },
    ]));
    localStorage.setItem('neural_messages_seeded', '1');
  }
}

export function getUsers() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('neural_users') || '[]'); }
  catch { return []; }
}

export function signup(data) {
  const users = getUsers();
  if (users.some(u => u.email === data.email)) throw new Error('Email already registered');
  const user = {
    id: `user-${Date.now()}`,
    name: `${data.firstName} ${data.lastName}`,
    avatar: `${data.firstName[0]}${data.lastName[0]}`.toUpperCase(),
    ...data,
    approved: data.role === 'patient',
    rejected: false,
    created: new Date().toISOString(),
  };
  users.push(user);
  localStorage.setItem('neural_users', JSON.stringify(users));
  return user;
}

export function login(email, password) {
  initAuth();
  const user = getUsers().find(u => u.email === email && u.password === password);
  if (!user) throw new Error('Invalid email or password');
  const session = { ...user };
  delete session.password;
  localStorage.setItem('neural_current_user', JSON.stringify(session));
  return session;
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('neural_current_user') || 'null'); }
  catch { return null; }
}

export function logout() {
  if (typeof window !== 'undefined') localStorage.removeItem('neural_current_user');
}

export function updateUserApproval(userId, approved, rejected = false) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    users[idx].approved = approved;
    users[idx].rejected = rejected;
    localStorage.setItem('neural_users', JSON.stringify(users));
  }
}

export function getUserById(id) {
  return getUsers().find(u => u.id === id) || null;
}

export function getPendingDoctors() {
  return getUsers().filter(u => u.role === 'doctor' && !u.approved && !u.rejected);
}

export function getAllDoctors() {
  return getUsers().filter(u => u.role === 'doctor');
}

export function getAllPatients() {
  return getUsers().filter(u => u.role === 'patient');
}

export function getStats() {
  const users = getUsers();
  const docs = users.filter(u => u.role === 'doctor');
  return {
    totalDoctors: docs.length,
    approvedDoctors: docs.filter(u => u.approved).length,
    pendingDoctors: docs.filter(u => !u.approved && !u.rejected).length,
    rejectedDoctors: docs.filter(u => u.rejected).length,
    totalPatients: users.filter(u => u.role === 'patient').length,
  };
}

export function getNotifications() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('neural_notifications') || '[]'); }
  catch { return []; }
}

export function getActiveNotifications() {
  return getNotifications().filter(n => !n.dismissed);
}

export function createDoctorNotification(doctor) {
  if (typeof window === 'undefined') return;
  const notifs = getNotifications();
  if (notifs.some(n => n.doctorId === doctor.id && !n.dismissed)) return;
  notifs.push({
    id: `notif-${Date.now()}`,
    type: 'new_doctor',
    doctorId: doctor.id,
    doctorName: doctor.name,
    doctorAvatar: doctor.avatar || '??',
    specialty: doctor.specialty || '—',
    hospital: doctor.hospital || '—',
    license: doctor.license || '—',
    experience: doctor.experience || '—',
    timestamp: new Date().toISOString(),
    dismissed: false,
  });
  localStorage.setItem('neural_notifications', JSON.stringify(notifs));
}

export function dismissNotification(id) {
  const notifs = getNotifications();
  const idx = notifs.findIndex(n => n.id === id);
  if (idx !== -1) {
    notifs[idx].dismissed = true;
    localStorage.setItem('neural_notifications', JSON.stringify(notifs));
  }
}

export function deleteUser(userId) {
  const users = getUsers().filter(u => u.id !== userId);
  localStorage.setItem('neural_users', JSON.stringify(users));
}

export function getPatientsByDoctor(doctorId) {
  return getUsers().filter(u => u.role === 'patient' && u.assignedDoctorId === doctorId);
}

function getAppointments() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('neural_appointments') || '[]'); }
  catch { return []; }
}

export function bookAppointment(data) {
  if (typeof window === 'undefined') return;
  const list = getAppointments();
  list.push({ id:`appt-${Date.now()}`, ...data, created: new Date().toISOString() });
  localStorage.setItem('neural_appointments', JSON.stringify(list));
}

export function getAppointmentsByPatient(patientId) {
  return getAppointments().filter(a => a.patientId === patientId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function cancelAppointment(id) {
  const list = getAppointments();
  const idx = list.findIndex(a => a.id === id);
  if (idx !== -1) {
    list[idx].status = 'cancelled';
    localStorage.setItem('neural_appointments', JSON.stringify(list));
  }
}

export function getAppointmentsByDoctor(doctorId) {
  return getAppointments()
    .filter(a => a.doctorId === doctorId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function confirmAppointment(id) {
  const list = getAppointments();
  const idx = list.findIndex(a => a.id === id);
  if (idx !== -1) {
    list[idx].status = 'confirmed';
    list[idx].confirmedAt = new Date().toISOString();
    localStorage.setItem('neural_appointments', JSON.stringify(list));
  }
}

export function proposeAlternative(id, altDate, altTime, altNote) {
  const list = getAppointments();
  const idx = list.findIndex(a => a.id === id);
  if (idx !== -1) {
    list[idx].status = 'counter_proposed';
    list[idx].altDate = altDate;
    list[idx].altTime = altTime;
    list[idx].altNote = altNote || '';
    localStorage.setItem('neural_appointments', JSON.stringify(list));
  }
}

export function acceptAlternative(id) {
  const list = getAppointments();
  const idx = list.findIndex(a => a.id === id);
  if (idx !== -1) {
    const a = list[idx];
    a.status = 'confirmed';
    a.date = a.altDate;
    a.time = a.altTime;
    a.confirmedAt = new Date().toISOString();
    delete a.altDate; delete a.altTime; delete a.altNote;
    localStorage.setItem('neural_appointments', JSON.stringify(list));
  }
}

function getReviews() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('neural_reviews') || '[]'); }
  catch { return []; }
}

export function addReview(data) {
  if (typeof window === 'undefined') return;
  const filtered = getReviews().filter(r => !(r.patientId === data.patientId && r.doctorId === data.doctorId));
  filtered.push({ id:`rev-${Date.now()}`, ...data, created: new Date().toISOString() });
  localStorage.setItem('neural_reviews', JSON.stringify(filtered));
}

export function getReviewsByDoctor(doctorId) {
  return getReviews().filter(r => r.doctorId === doctorId)
    .sort((a, b) => new Date(b.created) - new Date(a.created));
}

export function getAllReviews() {
  return getReviews().sort((a, b) => new Date(b.created) - new Date(a.created));
}

export function getDoctorRating(doctorId) {
  const reviews = getReviewsByDoctor(doctorId);
  if (!reviews.length) return { avg: 0, count: 0 };
  return {
    avg: Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10,
    count: reviews.length,
  };
}

export function respondToReview(reviewId, response) {
  if (typeof window === 'undefined') return;
  const list = getReviews();
  const idx = list.findIndex(r => r.id === reviewId);
  if (idx !== -1) {
    list[idx].doctorResponse = response.trim();
    list[idx].responseDate = new Date().toISOString();
    localStorage.setItem('neural_reviews', JSON.stringify(list));
  }
}

export function getTopRatedDoctors(limit = 5) {
  return getAllDoctors()
    .filter(d => d.approved)
    .map(d => ({ ...d, ...getDoctorRating(d.id) }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count)
    .slice(0, limit);
}

function getMessages() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('neural_messages') || '[]'); }
  catch { return []; }
}

export function sendMessage(data) {
  if (typeof window === 'undefined') return null;
  const list = getMessages();
  const msg = { id:`msg-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, ...data, timestamp: new Date().toISOString(), read: false };
  list.push(msg);
  localStorage.setItem('neural_messages', JSON.stringify(list));
  return msg;
}

export function getMessagesBetween(id1, id2) {
  return getMessages()
    .filter(m => (m.fromId === id1 && m.toId === id2) || (m.fromId === id2 && m.toId === id1))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export function markMessagesRead(fromId, toId) {
  const list = getMessages();
  let changed = false;
  list.forEach(m => {
    if (m.fromId === fromId && m.toId === toId && !m.read) { m.read = true; changed = true; }
  });
  if (changed) localStorage.setItem('neural_messages', JSON.stringify(list));
}

export function getConversations(userId) {
  const msgs = getMessages().filter(m => m.fromId === userId || m.toId === userId);
  const map = {};
  msgs.forEach(m => {
    const isFrom = m.fromId === userId;
    const pid = isFrom ? m.toId : m.fromId;
    if (!map[pid]) {
      map[pid] = { partnerId: pid, partnerName: isFrom ? m.toName : m.fromName, partnerAvatar: isFrom ? m.toAvatar : m.fromAvatar, partnerRole: isFrom ? m.toRole : m.fromRole, lastMessage: '', lastTimestamp: '', unreadCount: 0 };
    }
    if (!map[pid].lastTimestamp || new Date(m.timestamp) > new Date(map[pid].lastTimestamp)) {
      map[pid].lastMessage = m.text;
      map[pid].lastTimestamp = m.timestamp;
    }
    if (!isFrom && !m.read) map[pid].unreadCount++;
  });
  return Object.values(map).sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));
}

export function getUnreadCount(userId) {
  if (typeof window === 'undefined') return 0;
  return getMessages().filter(m => m.toId === userId && !m.read).length;
}

/* ── Chat permissions ───────────────────────────────────────────── */
function getChatPermissions() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('neural_chat_permissions') || '[]'); }
  catch { return []; }
}

export function requestChatPermission(patientId, patientName, patientAvatar, doctorId) {
  const perms = getChatPermissions();
  const idx   = perms.findIndex(p => p.patientId === patientId && p.doctorId === doctorId);
  const perm  = { id: idx >= 0 ? perms[idx].id : `perm-${Date.now()}`, patientId, patientName, patientAvatar, doctorId, status:'pending', timestamp: new Date().toISOString() };
  if (idx >= 0) perms[idx] = perm; else perms.push(perm);
  localStorage.setItem('neural_chat_permissions', JSON.stringify(perms));
  return perm;
}

export function getChatPermission(patientId, doctorId) {
  return getChatPermissions().find(p => p.patientId === patientId && p.doctorId === doctorId) || null;
}

export function respondToChatPermission(patientId, doctorId, approved) {
  const perms = getChatPermissions();
  const idx   = perms.findIndex(p => p.patientId === patientId && p.doctorId === doctorId);
  if (idx !== -1) {
    perms[idx].status      = approved ? 'approved' : 'denied';
    perms[idx].respondedAt = new Date().toISOString();
    localStorage.setItem('neural_chat_permissions', JSON.stringify(perms));
  }
}

export function getPendingChatRequests(doctorId) {
  return getChatPermissions().filter(p => p.doctorId === doctorId && p.status === 'pending');
}

/* ── Scan reports (extracted from messages) ─────────────────────── */
export function getPatientScanReports(patientId) {
  if (typeof window === 'undefined') return [];
  try {
    const msgs = JSON.parse(localStorage.getItem('neural_messages') || '[]');
    return msgs
      .filter(m => m.toId === patientId && m.type === 'scan_report' && m.reportData)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch { return []; }
}

/* ── AI scan usage tracking ─────────────────────────────────────── */
export function recordAiScan(doctorId) {
  if (typeof window === 'undefined') return;
  try {
    const log = JSON.parse(localStorage.getItem('neural_ai_scan_log') || '[]');
    log.push({ doctorId, timestamp: new Date().toISOString() });
    localStorage.setItem('neural_ai_scan_log', JSON.stringify(log));
  } catch {}
}

export function getAiScansToday() {
  if (typeof window === 'undefined') return 0;
  try {
    const today = new Date().toISOString().split('T')[0];
    // Count scan_report messages sent today (chat-based scans)
    const msgs = JSON.parse(localStorage.getItem('neural_messages') || '[]');
    const msgScans = msgs.filter(m => m.type === 'scan_report' && m.timestamp && m.timestamp.startsWith(today)).length;
    // Count standalone Brain Scan tab usage logged separately
    const log = JSON.parse(localStorage.getItem('neural_ai_scan_log') || '[]');
    const logScans = log.filter(e => e.timestamp && e.timestamp.startsWith(today)).length;
    return msgScans + logScans;
  } catch { return 0; }
}

export function getTotalUsers() {
  return getUsers().length;
}
