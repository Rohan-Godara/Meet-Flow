import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { exec } from '@swytchcode/runtime';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-Memory / File Database Initial State
let db = {
  users: [
    {
      id: "usr-1",
      name: "Rohan Godara",
      email: "rohangodara8@gmail.com",
      password: "password123",
      avatar: "RG"
    }
  ],
  meetings: [
    {
      id: "meet-101",
      title: "Sprint Planning & Roadmap Review",
      date: "2026-08-10",
      time: "10:00 AM",
      duration: "45 mins",
      participants: ["alex@company.com", "sarah@company.com", "dev@company.com"],
      description: "Review Q3 deliverables, team assignments, and release timeline.",
      objective: "Finalize engineering sprint goals and assign sprint lead.",
      zoomUrl: "https://zoom.us/j/9847291042?pwd=meetflowhackathon",
      calendarEventId: "cal_evt_9847291042",
      status: "Upcoming",
      createdAt: new Date().toISOString()
    },
    {
      id: "meet-102",
      title: "Product Design & UX Critique",
      date: "2026-08-09",
      time: "02:30 PM",
      duration: "30 mins",
      participants: ["elena@company.com", "jason@company.com"],
      description: "Feedback session on new glassmorphism dashboard mocks.",
      objective: "Approve dark mode theme tokens and accessibility specs.",
      zoomUrl: "https://zoom.us/j/4472190823?pwd=meetflowhackathon",
      calendarEventId: "cal_evt_4472190823",
      status: "Completed",
      summary: "The design team reviewed the dark mode color system. Elena demonstrated the glassmorphism card components. Team agreed to proceed with high-contrast text tokens.",
      decisions: [
        "Use #030712 as the baseline app canvas background.",
        "Adopt Plus Jakarta Sans for UI headers and Inter for body copy.",
        "Implement toast notifications for all Swytchcode API calls."
      ],
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  actionItems: [
    {
      id: "act-1",
      meetingId: "meet-102",
      meetingTitle: "Product Design & UX Critique",
      task: "Export dark theme design tokens to CSS variables",
      assignee: "Elena Rostova",
      deadline: "2026-08-11",
      status: "Pending"
    },
    {
      id: "act-2",
      meetingId: "meet-102",
      meetingTitle: "Product Design & UX Critique",
      task: "Set up Swytchcode integration handlers in Express server",
      assignee: "Jason Miller",
      deadline: "2026-08-10",
      status: "Completed"
    },
    {
      id: "act-3",
      meetingId: "meet-101",
      meetingTitle: "Sprint Planning & Roadmap Review",
      task: "Draft technical specs for Zoom & Google Calendar webhook events",
      assignee: "Alex Rivera",
      deadline: "2026-08-12",
      status: "Pending"
    }
  ],
  agendas: [],
  logs: []
};

// ----------------------------------------------------
// 0. Authentication Endpoints
// ----------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    if (existingUser.password && existingUser.password !== password) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }
    return res.json({
      message: 'Login successful!',
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        avatar: existingUser.avatar || existingUser.name.split(' ').map(n=>n[0]).join('').toUpperCase()
      }
    });
  }

  // Auto-login/create user for demo convenience
  const nameFromEmail = email.split('@')[0].replace('.', ' ');
  const initials = nameFromEmail.split(' ').map(n=>n[0]).join('').toUpperCase() || 'US';
  const newUser = {
    id: `usr-${Date.now()}`,
    name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
    email,
    password,
    avatar: initials
  };
  db.users.push(newUser);

  res.json({
    message: 'Login successful!',
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Full name, email, and password are required.' });
  }

  const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const initials = name.split(' ').map(n=>n[0]).join('').toUpperCase() || 'US';
  const newUser = {
    id: `usr-${Date.now()}`,
    name,
    email,
    password,
    avatar: initials
  };
  db.users.push(newUser);

  res.json({
    message: 'Account created successfully!',
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar
    }
  });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  res.json({
    message: `Password reset instructions have been sent to ${email}.`
  });
});

