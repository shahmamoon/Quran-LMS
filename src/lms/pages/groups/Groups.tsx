import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Trash2, Search, BookOpen, Check, UserPlus, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { Button, Card, CardBody, Modal, Input, Textarea, Avatar, Spinner, EmptyState, Badge } from '../../components/ui';
import { fullName, formatDate } from '../../lib/utils';
import type { Group, User, Subject } from '../../types';
import { toast } from 'sonner';

interface GroupForm {
  name: string;
  description: string;
  memberIds: string[];
  subjectIds: string[];
}

const defaultForm: GroupForm = { name: '', description: '', memberIds: [], subjectIds: [] };

export default function Groups() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isStaff = user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<GroupForm>(defaultForm);
  const [studentSearch, setStudentSearch] = useState('');
  // Manage-members modal: holds the group being edited (null = closed)
  const [manageGroup, setManageGroup] = useState<Group | null>(null);
  const [manageSearch, setManageSearch] = useState('');

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get<{ data: Group[] }>('/groups').then((r) => r.data.data),
  });

  // Fetch students — teacher sees only their assigned students; admin sees all
  const { data: allStudents = [] } = useQuery({
    queryKey: ['users', 'STUDENT', ''],
    queryFn: () =>
      api.get<{ data: User[] }>('/users?role=STUDENT&limit=200').then((r) => r.data.data),
    enabled: isStaff,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get<{ data: Subject[] }>('/subjects').then((r) => r.data.data),
    enabled: isStaff,
  });

  const filteredStudents = useMemo(
    () =>
      studentSearch
        ? allStudents.filter(
            (s) =>
              fullName(s).toLowerCase().includes(studentSearch.toLowerCase()) ||
              s.email.toLowerCase().includes(studentSearch.toLowerCase())
          )
        : allStudents,
    [allStudents, studentSearch]
  );

  function toggleMember(id: string) {
    setForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(id) ? f.memberIds.filter((x) => x !== id) : [...f.memberIds, id],
    }));
  }

  function toggleSubject(id: string) {
    setForm((f) => ({
      ...f,
      subjectIds: f.subjectIds.includes(id) ? f.subjectIds.filter((x) => x !== id) : [...f.subjectIds, id],
    }));
  }

  const createMutation = useMutation({
    mutationFn: (data: GroupForm) => api.post('/groups', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      setShowModal(false);
      setForm(defaultForm);
      setStudentSearch('');
      toast.success('Group created');
    },
    onError: () => toast.error('Failed to create group'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/groups/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); toast.success('Group deleted'); },
  });

  // Keep the open manage-members modal in sync with refreshed group data
  function refreshManageGroup() {
    qc.invalidateQueries({ queryKey: ['groups'] });
  }

  const addMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      api.post(`/groups/${groupId}/members`, { userId }),
    onSuccess: (_res, vars) => {
      refreshManageGroup();
      // Optimistically reflect in the open modal
      setManageGroup((g) => {
        if (!g || g.id !== vars.groupId) return g;
        const student = allStudents.find((s) => s.id === vars.userId);
        if (!student || g.members?.some((m) => m.userId === vars.userId)) return g;
        const newMember = {
          id: `tmp-${vars.userId}`, groupId: g.id, userId: vars.userId,
          user: student, joinedAt: new Date().toISOString(),
        };
        return { ...g, members: [...(g.members ?? []), newMember], _count: { members: (g._count?.members ?? 0) + 1 } };
      });
      toast.success('Student added');
    },
    onError: () => toast.error('Failed to add student'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      api.delete(`/groups/${groupId}/members/${userId}`),
    onSuccess: (_res, vars) => {
      refreshManageGroup();
      setManageGroup((g) => {
        if (!g || g.id !== vars.groupId) return g;
        return {
          ...g,
          members: (g.members ?? []).filter((m) => m.userId !== vars.userId),
          _count: { members: Math.max(0, (g._count?.members ?? 1) - 1) },
        };
      });
      toast.success('Student removed');
    },
    onError: () => toast.error('Failed to remove student'),
  });

  function openModal() {
    setForm(defaultForm);
    setStudentSearch('');
    setShowModal(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Groups</h1>
          <p className="text-slate-500 text-sm mt-1">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
        </div>
        {isStaff && <Button onClick={openModal} icon={<Plus size={16} />}>New Group</Button>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="w-10 h-10" /></div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Users size={40} />}
          title="No groups yet"
          action={isStaff ? <Button onClick={openModal} icon={<Plus size={16} />}>Create Group</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Card key={g.id}>
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-800">{g.name}</h3>
                  {g._count && (
                    <Badge variant="default">{g._count.members} member{g._count.members !== 1 ? 's' : ''}</Badge>
                  )}
                </div>

                {g.description && (
                  <p className="text-sm text-slate-500 line-clamp-2">{g.description}</p>
                )}

                {/* Member avatars */}
                {g.members && g.members.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">Members</p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.members.slice(0, 6).map((m) => (
                        <div key={m.id} className="flex items-center gap-1.5 bg-slate-50 rounded-full px-2 py-0.5">
                          <Avatar src={m.user.avatarUrl} name={fullName(m.user)} size="sm" />
                          <span className="text-xs text-slate-600">{m.user.firstName}</span>
                        </div>
                      ))}
                      {g._count && g._count.members > 6 && (
                        <span className="text-xs text-slate-400 self-center">+{g._count.members - 6} more</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Courses */}
                {g.subjects && g.subjects.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">Courses</p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.subjects.map((gs) => (
                        <div key={gs.subjectId} className="flex items-center gap-1 bg-slate-50 rounded-full px-2 py-0.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: gs.subject.color }} />
                          <span className="text-xs text-slate-600">{gs.subject.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-400">Created {formatDate(g.createdAt)}</p>

                {isStaff && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<UserPlus size={14} />}
                      onClick={() => { setManageGroup(g); setManageSearch(''); }}
                      className="flex-1"
                    >
                      Manage Members
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={14} />}
                      onClick={() => deleteMutation.mutate(g.id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Group">
        <form
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
          className="space-y-5"
        >
          <Input
            label="Group Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="e.g. Morning Cohort A"
          />
          <Textarea
            label="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            placeholder="Brief description of this group..."
          />

          {/* Student selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Add Students
              {form.memberIds.length > 0 && (
                <span className="ml-2 text-xs bg-brand-100 text-brand-700 rounded-full px-2 py-0.5">
                  {form.memberIds.length} selected
                </span>
              )}
            </label>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-1 focus:ring-brand-300 focus:border-brand-500"
                  />
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-50">
                {filteredStudents.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No students found</p>
                ) : (
                  filteredStudents.map((s) => {
                    const selected = form.memberIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleMember(s.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors ${selected ? 'bg-brand-50' : ''}`}
                      >
                        <Avatar src={s.avatarUrl} name={fullName(s)} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{fullName(s)}</p>
                          <p className="text-xs text-slate-400 truncate">{s.email}</p>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-brand-600 border-brand-600' : 'border-slate-300'}`}>
                          {selected && <Check size={12} className="text-white" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Subject selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Link Courses (optional)
              {form.subjectIds.length > 0 && (
                <span className="ml-2 text-xs bg-brand-100 text-brand-700 rounded-full px-2 py-0.5">
                  {form.subjectIds.length} selected
                </span>
              )}
            </label>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="max-h-32 overflow-y-auto divide-y divide-slate-50">
                {subjects.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No courses available</p>
                ) : (
                  subjects.map((s) => {
                    const selected = form.subjectIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSubject(s.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${selected ? 'bg-brand-50' : ''}`}
                      >
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <BookOpen size={13} className="text-slate-400 shrink-0" />
                          <span className="text-sm text-slate-700 truncate">{s.title}</span>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-brand-600 border-brand-600' : 'border-slate-300'}`}>
                          {selected && <Check size={12} className="text-white" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={createMutation.isPending} className="flex-1">Create Group</Button>
          </div>
        </form>
      </Modal>

      {/* Manage Members Modal */}
      <Modal
        open={!!manageGroup}
        onClose={() => { setManageGroup(null); setManageSearch(''); }}
        title={manageGroup ? `Manage Members — ${manageGroup.name}` : 'Manage Members'}
      >
        {manageGroup && (() => {
          const memberIds = new Set((manageGroup.members ?? []).map((m) => m.userId));
          const available = allStudents.filter(
            (s) =>
              !memberIds.has(s.id) &&
              (!manageSearch ||
                fullName(s).toLowerCase().includes(manageSearch.toLowerCase()) ||
                s.email.toLowerCase().includes(manageSearch.toLowerCase()))
          );
          const busy = addMemberMutation.isPending || removeMemberMutation.isPending;

          return (
            <div className="space-y-5">
              {/* Current members */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Current Members
                  <span className="ml-2 text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                    {manageGroup.members?.length ?? 0}
                  </span>
                </label>
                <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-50">
                  {(manageGroup.members ?? []).length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No members yet</p>
                  ) : (
                    (manageGroup.members ?? []).map((m) => (
                      <div key={m.userId} className="flex items-center gap-3 px-3 py-2">
                        <Avatar src={m.user.avatarUrl} name={fullName(m.user)} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{fullName(m.user)}</p>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeMemberMutation.mutate({ groupId: manageGroup.id, userId: m.userId })}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                          title="Remove from group"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add students */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Add Students</label>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search students..."
                        value={manageSearch}
                        onChange={(e) => setManageSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-1 focus:ring-brand-300 focus:border-brand-500"
                      />
                    </div>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-50">
                    {available.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">
                        {manageSearch ? 'No matching students' : 'All students are already in this group'}
                      </p>
                    ) : (
                      available.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          disabled={busy}
                          onClick={() => addMemberMutation.mutate({ groupId: manageGroup.id, userId: s.id })}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-brand-50 transition-colors disabled:opacity-40"
                        >
                          <Avatar src={s.avatarUrl} name={fullName(s)} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{fullName(s)}</p>
                            <p className="text-xs text-slate-400 truncate">{s.email}</p>
                          </div>
                          <UserPlus size={15} className="text-brand-500 shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setManageGroup(null); setManageSearch(''); }}
                  className="w-full"
                >
                  Done
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
