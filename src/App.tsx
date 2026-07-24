import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import type {
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";

import "./App.css";

type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
type Priority = "low" | "normal" | "high";

type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
};

type ColumnDefinition = {
  key: TaskStatus;
  title: string;
  emptyTitle: string;
  emptyText: string;
};

const columns: ColumnDefinition[] = [
  {
    key: "todo",
    title: "To Do",
    emptyTitle: "No tasks yet",
    emptyText: "Create a task to get started.",
  },
  {
    key: "in_progress",
    title: "In Progress",
    emptyTitle: "Nothing in progress",
    emptyText: "Move a task here when work begins.",
  },
  {
    key: "in_review",
    title: "In Review",
    emptyTitle: "Nothing to review",
    emptyText: "Completed work can be reviewed here.",
  },
  {
    key: "done",
    title: "Done",
    emptyTitle: "No completed tasks",
    emptyText: "Finished tasks will appear here.",
  },
];

function getTodayDate() {
  const today = new Date();

  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
}

function getDueDateStatus(task: Task) {
  if (!task.dueDate || task.status === "done") {
    return null;
  }

  const today = getTodayDate();
  const dueDate = new Date(`${task.dueDate}T00:00:00`);

  const differenceInMilliseconds =
    dueDate.getTime() - today.getTime();

  const differenceInDays = Math.ceil(
    differenceInMilliseconds / (1000 * 60 * 60 * 24),
  );

  if (differenceInDays < 0) {
    return {
      label: "Overdue",
      className: "due-overdue",
    };
  }

  if (differenceInDays === 0) {
    return {
      label: "Due today",
      className: "due-today",
    };
  }

  if (differenceInDays <= 3) {
    return {
      label: `Due in ${differenceInDays} day${
        differenceInDays === 1 ? "" : "s"
      }`,
      className: "due-soon",
    };
  }

  return {
    label: `Due ${dueDate.toLocaleDateString()}`,
    className: "due-normal",
  };
}

function TaskCard({
  task,
  isOverlay = false,
}: {
  task: Task;
  isOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: {
      type: "task",
      task,
    },
    disabled: isOverlay,
  });

  const style =
    transform && !isOverlay
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
      : undefined;

  const dueDateStatus = getDueDateStatus(task);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`task-card ${
        isDragging ? "task-card-dragging" : ""
      } ${isOverlay ? "task-card-overlay" : ""}`}
      {...attributes}
      {...listeners}
    >
      <div className="task-card-top">
        <span
          className={`priority-badge priority-${task.priority}`}
        >
          {task.priority}
        </span>

        <span className="drag-handle" aria-hidden="true">
          ⠿
        </span>
      </div>

      <h3>{task.title}</h3>

      {task.description && <p>{task.description}</p>}

      {task.dueDate && (
        <div
          className={`task-date ${
            dueDateStatus?.className ?? "due-complete"
          }`}
        >
          <span className="due-date-dot" />

          {task.status === "done"
            ? `Completed · Due ${new Date(
                `${task.dueDate}T00:00:00`,
              ).toLocaleDateString()}`
            : dueDateStatus?.label}
        </div>
      )}
    </article>
  );
}