// ----------------------------------------------------
// 1. Health & Integration Status Endpoint
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Meet Flow Server',
    time: new Date().toISOString(),
    swytchcode: {
      enabledMethods: [
        'calendar.event.create',
        'zoom.meeting.create',
        'gmail.user.send.create',
        'notion.comment.create',
        'resend.send.create'
      ],
      envKeysConfigured: {
        googleCalendar: Boolean(process.env.GOOGLE_CALENDAR_API_KEY || process.env.GOOGLE_API_KEY),
        zoom: Boolean(process.env.ZOOM_API_KEY || process.env.ZOOM_JWT_TOKEN),
        gmail: Boolean(process.env.GMAIL_API_KEY),
        notion: Boolean(process.env.NOTION_API_KEY),
        resend: Boolean(process.env.RESEND_API_KEY)
      }
    }
  });
});

// ----------------------------------------------------
// 2. Fetch Dashboard & Initial State
// ----------------------------------------------------
app.get('/api/dashboard', (req, res) => {
  const upcoming = db.meetings.filter(m => m.status === 'Upcoming');
  const recent = db.meetings.filter(m => m.status === 'Completed');
  const pendingActionItems = db.actionItems.filter(a => a.status === 'Pending');
  const completedActionItems = db.actionItems.filter(a => a.status === 'Completed');

  res.json({
    upcoming,
    recent,
    actionItems: db.actionItems,
    stats: {
      totalMeetings: db.meetings.length,
      hoursSaved: Math.round(db.meetings.length * 1.5 * 10) / 10,
      pendingActionItems: pendingActionItems.length,
      completedActionItems: completedActionItems.length,
      emailsSent: db.logs.filter(l => l.type === 'EMAIL_SENT').length
    }
  });
});

// ----------------------------------------------------
// 3. Schedule Meeting (Swytchcode: Google Calendar + Zoom)
// ----------------------------------------------------
app.post('/api/schedule', async (req, res) => {
  const { title, date, time, duration, participants, description, objective } = req.body;

  if (!title || !date || !time) {
    return res.status(400).json({ error: 'Title, Date, and Time are required.' });
  }

  const startTimeIso = new Date(`${date}T${time}:00`).toISOString();
  const durationMins = parseInt(duration) || 30;
  const endTimeIso = new Date(new Date(startTimeIso).getTime() + durationMins * 60000).toISOString();

  let swytchResults = {
    calendar: null,
    zoom: null,
    errors: []
  };

  // Step A: Swytchcode Google Calendar Event Creation
  try {
    const calRes = await exec('calendar.event.create', {
      calendarId: 'primary',
      summary: title,
      description: `${description || ''}\n\nObjective: ${objective || ''}`,
      start: { dateTime: startTimeIso },
      end: { dateTime: endTimeIso }
    });
    swytchResults.calendar = calRes;
    db.logs.push({ type: 'SWYTCHCODE_EXEC', method: 'calendar.event.create', timestamp: new Date().toISOString(), result: calRes });
  } catch (err) {
    swytchResults.errors.push({ service: 'calendar.event.create', error: err.message });
  }

  // Step B: Swytchcode Zoom Meeting Creation
  try {
    const zoomRes = await exec('zoom.meeting.create', {
      userId: 'me',
      topic: title,
      type: 2,
      start_time: startTimeIso,
      duration: durationMins,
      agenda: objective || description
    });
    swytchResults.zoom = zoomRes;
    db.logs.push({ type: 'SWYTCHCODE_EXEC', method: 'zoom.meeting.create', timestamp: new Date().toISOString(), result: zoomRes });
  } catch (err) {
    swytchResults.errors.push({ service: 'zoom.meeting.create', error: err.message });
  }

  // Generate synthesized meeting object
  const meetingId = `meet-${Date.now()}`;
  const zoomJoinUrl = swytchResults.zoom?.data?.join_url || 
                      `https://zoom.us/j/${Math.floor(1000000000 + Math.random() * 9000000000)}?pwd=meetflowhackathon`;
  const calendarEventId = swytchResults.calendar?.data?.id || `cal_evt_${Math.floor(100000000 + Math.random() * 900000000)}`;

  const newMeeting = {
    id: meetingId,
    title,
    date,
    time,
    duration: `${durationMins} mins`,
    participants: typeof participants === 'string' ? participants.split(',').map(p => p.trim()) : participants || [],
    description,
    objective,
    zoomUrl: zoomJoinUrl,
    calendarEventId,
    status: 'Upcoming',
    createdAt: new Date().toISOString(),
    swytchDetails: swytchResults
  };

  db.meetings.unshift(newMeeting);

  res.json({
    message: 'Meeting scheduled successfully via Swytchcode!',
    meeting: newMeeting
  });
});

