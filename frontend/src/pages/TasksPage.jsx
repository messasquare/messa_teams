// frontend/src/pages/TasksPage.jsx
import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Plus, X, Loader, AlertCircle, Clock, CheckCircle2,
  Eye, Check, Search, Filter, Calendar, User,
  ChevronDown, Tag, MoreVertical, Edit2
} from 'lucide-react'
import api from '../lib/api'
import useAuthStore from '../store/auth'
import Avatar from '../components/Avatar'
import { cn, formatDate, formatRelative, getRoleBadgeColor, getRoleLabel } from '../lib/utils'
import { format } from 'date-fns'

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Clock },
  { id: 'in_progress', label: 'In Progress', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertCircle },
  { id: 'review', label: 'Review', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Eye },
  { id: 'done', label: 'Done', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle2 },
]

const PRIORITY_COLORS = {
  low: 'text-green-400 bg-green-500/10',
  medium: 'text-yellow-400 bg-yellow-500/10',
  high: 'text-red-400 bg-red-500/10',
}

function TaskCard({ task, index, onUpdate, canUpdate }) {
  const [showMenu, setShowMenu] = useState(false)

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <Draggable draggableId={task._id} index={index} isDragDisabled={!canUpdate}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            'task-card select-none',
            snapshot.isDragging && 'opacity-80 rotate-1 shadow-2xl ring-1 ring-messa-red/50',
            !canUpdate && 'cursor-default'
          )}
        >
          {/* Priority + Menu */}
          <div className="flex items-start justify-between mb-2">
            {task.priority && (
              <span className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide',
                PRIORITY_COLORS[task.priority]
              )}>
                {task.priority}
              </span>
            )}
            <div className="ml-auto relative">
              {canUpdate && (
                <>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="btn-icon w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical size={12} />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-6 bg-card border border-border rounded-xl
                                    overflow-hidden z-10 shadow-modal w-36">
                      {COLUMNS.map(col => (
                        <button
                          key={col.id}
                          onClick={() => {
                            onUpdate(task._id, col.id)
                            setShowMenu(false)
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors
                                     flex items-center gap-2"
                          disabled={task.status === col.id}
                        >
                          <col.icon size={12} className={col.color} />
                          {col.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <h4 className="text-sm font-semibold text-white mb-1 leading-tight">
            {task.title}
          </h4>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-text-muted mb-2 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Tags */}
          {task.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.tags.map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-text-muted">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            {/* Assignees */}
            <div className="flex -space-x-1.5">
              {(task.assignees || []).slice(0, 3).map((a, i) => (
                <div key={i} title={a.name} className="relative z-0 hover:z-10">
                  <Avatar name={a.name} size="xs" />
                </div>
              ))}
              {task.assignees?.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-muted border border-border
                                flex items-center justify-center text-[10px] text-text-muted">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>

            {/* Due date */}
            {task.due_date && (
              <span className={cn(
                'text-[10px] flex items-center gap-1',
                isOverdue ? 'text-messa-red' : 'text-text-muted'
              )}>
                <Calendar size={10} />
                {format(new Date(task.due_date), 'dd MMM')}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  )
}

function NewTaskModal({ users, onClose, onCreated }) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium',
    due_date: '', assignee_ids: [user._id], tags: ''
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const toggleAssignee = (id) => {
    setForm(p => ({
      ...p,
      assignee_ids: p.assignee_ids.includes(id)
        ? p.assignee_ids.filter(i => i !== id)
        : [...p.assignee_ids, id]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title required'); return }
    setLoading(true)
    try {
      const res = await api.post('/api/tasks', {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
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
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="modal-content p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">New Task</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block">Title *</label>
            <input
              className="input-base"
              placeholder="Task title..."
              value={form.title}
              onChange={e => set('title', e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block">Description</label>
            <textarea
              className="input-base resize-none"
              rows={3}
              placeholder="What needs to be done..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted font-medium mb-1.5 block">Priority</label>
              <select
                className="input-base"
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted font-medium mb-1.5 block">Due Date</label>
              <input
                type="date"
                className="input-base"
                value={form.due_date}
                onChange={e => set('due_date', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block">Tags (comma separated)</label>
            <input
              className="input-base"
              placeholder="design, frontend, urgent..."
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-text-muted font-medium mb-1.5 block">
              Assignees ({form.assignee_ids.length} selected)
            </label>
            <div className="max-h-40 overflow-y-auto space-y-1 bg-muted rounded-xl p-2">
              {users.map(u => (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => toggleAssignee(u._id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left',
                    form.assignee_ids.includes(u._id) ? 'bg-messa-red/20' : 'hover:bg-muted-2'
                  )}
                >
                  <Avatar name={u.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{u.name}</p>
                    <p className="text-xs text-text-muted capitalize">{u.role?.replace('_', ' ')}</p>
                  </div>
                  {form.assignee_ids.includes(u._id) && (
                    <Check size={14} className="text-messa-red flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader size={16} className="animate-spin" /> : 'Create Task'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function TasksPage() {
  const { user } = useAuthStore()
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewTask, setShowNewTask] = useState(false)
  const [search, setSearch] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')

  const canCreate = ['founder', 'co_founder', 'core_team'].includes(user?.role)
  const canUpdateAny = ['founder', 'co_founder', 'core_team'].includes(user?.role)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [tasksRes, usersRes] = await Promise.all([
        api.get('/api/tasks'),
        api.get('/api/admin/users'),
      ])
      setTasks(tasksRes.data || [])
      setUsers((usersRes.data || []).filter(u => u.approved))
    } catch {
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (taskId, status) => {
    try {
      await api.post(`/api/tasks/${taskId}/status`, { status })
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status } : t))
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDragEnd = (result) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    const newStatus = destination.droppableId
    const task = tasks.find(t => t._id === draggableId)
    if (!task || task.status === newStatus) return

    const canUpdate = canUpdateAny ||
      task.assignee_ids?.includes(user._id)

    if (!canUpdate) {
      toast.error('You can only update your own tasks')
      return
    }

    updateStatus(draggableId, newStatus)
  }

  const filteredTasks = tasks.filter(t => {
    const matchSearch = !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
    const matchAssignee = !filterAssignee ||
      t.assignee_ids?.includes(filterAssignee)
    return matchSearch && matchAssignee
  })

  const getColumnTasks = (status) =>
    filteredTasks.filter(t => t.status === status)

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
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Task Board</h1>
          <p className="text-xs text-text-muted">{tasks.length} tasks total</p>
        </div>

        <div className="flex-1 max-w-xs">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="input-base pl-9 text-sm"
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <select
          className="input-base text-sm w-44"
          value={filterAssignee}
          onChange={e => setFilterAssignee(e.target.value)}
        >
          <option value="">All Assignees</option>
          {users.map(u => (
            <option key={u._id} value={u._id}>{u.name}</option>
          ))}
        </select>

        {canCreate && (
          <button
            onClick={() => setShowNewTask(true)}
            className="btn-primary flex-shrink-0"
          >
            <Plus size={16} />
            New Task
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4 h-full min-h-0" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map(col => {
              const colTasks = getColumnTasks(col.id)
              const Icon = col.icon

              return (
                <div key={col.id} className="w-72 flex flex-col">
                  {/* Column Header */}
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3',
                    col.bg, `border ${col.border}`
                  )}>
                    <Icon size={15} className={col.color} />
                    <span className={cn('font-semibold text-sm', col.color)}>
                      {col.label}
                    </span>
                    <span className={cn(
                      'ml-auto text-xs font-bold px-2 py-0.5 rounded-full',
                      col.bg, col.color
                    )}>
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Droppable */}
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          'flex-1 space-y-2 p-2 rounded-xl min-h-[200px] transition-colors',
                          snapshot.isDraggingOver ? 'bg-messa-red/5 border border-dashed border-messa-red/30' : 'bg-muted/30'
                        )}
                      >
                        {loading ? (
                          Array(2).fill(0).map((_, i) => <TaskSkeleton key={i} />)
                        ) : colTasks.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <Icon size={24} className={cn(col.color, 'opacity-30')} />
                            <p className="text-xs text-text-muted text-center">
                              No tasks {snapshot.isDraggingOver ? '– drop here!' : 'here'}
                            </p>
                          </div>
                        ) : (
                          colTasks.map((task, idx) => (
                            <TaskCard
                              key={task._id}
                              task={task}
                              index={idx}
                              onUpdate={updateStatus}
                              canUpdate={canUpdateAny || task.assignee_ids?.includes(user._id)}
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

      {/* New Task Modal */}
      <AnimatePresence>
        {showNewTask && (
          <NewTaskModal
            users={users}
            onClose={() => setShowNewTask(false)}
            onCreated={(task) => setTasks(prev => [...prev, task])}
          />
        )}
      </AnimatePresence>
    </div>
  )
}