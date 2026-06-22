// ─── Enums ────────────────────────────────────────────────────
export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';
export type SessionStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
export type LessonType = 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT';
export type MessageType = 'TEXT' | 'FILE' | 'SYSTEM';
export type QuizType = 'QUIZ' | 'EXAM';
export type QuizStatus = 'DRAFT' | 'PUBLISHED';
export type QuestionType = 'MCQ' | 'SHORT_ANSWER' | 'ESSAY' | 'TRUE_FALSE';
export type SubmissionStatus = 'PENDING' | 'GRADING' | 'GRADED';

// ─── Quiz ─────────────────────────────────────────────────────
export interface QuizQuestion {
  id: string;
  questionNumber: number;
  type: QuestionType;
  question: string;
  options?: string[];
  marks: number;
  expectedAnswer?: string; // only visible to teachers
}

export interface QuizAnswer {
  questionId: string;
  answer: string;
  score?: number;
  feedback?: string;
}

export interface QuizAssignment {
  id: string;
  quizId: string;
  groupId: string | null;
  group: { id: string; name: string } | null;
  studentId: string | null;
  student: { id: string; firstName: string; lastName: string; email?: string } | null;
  dueDate: string | null;
  assignedAt: string;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  studentId: string;
  student: { id: string; firstName: string; lastName: string; email?: string; avatarUrl?: string | null };
  answers: QuizAnswer[];
  attachmentUrl: string | null;
  status: SubmissionStatus;
  score: number | null;
  maxScore: number | null;
  aiFeedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
}

export interface Quiz {
  id: string;
  title: string;
  type: QuizType;
  status: QuizStatus;
  subjectId: string;
  subject: { id: string; title: string; color: string; grade?: string | null };
  teacher?: { id: string; firstName: string; lastName: string };
  teacherId: string;
  instructions: string | null;
  questions: QuizQuestion[];
  totalMarks: number;
  durationMin: number | null;
  assignments?: QuizAssignment[];
  _count?: { assignments: number; submissions: number };
  createdAt: string;
  // Student-facing extras
  dueDate?: string | null;
  submission?: Pick<QuizSubmission, 'status' | 'score' | 'maxScore' | 'submittedAt'> | null;
}

// ─── User ─────────────────────────────────────────────────────
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  grade: string | null;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Subject ──────────────────────────────────────────────────
export interface SubjectTeacher {
  subjectId: string;
  teacherId: string;
  assignedAt: string;
  teacher: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'avatarUrl'>;
}

export interface Subject {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  color: string;
  grade: string | null;
  isPublished: boolean;
  teachers?: SubjectTeacher[];
  _count?: { weeks: number; enrollments: number };
  createdAt: string;
  updatedAt: string;
}

// ─── Curriculum ───────────────────────────────────────────────
export interface LessonAttachment {
  id: string;
  name: string;
  url: string;
  size: number;       // bytes
  mimeType: string;
  uploadedAt: string;
}

export interface Lesson {
  id: string;
  weekId: string;
  title: string;
  type: LessonType;
  content: string | null;
  videoUrl: string | null;
  duration: number | null;
  order: number;
  isPublished: boolean;
  objectives: string[];
  resources: LessonAttachment[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Week {
  id: string;
  subjectId: string;
  title: string;
  description: string | null;
  order: number;
  lessons: Lesson[];
  createdAt: string;
  updatedAt: string;
}

export interface LessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  completedAt: string;
}

// ─── Session (Zoom) ───────────────────────────────────────────
export interface Session {
  id: string;
  title: string;
  description: string | null;
  subjectId: string | null;
  subject?: Pick<Subject, 'id' | 'title' | 'color'> | null;
  hostId: string;
  host?: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
  scheduledAt: string;
  durationMinutes: number;
  status: SessionStatus;
  zoomMeetingId: string | null;
  zoomJoinUrl: string | null;
  zoomStartUrl?: string | null; // only for host/admin
  zoomPassword: string | null;
  dailyRoomName: string | null;
  recordingUrl: string | null;
  groupId: string | null;
  group?: { id: string; name: string } | null;
  student?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  _count?: { attendances: number };
  createdAt: string;
  updatedAt: string;
}

// ─── Group ────────────────────────────────────────────────────
export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl' | 'role'>;
  joinedAt: string;
}