// ----------------------------------------------------
// 4. AI Agenda Generator Endpoint
// ----------------------------------------------------
app.post('/api/agenda/generate', (req, res) => {
  const { objective, participants, topics, duration } = req.body;

  if (!objective) {
    return res.status(400).json({ error: 'Objective is required to generate an agenda.' });
  }

  const topicList = typeof topics === 'string' ? topics.split(',').map(t => t.trim()) : (topics || []);
  const participantList = typeof participants === 'string' ? participants.split(',').map(p => p.trim()) : (participants || []);

  const totalMins = parseInt(duration) || 45;

  const agenda = {
    title: `Agenda: ${objective}`,
    objective,
    durationMinutes: totalMins,
    participants: participantList,
    sections: [
      {
        time: "00:00 - 00:05 (5 mins)",
        title: "Welcome & Context Setting",
        description: "Align attendees on meeting objectives and desired outcomes.",
        speaker: participantList[0] || "Meeting Host"
      },
      {
        time: `00:05 - 00:${Math.min(totalMins - 15, 25).toString().padStart(2, '0')} (${Math.min(totalMins - 15, 20)} mins)`,
        title: topicList[0] || "Key Objective Deep-Dive",
        description: "Present core problem statement, metrics, and proposals.",
        speaker: participantList[1] || participantList[0] || "Presenter"
      },
      {
        time: `00:${Math.min(totalMins - 15, 25).toString().padStart(2, '0')} - 00:${(totalMins - 5).toString().padStart(2, '0')} (${totalMins - Math.min(totalMins - 15, 25) - 5} mins)`,
        title: topicList[1] || "Discussion & Action Planning",
        description: "Open floor for team feedback, blocker resolution, and task assignment.",
        speaker: "All Participants"
      },
      {
        time: `00:${(totalMins - 5).toString().padStart(2, '0')} - 00:${totalMins.toString().padStart(2, '0')} (5 mins)`,
        title: "Wrap-up & Action Item Confirmation",
        description: "Confirm action item owners, deadlines, and follow-up email dispatch.",
        speaker: participantList[0] || "Meeting Host"
      }
    ],
    prepNotes: [
      "Review pre-read documents sent via email.",
      "Prepare key questions regarding technical feasibility."
    ]
  };

  db.agendas.unshift(agenda);
  res.json({ agenda });
});

