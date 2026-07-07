// frontend/src/pages/TasksPage.jsx
import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { toast } from 'sonner'
import {
  Plus, X, Loader, AlertCircle, Clock, CheckCircle2,
  Eye, Check, Search, Calendar, MoreVertical, ChevronDown,
} from 'lucide-react'
import { tasksAPI, adminAPI } from '../lib/api'
import useAuthStore from '../store/auth'
import Avatar from '../components/Avatar'
import { cn, formatSmartDate } from '../lib/utils'
import { format, isPast, differenceInDays } from 'date-fns'

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Clock },
  { id: 'in_progress', label: 'In Progress', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: AlertCircle },
  { id: 'review', label: 'Review', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: Eye },
  { id: 'done', label: 'Done', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: CheckCircle2 },
]

const PRIORITY_COLORS = {
  low: 'text-green-400 bg-green-500/10 border-green-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  high: 'text-red-400 bg-red-500/10 border-red-500/30',
}

// ─── Task Card (memoized) ───
const TaskCard = memo(function TaskCard({ task, index, users, canUpdate, onUpdate }) {
  const [showMenu, setShowMenu] = useState(false)

  const assignees = useMemo(() => {
    const ids = task.assignee_ids || []
    return ids.map((id) => users.find((u) => u._id === id)).filter(Boolean)
  }, [task.assignee_ids, users])

  const dueInfo = useMemo(() => {
    if (!task.due_date) return null
    const due = new Date(task.due_date)
    const days = differenceInDays(due, new Date())
    const isOverdue = isPast(due) && task.status !== 'done'
    return {
      display: format(due, 'dd MMM'),
      isOverdue,
      isSoon: days >= 0 && days <= 2,
    }
  }, [task.due_date, task.status])

  return (
    <Draggable draggableId={String(task._id)} index={index} isDragDisabled={!canUpdate}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            'task-card group',
            snapshot.isDragging && 'opacity-90 rotate-1 shadow-glow-red',
            !canUpdate && 'cursor-default'
          )}
          style={{
            ...provided.draggableProps.style,
            userSelect: 'none',
          }}
        >
          {/* Top: Priority + Menu */}
          <div className="flex items-center justify-between mb-2 gap-2">
            {task.priority ? (
              <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border', PRIORITY_COLORS[task.priority])}>
                {task.priority}
              </span>
            ) : (
              <span />
            )}

            {canUpdate && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(!showMenu)
                  }}
                  className="btn-icon-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical size={13} />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-7 bg-card border border-border rounded-xl overflow-hidden z-20 shadow-modal w-40 animate-scale-in">
                      {COLUMNS.map((col) => (
                        <button
                          key={col.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (task.status !== col.id) onUpdate(task._id, col.id)
                            setShowMenu(false)
                          }}
                          disabled={task.status === col.id}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <col.icon size={12} className={col.color} />
                          <span className="text-white">{col.label}</span>
                          {task.status === col.id && <Check size={11} className="ml-auto text-messa-red" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <h4 className="text-sm font-semibold text-white mb-1 leading-snug line-clamp-2">{task.title}</h4>

          {/* Description */}
          {task.description && <p className="text-xs text-text-muted mb-2 line-clamp-2 leading-relaxed">{task.description}</p>}

          {/* Tags */}
          {task.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-text-secondary">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            <div className="flex -space-x-1.5">
              {assignees.slice(0, 3).map((a) => (
                <div key={a._id} title={a.name} className="relative z-0 hover:z-10">
                  <Avatar name={a.name} size="xs" />
                </div>
              ))}
              {assignees.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-muted-2 border border-border flex items-center justify-center text-[9px] font-semibold text-text-muted">
                  +{assignees.length - 3}
                </div>
              )}
            </div>

            {dueInfo && (
              <span
                className={cn(
                  'text-[10px] flex items-center gap-1 font-medium',
                  dueInfo.isOverdue ? 'text-messa-red' : dueInfo.isSoon ? 'text-yellow-400' : 'text-text-muted'
                )}
              >
                <Calendar size={10} />
                {dueInfo.display}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  )
})

// ─── New Task Modal ───
function NewTaskModal({ users, onClose, onCreated }) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    assignee_ids: [user._id],
    tags: '',
  })

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const toggleAssignee = (id) => {
    setForm((p) => ({
      ...p,
      assignee_ids: p.assignee_ids.includes(id)
        ? p.assignee_ids.filter((i) => i !== id)
        : [...p.assignee_ids, id],
    }))
  }

  const filteredUsers = useMemo(
    () => users.filter((u) => u.name?.toLowerCase().includes(assigneeSearch.toLowerCase())),
    [users, assigneeSearch]
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (form.assignee_ids.length === 0) {
      toast.error('At least one assignee required')
      return
    }
    setLoading(true)
    try {
      const res = await tasksAPI.create({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      })
      onCreated(res.data)
      toast.success('Task created!')
      onClose()
    } catch {
      toast.error('Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">New Task</h2>
            <p className="text-xs text-text-muted mt-0.5">Create and assign a task</p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">Title *</label>
            <input
              className="input-base"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              required
              autoFocus
              maxLength={120}
            />
          </div>

          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">Description</label>
            <textarea
              className="input-base"
              rows={3}
              placeholder="Add more details..."
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">Priority</label>
              <select className="input-base" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">Due Date</label>
              <input type="date" className="input-base" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">Tags</label>
            <input className="input-base" placeholder="design, frontend, urgent (comma separated)" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
          </div>

          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block uppercase tracking-wider">
              Assignees ({form.assignee_ids.length})
            </label>
            <input
              className="input-base mb-2"
              placeholder="Search team members..."
              value={assigneeSearch}
              onChange={(e) => setAssigneeSearch(e.target.value)}
            />
            <div className="max-h-52 overflow-y-auto space-y-1 bg-muted rounded-xl p-2">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-text-muted text-xs py-4">No members found</p>
              ) : (
                filteredUsers.map((u) => {
                  const selected = form.assignee_ids.includes(u._id)
                  return (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => toggleAssignee(u._id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left',
                        selected ? 'bg-messa-red/20 border border-messa-red/30' : 'hover:bg-muted-2 border border-transparent'
                      )}
                    >
                      <Avatar name={u.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{u.name}</p>
                        <p className="text-[10px] text-text-muted capitalize">{u.role?.replace('_', ' ')}</p>
                      </div>
                      {selected && <Check size={14} className="text-messa-red flex-shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <div className="spinner" /> : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ───
export default function TasksPage() {
  const { user } = useAuthStore()
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewTask, setShowNewTask] = useState(false)
  const [search, setSearch] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  const canCreate = ['founder', 'co_founder', 'core_team'].includes(user?.role)
  const canUpdateAny = ['founder', 'co_founder', 'core_team'].includes(user?.role)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const [tRes, uRes] = await Promise.all([tasksAPI.list(), adminAPI.users()])
        if (!mounted) return
        setTasks(tRes.data || [])
        setUsers((uRes.data || []).filter((u) => u.approved !== false))
      } catch {
        if (mounted) toast.error('Failed to load tasks')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const updateStatus = useCallback(
    async (taskId, newStatus) => {
      const task = tasks.find((t) => t._id === taskId)
      if (!task || task.status === newStatus) return

      const oldStatus = task.status
      // Optimistic update
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)))

      try {
        await tasksAPI.updateStatus(taskId, newStatus)
        toast.success(`Moved to ${COLUMNS.find((c) => c.id === newStatus)?.label}`)
      } catch {
        // Revert
        setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: oldStatus } : t)))
        toast.error('Failed to update task')
      }
    },
    [tasks]
  )

  const handleDragEnd = useCallback(
    (result) => {
      if (!result.destination) return
      const { draggableId, source, destination } = result
      if (source.droppableId === destination.droppableId) return

      const task = tasks.find((t) => String(t._id) === draggableId)
      if (!task) return

      const canUpdate = canUpdateAny || task.assignee_ids?.includes(user._id)
      if (!canUpdate) {
        toast.error("You can only update your own tasks")
        return
      }

      updateStatus(draggableId, destination.droppableId)
    },
    [tasks, canUpdateAny, user._id, updateStatus]
  )

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        !search ||
        t.title?.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase())
      const matchAssignee = !filterAssignee || t.assignee_ids?.includes(filterAssignee)
      const matchPriority = !filterPriority || t.priority === filterPriority
      return matchSearch && matchAssignee && matchPriority
    })
  }, [tasks, search, filterAssignee, filterPriority])

  const tasksByColumn = useMemo(() => {
    const grouped = {}
    COLUMNS.forEach((c) => (grouped[c.id] = []))
    filteredTasks.forEach((t) => {
      if (grouped[t.status]) grouped[t.status].push(t)
      else grouped.todo.push(t)
    })
    return grouped
  }, [filteredTasks])

  const TaskSkeleton = () => (
    <div className="task-card">
      <div className="skeleton h-3 w-16 rounded mb-2" />
      <div className="skeleton h-4 w-full rounded mb-1" />
      <div className="skeleton h-3 w-3/4 rounded mb-3" />
      <div className="flex justify-between">
        <div className="skeleton w-6 h-6 rounded-full" />
        <div className="skeleton h-3 w-12 rounded" />
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-dark overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-4 md:px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex-shrink-0">
          <h1 className="text-xl font-bold text-white">Task Board</h1>
          <p className="text-xs text-text-muted">
            {tasks.length} total · {filteredTasks.length} shown
          </p>
        </div>

        <div className="flex-1 min-w-[200px] max-w-xs">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="input-base pl-9 text-sm"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <select className="input-base text-sm w-40" value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
          <option value="">All Assignees</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name}
            </option>
          ))}
        </select>

        <select className="input-base text-sm w-32" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">All Priority</option>
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>

        {canCreate && (
          <button onClick={() => setShowNewTask(true)} className="btn-primary flex-shrink-0">
            <Plus size={16} />
            New Task
          </button>
        )}
      </div>

      {/* Kanban */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <div className="flex gap-4 h-full min-h-0" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map((col) => {
              const colTasks = tasksByColumn[col.id] || []
              const Icon = col.icon

              return (
                <div key={col.id} className="w-72 flex flex-col flex-shrink-0">
                  <div className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3 border', col.bg, col.border)}>
                    <Icon size={15} className={col.color} />
                    <span className={cn('font-semibold text-sm', col.color)}>{col.label}</span>
                    <span className={cn('ml-auto text-xs font-bold px-2 py-0.5 rounded-full', col.bg, col.color)}>
                      {colTasks.length}
                    </span>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          'flex-1 space-y-2 p-2 rounded-xl overflow-y-auto min-h-[200px] transition-colors',
                          snapshot.isDraggingOver ? 'bg-messa-red/5 border-2 border-dashed border-messa-red/30' : 'bg-muted/20 border-2 border-transparent'
                        )}
                      >
                        {loading ? (
                          Array(2)
                            .fill(0)
                            .map((_, i) => <TaskSkeleton key={i} />)
                        ) : colTasks.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <Icon size={24} className={cn(col.color, 'opacity-30')} />
                            <p className="text-xs text-text-muted text-center">
                              {snapshot.isDraggingOver ? '✨ Drop here' : 'No tasks'}
                            </p>
                          </div>
                        ) : (
                          colTasks.map((task, idx) => (
                            <TaskCard
                              key={task._id}
                              task={task}
                              index={idx}
                              users={users}
                              canUpdate={canUpdateAny || task.assignee_ids?.includes(user._id)}
                              onUpdate={updateStatus}
                            />
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </div>
      </DragDropContext>

      {showNewTask && <NewTaskModal users={users} onClose={() => setShowNewTask(false)} onCreated={(t) => setTasks((prev) => [t, ...prev])} />}
    </div>
  )
}