export interface GroupSubject {
  groupId: string;
  subjectId: string;
  subject: Pick<Subject, 'id' | 'title' | 'color'>;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  _count?: { members: number };
  members?: GroupMember[];
  subjects?: GroupSubject[];
  createdAt: string;
  updatedAt: string;
}

// ─── Chat ─────────────────────────────────────────────────────
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
  type: MessageType;
  content: string;
  fileUrl: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

export interface ConversationParticipant {
  conversationId: string;
  userId: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
  lastReadAt: string | null;
}

export interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  groupId: string | null;
  participants: ConversationParticipant[];
  messages: Message[];
  createdAt: string;
}

// ─── Notification ─────────────────────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  link: string | null;
  isRead: boolean;
  archivedAt: string | null;
  createdAt: string;
}

// ─── Activity Feed ────────────────────────────────────────────
export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  actor?: { firstName: string; lastName: string; avatarUrl: string | null } | null;
}

// ─── Chat: Conversation with unread count ─────────────────────
export interface ConversationWithUnread extends Conversation {
  unreadCount: number;
}

// ─── Available chat user ──────────────────────────────────────
export interface AvailableChatUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: Role;
  lastSeenAt: string | null;
}

// ─── API ──────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

// ─── Audit Log ────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  userId: string | null;
  user?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'> | null;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: string;
}

// ─── Quran Recitation ─────────────────────────────────────────
export type PageStatus = 'INTRODUCED' | 'PRACTICING' | 'COMPLETED' | 'NEEDS_REVIEW';
export type RecitationStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TrackType = 'RECITATION' | 'HIFZ' | 'REVISION';
export type TajweedCategory = 'NUN_SAKINA_TANWEEN' | 'MEEM_SAKINA' | 'MADD' | 'HEAVY_LIGHT' | 'STOPPING_WAQF' | 'RECITATION_STYLE';
export type ErrorSeverity = 'MINOR' | 'MODERATE' | 'MAJOR';

export interface QuranPage {
  pageNumber: number;
  juzNumber: number;
  hizbNumber: number;
  surahNumber: number;
  surahNameEn: string;
  surahNameAr: string;
  ayahStart: number;
  isStartOfSurah: boolean;
}

export interface TajweedRule {
  id: string;
  nameEn: string;
  nameAr: string;
  category: TajweedCategory;
  description: string;
}

export interface PageError {
  id: string;
  attemptId: string;
  ruleId: string;
  rule: TajweedRule;
  ayahNumber: number | null;
  wordNumber: number | null;
  severity: ErrorSeverity;
  note: string | null;
  createdAt: string;
}

export interface PageAttempt {
  id: string;
  sessionId: string;
  studentId: string;
  teacherId: string;
  teacher?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  pageNumber: number;
  page?: Pick<QuranPage, 'pageNumber' | 'juzNumber' | 'surahNameEn' | 'surahNameAr' | 'ayahStart'>;
  attemptOrder: number;
  status: PageStatus;
  masteryScore: number | null;
  teacherNotes: string | null;
  errors: PageError[];
  createdAt: string;
}

export interface RecitationSession {
  id: string;
  studentId: string;
  teacherId: string;
  student: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
  teacher: Pick<User, 'id' | 'firstName' | 'lastName'>;
  zoomSessionId: string | null;
  trackType: TrackType;
  status: RecitationStatus;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  durationMins: number | null;
  overallNotes: string | null;
  audioUrl: string | null;
  attempts?: PageAttempt[];
  _count?: { attempts: number };
  createdAt: string;
}

export interface PageProgress {
  studentId: string;
  pageNumber: number;
  juzNumber: number;
  surahNameEn: string;
  surahNameAr: string;
  currentStatus: PageStatus | null;
  masteryScore: number | null;
  attemptCount: number;
  firstTaughtAt: string | null;
  lastTaughtAt: string | null;
  majorErrorCount: number;
}

export interface ProgressSummary {
  statusBreakdown: { status: PageStatus | null; count: number }[];
  juzBreakdown: { juzNumber: number; pagesWorked: number }[];
  topErrors: { rule: TajweedRule; count: number }[];
  needsReview: { pageNumber: number; surahNameEn: string; lastTaughtAt: string }[];
  totalPagesWorked: number;
}

// ─── Payments (Stripe) ────────────────────────────────────────
export type PaymentType = 'ONE_TIME' | 'SUBSCRIPTION';
export type PaymentStatus = 'PENDING' | 'PAID' | 'PAST_DUE' | 'FAILED' | 'EXPIRED' | 'ENDED' | 'CANCELLED';