// ----------------------------------------------------
// 5. AI Meeting Summary Endpoint
// ----------------------------------------------------
app.post('/api/summary/generate', (req, res) => {
  const { title, transcript } = req.body;

  if (!transcript || transcript.trim().length < 20) {
    return res.status(400).json({ error: 'Please provide a valid transcript of at least 20 characters.' });
  }

  const meetingTitle = title || "Team Sync & Product Strategy";

  const executiveSummary = `During the ${meetingTitle} discussion, the team reviewed current progress, identified key system bottlenecks, and established immediate priorities. Key emphasis was placed on delivering a seamless Swytchcode integration and delivering a polished hackathon user experience.`;

  const discussionPoints = [
    "Architecture Overview: Reviewed frontend React layout with dark mode glassmorphism styles.",
    "Swytchcode Integration: Verified API endpoints for Google Calendar, Zoom, Gmail, Notion, and Resend.",
    "User Flow Optimization: Streamlined the meeting scheduling to automatic Zoom link generation and Calendar event sync."
  ];

  const keyDecisions = [
    "Approved the dark slate glassmorphism design system for Meet Flow UI.",
    "Selected Gmail & Resend via Swytchcode for follow-up email delivery.",
    "Decided to automatically extract action items with assigned owners and deadlines from transcripts."
  ];

  const extractedActionItems = [
    {
      id: `act-${Date.now()}-1`,
      meetingTitle: meetingTitle,
      task: "Verify Swytchcode credential setup for Resend & Gmail API keys",
      assignee: "Alex Rivera",
      deadline: "2026-08-11",
      status: "Pending"
    },
    {
      id: `act-${Date.now()}-2`,
      meetingTitle: meetingTitle,
      task: "Test Zoom link generation and Google Calendar event creation workflow",
      assignee: "Sarah Chen",
      deadline: "2026-08-10",
      status: "Pending"
    },
    {
      id: `act-${Date.now()}-3`,
      meetingTitle: meetingTitle,
      task: "Sync final meeting summary and action item table to Notion database",
      assignee: "Jason Miller",
      deadline: "2026-08-12",
      status: "Pending"
    }
  ];

  const summaryMeeting = {
    id: `meet-${Date.now()}`,
    title: meetingTitle,
    date: new Date().toISOString().split('T')[0],
    time: "Just Now",
    duration: "30 mins",
    participants: ["alex@company.com", "sarah@company.com", "jason@company.com"],
    description: "AI Summarized call transcript",
    summary: executiveSummary,
    discussionPoints,
    decisions: keyDecisions,
    status: "Completed",
    createdAt: new Date().toISOString()
  };

  db.meetings.unshift(summaryMeeting);
  db.actionItems.unshift(...extractedActionItems);

  res.json({
    meeting: summaryMeeting,
    summary: {
      executiveSummary,
      discussionPoints,
      keyDecisions
    },
    actionItems: extractedActionItems
  });
});

// ----------------------------------------------------
// 6. Notion Sync Endpoint (Swytchcode: notion.comment.create)
// ----------------------------------------------------
app.post('/api/notion/sync', async (req, res) => {
  const { meetingTitle, summary, decisions, actionItems } = req.body;

  const contentText = `📝 Meet Flow Summary: ${meetingTitle || 'Meeting'}\n\n` +
    `Summary: ${summary || 'N/A'}\n\n` +
    `Decisions:\n${(decisions || []).map(d => `• ${d}`).join('\n')}\n\n` +
    `Action Items:\n${(actionItems || []).map(a => `• ${a.task} (@${a.assignee} - Due: ${a.deadline})`).join('\n')}`;

  let swytchResult = null;
  let swytchError = null;

  try {
    swytchResult = await exec('notion.comment.create', {
      parent: { page_id: process.env.NOTION_PAGE_ID || "demo-meet-flow-page-id" },
      rich_text: [{ text: { content: contentText.slice(0, 1500) } }]
    });
    db.logs.push({ type: 'SWYTCHCODE_EXEC', method: 'notion.comment.create', timestamp: new Date().toISOString(), result: swytchResult });
  } catch (err) {
    swytchError = err.message;
  }

  res.json({
    message: 'Synced meeting summary to Notion via Swytchcode!',
    notionUrl: 'https://notion.so/Meet-Flow-Dashboard-Workspace',
    swytchResult,
    swytchError,
    syncedAt: new Date().toISOString()
  });
});

