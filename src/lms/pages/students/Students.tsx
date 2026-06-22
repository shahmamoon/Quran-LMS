import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, GraduationCap, BookOpen, Users, X, ChevronDown, ChevronUp, Mail, ChevronRight } from 'lucide-react';

// ── WhatsApp icon ─────────────────────────────────────────────
function WhatsAppIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function waUrl(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}
import { api } from '../../lib/api';
import { Button, Card, CardBody, Badge, Avatar, Modal, Select, Spinner, EmptyState } from '../../components/ui';
import { fullName, formatDate } from '../../lib/utils';
import type { User, Subject, Group } from '../../types';
import { toast } from 'sonner';

interface StudentDetail extends User {
  enrolledSubjects: {
    subjectId: string;
    teacherId: string | null;
    teacher: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
    subject: Pick<Subject, 'id' | 'title' | 'color'>;
    enrolledAt: string;
  }[];
  groupMemberships: { groupId: string; group: Pick<Group, 'id' | 'name'>; joinedAt: string }[];
}

export default function Students() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [enrollModal, setEnrollModal] = useState<{ student: StudentDetail } | null>(null);
  const [groupModal, setGroupModal] = useState<{ student: StudentDetail } | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['users', 'STUDENT', search],
    queryFn: () =>
      api.get<{ data: StudentDetail[] }>(`/users?role=STUDENT&search=${search}&include=subjects,groups`)
         .then((r) => r.data.data),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get<{ data: Subject[] }>('/subjects').then((r) => r.data.data),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get<{ data: Group[] }>('/groups').then((r) => r.data.data),
  });

  const enrollMutation = useMutation({
    mutationFn: ({ subjectId, userId, teacherId }: { subjectId: string; userId: string; teacherId?: string }) =>
      api.post(`/subjects/${subjectId}/enroll`, { userId, teacherId: teacherId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users', 'STUDENT'] });
      setEnrollModal(null);
      setSelectedSubject('');
      setSelectedTeacher('');
      toast.success('Student enrolled');
    },
    onError: () => toast.error('Failed to enroll student'),
  });

  const addToGroupMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      api.post(`/groups/${groupId}/members`, { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users', 'STUDENT'] });
      setGroupModal(null);
      setSelectedGroup('');
      toast.success('Student added to group');
    },
    onError: () => toast.error('Failed to add to group'),
  });

  const unenrollMutation = useMutation({
    mutationFn: ({ subjectId, userId }: { subjectId: string; userId: string }) =>
      api.delete(`/subjects/${subjectId}/enroll/${userId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users', 'STUDENT'] }); toast.success('Student unenrolled'); },
    onError: () => toast.error('Failed to unenroll student'),
  });

  const removeFromGroupMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      api.delete(`/groups/${groupId}/members/${userId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users', 'STUDENT'] }); toast.success('Removed from group'); },
    onError: () => toast.error('Failed to remove from group'),
  });

  // When a card is expanded, fetch that student's lesson progress
  const { data: expandedProgress = [] } = useQuery<{ lessonId: string }[]>({
    queryKey: ['student-progress', expandedId],
    queryFn: () =>
      api.get<{ data: { lessonId: string }[] }>(`/curriculum/progress/${expandedId}`)
         .then(r => r.data.data),
    enabled: !!expandedId,
  });

  // Fetch full detail for each subject the expanded student is enrolled in (includes weeks+lessons)
  const expandedStudent = students.find(s => s.id === expandedId);
  const expandedSubjectIds = expandedStudent?.enrolledSubjects?.map(e => e.subjectId) ?? [];
  const subjectQueries = useQuery<Record<string, { total: number; lessonIds: Set<string> }>>({
    queryKey: ['subject-lesson-ids', ...expandedSubjectIds.sort()],
    queryFn: async () => {
      const results = await Promise.all(
        expandedSubjectIds.map(id =>
          api.get<{ data: { id: string; weeks: { lessons: { id: string }[] }[] } }>(`/subjects/${id}`)
             .then(r => r.data.data)
        )
      );
      const map: Record<string, { total: number; lessonIds: Set<string> }> = {};
      for (const s of results) {
        const lessonIds = new Set<string>(s.weeks?.flatMap(w => w.lessons?.map(l => l.id) ?? []) ?? []);
        map[s.id] = { total: lessonIds.size, lessonIds };
      }
      return map;
    },
    enabled: !!expandedId && expandedSubjectIds.length > 0,
  });
  const subjectDetails = subjectQueries.data ?? {};

  const filtered = students.filter((s) =>
    !search || fullName(s).toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} student{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-500"
        />
      </div>

      {/* Student list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="w-10 h-10" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<GraduationCap size={40} />} title="No students found" description="Students will appear here once they are registered." />
      ) : (
        <div className="space-y-3">
          {filtered.map((student) => {
            const isExpanded = expandedId === student.id;
            const enrollments = student.enrolledSubjects ?? [];
            const memberships = student.groupMemberships ?? [];

            return (
              <Card key={student.id}>
                <CardBody className="space-y-0">
                  {/* Student row */}
                  <div className="flex items-center gap-4">
                    <Avatar src={student.avatarUrl} name={fullName(student)} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800">{fullName(student)}</p>
                        <Badge variant={student.status === 'ACTIVE' ? 'success' : student.status === 'SUSPENDED' ? 'warning' : 'danger'}>
                          {student.status === 'ACTIVE' ? 'Active' : student.status === 'SUSPENDED' ? 'Suspended' : 'Archived'}
                        </Badge>
                        {student.grade && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
                            <GraduationCap size={10} />{student.grade}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <a
                          href={`mailto:${student.email}`}
                          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 hover:underline transition-colors"
                          title={`Send email to ${student.email}`}
                        >
                          <Mail size={12} className="shrink-0" />
                          {student.email}
                        </a>
                        {student.phone && (
                          <a
                            href={waUrl(student.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 transition-colors"
                            title={`WhatsApp ${student.phone}`}
                          >
                            <WhatsAppIcon size={13} />
                            <span className="hover:underline">{student.phone}</span>
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {enrollments.length === 0 ? (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <BookOpen size={11} /> No subjects
                          </span>
                        ) : (
                          enrollments.map((e) => (
                            <span
                              key={e.subjectId}
                              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium text-white"
                              style={{ background: e.subject.color }}
                            >
                              <BookOpen size={10} /> {e.subject.title}
                            </span>
                          ))
                        )}
                        {memberships.length > 0 && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Users size={11} /> {memberships.length} group{memberships.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">Joined {formatDate(student.createdAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<BookOpen size={13} />}
                        onClick={() => { setEnrollModal({ student }); setSelectedSubject(''); setSelectedTeacher(''); }}
                      >
                        Enroll
                      </Button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : student.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Progress rows — visible when expanded */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Course Progress</p>
                      {enrollments.length === 0 ? (
                        <p className="text-xs text-slate-400">Not enrolled in any courses</p>
                      ) : (
                        enrollments.map((e) => {
                          const subjectInfo = subjectDetails[e.subjectId];
                          const total = subjectInfo?.total ?? 0;
                          const completed = subjectInfo
                            ? expandedProgress.filter(p => subjectInfo.lessonIds.has(p.lessonId)).length
                            : 0;
                          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                          return (
                            <button
                              key={e.subjectId}
                              onClick={() => navigate(`/lms/subjects/${e.subjectId}?student=${student.id}`)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition-colors group text-left"
                            >
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.subject.color }} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-slate-700 truncate">{e.subject.title}</span>
                                  <span className="text-xs text-slate-400 shrink-0 ml-2">{completed}/{total} lessons</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${pct}%`, background: e.subject.color }}
                                  />
                                </div>
                              </div>
                              <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-500 shrink-0 transition-colors" />
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Enroll in Subject modal */}
      <Modal open={!!enrollModal} onClose={() => { setEnrollModal(null); setSelectedSubject(''); setSelectedTeacher(''); }} title={`Enroll ${enrollModal ? fullName(enrollModal.student) : ''}`}>
        {(() => {
          const availableSubjects = subjects.filter(
            (s) => !enrollModal?.student.enrolledSubjects?.some((e) => e.subjectId === s.id)
          );

          const chosenSubject = subjects.find((s) => s.id === selectedSubject) ?? null;
          const subjectTeachers = chosenSubject?.teachers ?? [];
          const needsTeacherPick = subjectTeachers.length > 1;
          // Auto-assign if only one teacher
          const autoTeacherId = subjectTeachers.length === 1 ? subjectTeachers[0].teacherId : '';

          return (
            <div className="space-y-4">

              {/* Subject picker */}
              <Select
                label="Subject"
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSelectedTeacher('');
                }}
                options={[
                  { value: '', label: availableSubjects.length ? 'Choose a subject…' : 'No matching subjects for this grade' },
                  ...availableSubjects.map((s) => ({
                    value: s.id,
                    label: s.title,
                  })),
                ]}
              />

              {/* Teacher picker — only when subject has multiple teachers */}
              {selectedSubject && subjectTeachers.length === 1 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
                  <span className="text-slate-400 text-xs">Teacher:</span>
                  <span className="font-medium">{fullName(subjectTeachers[0].teacher)}</span>
                  <span className="ml-auto text-xs text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">Auto-assigned</span>
                </div>
              )}
              {selectedSubject && needsTeacherPick && (
                <Select
                  label="Assign Teacher"
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  options={[
                    { value: '', label: 'Choose a teacher…' },
                    ...subjectTeachers.map((st) => ({ value: st.teacherId, label: fullName(st.teacher) })),
                  ]}
                />
              )}
              {selectedSubject && subjectTeachers.length === 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠ No teachers assigned to this subject yet.
                </p>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => { setEnrollModal(null); setSelectedSubject(''); setSelectedTeacher(''); }} className="flex-1">
                  Cancel
                </Button>
                <Button
                  disabled={!selectedSubject || selectedSubject === '__divider__' || (needsTeacherPick && !selectedTeacher)}
                  loading={enrollMutation.isPending}
                  onClick={() =>
                    enrollModal &&
                    enrollMutation.mutate({
                      subjectId: selectedSubject,
                      userId: enrollModal.student.id,
                      teacherId: needsTeacherPick ? selectedTeacher : autoTeacherId,
                    })
                  }
                  className="flex-1"
                >
                  Enroll
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Add to Group modal */}
      <Modal open={!!groupModal} onClose={() => setGroupModal(null)} title={`Add ${groupModal ? fullName(groupModal.student) : ''} to Group`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Select a group to add this student to.</p>
          <Select
            label="Group"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            options={[
              { value: '', label: 'Choose a group…' },
              ...groups
                .filter((g) => !groupModal?.student.groupMemberships?.some((m) => m.groupId === g.id))
                .map((g) => ({ value: g.id, label: g.name })),
            ]}
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setGroupModal(null)} className="flex-1">Cancel</Button>
            <Button
              disabled={!selectedGroup}
              loading={addToGroupMutation.isPending}
              onClick={() => groupModal && addToGroupMutation.mutate({ groupId: selectedGroup, userId: groupModal.student.id })}
              className="flex-1"
            >
              Add to Group
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