function BoardColumn({
  column,
  tasks,
  isFiltering,
}: {
  column: ColumnDefinition;
  tasks: Task[];
  isFiltering: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.key,
    data: {
      type: "column",
      status: column.key,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`column ${isOver ? "column-over" : ""}`}
    >
      <div className="column-header">
        <h2>{column.title}</h2>
        <span>{tasks.length}</span>
      </div>

      <div className="task-list">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <p>
              {isFiltering
                ? "No matching tasks"
                : column.emptyTitle}
            </p>

            <span>
              {isFiltering
                ? "Try changing your search or priority filter."
                : column.emptyText}
            </span>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard task={task} key={task.id} />
          ))
        )}
      </div>
    </div>
  );
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] =
    useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] =
    useState<Priority>("normal");
  const [dueDate, setDueDate] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] =
    useState<Priority | "all">("all");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const filteredTasks = useMemo(() => {
    const normalizedSearch =
      searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        normalizedSearch === "" ||
        task.title
          .toLowerCase()
          .includes(normalizedSearch) ||
        task.description
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesPriority =
        priorityFilter === "all" ||
        task.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, priorityFilter]);

  const tasksByColumn = useMemo(() => {
    return columns.reduce<Record<TaskStatus, Task[]>>(
      (accumulator, column) => {
        accumulator[column.key] = filteredTasks.filter(
          (task) => task.status === column.key,
        );

        return accumulator;
      },
      {
        todo: [],
        in_progress: [],
        in_review: [],
        done: [],
      },
    );
  }, [filteredTasks]);

  const boardStats = useMemo(() => {
    const total = tasks.length;

    const completed = tasks.filter(
      (task) => task.status === "done",
    ).length;

    const inProgress = tasks.filter(
      (task) => task.status === "in_progress",
    ).length;

    const overdue = tasks.filter((task) => {
      if (!task.dueDate || task.status === "done") {
        return false;
      }

      const taskDueDate = new Date(
        `${task.dueDate}T00:00:00`,
      );

      return taskDueDate < getTodayDate();
    }).length;

    const completionPercentage =
      total === 0
        ? 0
        : Math.round((completed / total) * 100);

    return {
      total,
      completed,
      inProgress,
      overdue,
      completionPercentage,
    };
  }, [tasks]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setPriority("normal");
    setDueDate("");
  }

  function closeModal() {
    resetForm();
    setIsModalOpen(false);
  }

  function handleCreateTask(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: trimmedTitle,
      description: description.trim(),
      status: "todo",
      priority,
      dueDate,
    };

    setTasks((currentTasks) => [
      newTask,
      ...currentTasks,
    ]);

    closeModal();
  }

  function handleDragStart(event: DragStartEvent) {
    const draggedTask = tasks.find(
      (task) => task.id === event.active.id,
    );

    setActiveTask(draggedTask ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveTask(null);

    if (!over) {
      return;
    }

    const destinationStatus = over.id as TaskStatus;

    const validStatus = columns.some(
      (column) => column.key === destinationStatus,
    );

    if (!validStatus) {
      return;
    }

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === active.id
          ? {
              ...task,
              status: destinationStatus,
            }
          : task,
      ),
    );
  }

  const isFiltering =
    searchQuery.trim() !== "" ||
    priorityFilter !== "all";

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">
            PROJECT WORKSPACE
          </p>

          <h1>Product Launch</h1>

          <p className="subtitle">
            Plan, track, and complete your team's work.
          </p>
        </div>

        <button
          className="new-task-button"
          onClick={() => setIsModalOpen(true)}
        >
          + New task
        </button>
      </header>

      <section
        className="stats-grid"
        aria-label="Board summary"
      >
        <article className="stat-card">
          <div>
            <p>Total tasks</p>
            <strong>{boardStats.total}</strong>
          </div>

          <span className="stat-icon">▦</span>
        </article>

        <article className="stat-card">
          <div>
            <p>In progress</p>
            <strong>{boardStats.inProgress}</strong>
          </div>

          <span className="stat-icon">◷</span>
        </article>

        <article className="stat-card">
          <div>
            <p>Completed</p>
            <strong>{boardStats.completed}</strong>
          </div>

          <span className="stat-icon">✓</span>
        </article>

        <article
          className={`stat-card ${
            boardStats.overdue > 0
              ? "stat-card-warning"
              : ""
          }`}
        >
          <div>
            <p>Overdue</p>
            <strong>{boardStats.overdue}</strong>
          </div>

          <span className="stat-icon">!</span>
        </article>

        <article className="progress-card">
          <div className="progress-header">
            <div>
              <p>Project progress</p>
              <strong>
                {boardStats.completionPercentage}%
              </strong>
            </div>

            <span>
              {boardStats.completed} of{" "}
              {boardStats.total} completed
            </span>
          </div>

          <div
            className="progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              boardStats.completionPercentage
            }
          >
            <div
              className="progress-fill"
              style={{
                width: `${boardStats.completionPercentage}%`,
              }}
            />
          </div>
        </article>
      </section>

      <section
        className="board-toolbar"
        aria-label="Task filters"
      >
        <div className="search-field">
          <span
            className="search-icon"
            aria-hidden="true"
          >
            ⌕
          </span>

          <input
            type="search"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            placeholder="Search tasks..."
            aria-label="Search tasks"
          />

          {searchQuery && (
            <button
              type="button"
              className="clear-search-button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear task search"
            >
              ×
            </button>
          )}
        </div>

        <label className="filter-field">
          <span>Priority</span>

          <select
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(
                event.target.value as
                  | Priority
                  | "all",
              )
            }
          >
            <option value="all">
              All priorities
            </option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </label>

        <div className="filter-results">
          Showing{" "}
          <strong>{filteredTasks.length}</strong> of{" "}
          <strong>{tasks.length}</strong> tasks
        </div>

        {isFiltering && (
          <button
            type="button"
            className="reset-filters-button"
            onClick={() => {
              setSearchQuery("");
              setPriorityFilter("all");
            }}
          >
            Reset filters
          </button>
        )}
      </section>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <section className="board">
          {columns.map((column) => (
            <BoardColumn
              key={column.key}
              column={column}
              tasks={tasksByColumn[column.key]}
              isFiltering={isFiltering}
            />
          ))}
        </section>

        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {isModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={closeModal}
        >
          <section
            className="task-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-task-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">
                  NEW TASK
                </p>

                <h2 id="new-task-title">
                  Add work to your board
                </h2>
              </div>

              <button
                type="button"
                className="close-button"
                aria-label="Close task form"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              <label>
                Task title

                <input
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="Example: Build onboarding screen"
                  autoFocus
                  required
                />
              </label>

              <label>
                Description

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value,
                    )
                  }
                  placeholder="Add useful details..."
                  rows={4}
                />
              </label>

              <div className="form-row">
                <label>
                  Priority

                  <select
                    value={priority}
                    onChange={(event) =>
                      setPriority(
                        event.target
                          .value as Priority,
                      )
                    }
                  >
                    <option value="low">
                      Low
                    </option>
                    <option value="normal">
                      Normal
                    </option>
                    <option value="high">
                      High
                    </option>
                  </select>
                </label>

                <label>
                  Due date

                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) =>
                      setDueDate(
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Create task
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;