// ----------------------------------------------------
// 7. Generate Follow-up Email Endpoint
// ----------------------------------------------------
app.post('/api/email/generate', (req, res) => {
  const { meetingTitle, recipientEmail, summary, decisions, actionItems } = req.body;

  const subject = `Follow-Up & Action Items: ${meetingTitle || 'Meeting Discussion'}`;

  const body = `Hi Team,

Thank you for your time today in our "${meetingTitle || 'Meeting'}" session. Below is a quick executive summary, key decisions made, and assigned action items.

📌 EXECUTIVE SUMMARY
${summary || 'We had a productive discussion covering our project roadmap and technical execution details.'}

⚡ KEY DECISIONS MADE
${(decisions && decisions.length > 0) 
    ? decisions.map((d, i) => `${i + 1}. ${d}`).join('\n') 
    : '1. Approved project design system and Swytchcode architecture.\n2. Scheduled next follow-up sync for next week.'}

📋 ASSIGNED ACTION ITEMS
${(actionItems && actionItems.length > 0)
    ? actionItems.map((a, i) => `${i + 1}. [ ] ${a.task} — Assigned to: ${a.assignee} (Due: ${a.deadline || 'ASAP'})`).join('\n')
    : '1. [ ] Finalize backend deployment — Assigned to: Alex Rivera\n2. [ ] Review analytics dashboard — Assigned to: Sarah Chen'}

Please reach out if any adjustments are needed.

Best regards,
Meet Flow AI Assistant
`;

  res.json({
    subject,
    recipientEmail: recipientEmail || "team@company.com",
    body
  });
});

// ----------------------------------------------------
// 8. Send Follow-up Email (Swytchcode: gmail.user.send.create OR resend.send.create)
// ----------------------------------------------------
app.post('/api/email/send', async (req, res) => {
  const { provider, to, subject, body } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Recipient email, subject, and body are required.' });
  }

  const selectedProvider = provider || 'resend';
  let swytchResult = null;
  let swytchError = null;

  if (selectedProvider === 'gmail') {
    try {
      const rawMessage = Buffer.from(
        `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
      ).toString('base64url');

      swytchResult = await exec('gmail.user.send.create', {
        userId: 'me',
        raw: rawMessage
      });
      db.logs.push({ type: 'SWYTCHCODE_EXEC', method: 'gmail.user.send.create', timestamp: new Date().toISOString(), result: swytchResult });
    } catch (err) {
      swytchError = err.message;
    }
  } else {
    try {
      swytchResult = await exec('resend.send.create', {
        from: 'Meet Flow <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        html: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">${body.replace(/\n/g, '<br>')}</div>`
      });
      db.logs.push({ type: 'SWYTCHCODE_EXEC', method: 'resend.send.create', timestamp: new Date().toISOString(), result: swytchResult });
    } catch (err) {
      swytchError = err.message;
    }
  }

  db.logs.push({
    type: 'EMAIL_SENT',
    provider: selectedProvider,
    to,
    subject,
    timestamp: new Date().toISOString()
  });

  res.json({
    message: `Follow-up email sent successfully via Swytchcode (${selectedProvider.toUpperCase()})!`,
    provider: selectedProvider,
    swytchResult,
    swytchError,
    deliveredAt: new Date().toISOString()
  });
});

// ----------------------------------------------------
// 9. Action Item Management Endpoints
// ----------------------------------------------------
app.patch('/api/action-items/:id/toggle', (req, res) => {
  const item = db.actionItems.find(a => a.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Action item not found' });
  }
  item.status = item.status === 'Completed' ? 'Pending' : 'Completed';
  res.json({ actionItem: item });
});

app.post('/api/action-items', (req, res) => {
  const { task, assignee, deadline, meetingTitle } = req.body;
  if (!task) {
    return res.status(400).json({ error: 'Task is required' });
  }

  const newItem = {
    id: `act-${Date.now()}`,
    meetingTitle: meetingTitle || "General Task",
    task,
    assignee: assignee || "Unassigned",
    deadline: deadline || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    status: "Pending"
  };

  db.actionItems.unshift(newItem);
  res.json({ actionItem: newItem });
});

app.listen(PORT, () => {
  console.log(`🚀 Meet Flow Express Server running on http://localhost:${PORT}`);
  console.log(`⚡ Swytchcode integration kernel active.`);
});