export interface Plan {
  id: string;
  name: string;
  amount: number;        // minor units (cents)
  currency: string;
  type: PaymentType;
  interval: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  student?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  planId: string | null;
  plan?: Plan | null;
  type: PaymentType;
  amount: number;        // minor units (cents)
  currency: string;
  status: PaymentStatus;
  description: string | null;
  endDate: string | null;
  checkoutUrl: string | null;
  emailedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

// ─── Qaida Module ─────────────────────────────────────────────
export type QaidaProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REVISION_REQUIRED';

export interface QaidaBook {
  id:          string;
  slug:        string;
  title:       string;
  description: string | null;
  totalPages:  number;
  imageFolder: string;
  isActive:    boolean;
  order:       number;
  createdAt:   string;
  updatedAt:   string;
}

export interface QaidaStudentProgress {
  id:                   string;
  studentId:            string;
  teacherId:            string | null;
  bookId:               string;
  currentPage:          number;
  completedPages:       number[];
  completionPercentage: number;
  status:               QaidaProgressStatus;
  lastLessonDate:       string | null;
  teacherNotes:         string | null;
  nextPage:             number | null;
  revisionRequired:     boolean;
  createdAt:            string;
  updatedAt:            string;
  teacher?: { id: string; firstName: string; lastName: string } | null;
  book?:    Pick<QaidaBook, 'id' | 'slug' | 'title' | 'totalPages' | 'imageFolder'>;
}

export interface QaidaBookmark {
  id:         string;
  teacherId:  string;
  studentId:  string;
  bookId:     string;
  pageNumber: number;
  note:       string | null;
  createdAt:  string;
  teacher:    { id: string; firstName: string; lastName: string };
}

export interface QaidaLessonNote {
  id:               string;
  studentId:        string;
  teacherId:        string;
  bookId:           string;
  pageNumber:       number;
  lessonDate:       string;
  note:             string;
  nextPage:         number | null;
  revisionRequired: boolean;
  createdAt:        string;
  updatedAt:        string;
  teacher:          { id: string; firstName: string; lastName: string };
}

export interface QaidaLessonHistory {
  id:         string;
  studentId:  string;
  teacherId:  string;
  bookId:     string;
  pageNumber: number;
  lessonDate: string;
  note:       string | null;
  nextPage:   number | null;
  createdAt:  string;
  teacher:    { id: string; firstName: string; lastName: string };
}

// ── Islamic Learning Module ──────────────────────────────────────────────────

export type IslamicContentType = 'DUA' | 'SALAH' | 'WUDU' | 'KALIMA';

export interface IslamicCategory {
  id:          string;
  name:        string;
  slug:        string;
  type:        IslamicContentType | null;
  description: string | null;
  icon:        string | null;
  order:       number;
  isActive:    boolean;
  createdAt:   string;
  updatedAt:   string;
  _count?:     { items: number };
}

export interface IslamicItem {
  id:                 string;
  categoryId:         string;
  type:               IslamicContentType;
  title:              string;
  arabicText:         string | null;
  transliteration:    string | null;
  englishTranslation: string | null;
  urduTranslation:    string | null;
  stepNumber:         number | null;
  prayerName:         string | null;
  rakatCount:         number | null;
  rakatType:          string | null;
  imageUrl:           string | null;
  audioUrl:           string | null;
  order:              number;
  isActive:           boolean;
  createdAt:          string;
  updatedAt:          string;
  category?:          { name: string; type: IslamicContentType };
}

export interface IslamicProgress {
  id:          string;
  studentId:   string;
  teacherId:   string | null;
  itemId:      string;
  completed:   boolean;
  completedAt: string | null;
  notes:       string | null;
  createdAt:   string;
  updatedAt:   string;
  item?:       { id: string; title: string; type: IslamicContentType; categoryId: string };
}

export interface IslamicBookmark {
  id:        string;
  studentId: string;
  teacherId: string;
  itemId:    string;
  note:      string | null;
  createdAt: string;
  item?:     { id: string; title: string; type: IslamicContentType; categoryId: string };
  teacher?:  { id: string; firstName: string; lastName: string };
}

export interface IslamicDashboard {
  totalItems:           number;
  completedCount:       number;
  bookmarkCount:        number;
  completionPercentage: number;
  typeBreakdown:        Array<{ type: IslamicContentType; completed: number }>;
}
