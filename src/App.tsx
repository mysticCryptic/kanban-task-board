import { useMemo, useState } from "react";
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

const columns: {
  key: TaskStatus;
  title: string;
  emptyTitle: string;
  emptyText: string;
}[] = [
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

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [dueDate, setDueDate] = useState("");

  const tasksByColumn = useMemo(() => {
    return columns.reduce<Record<TaskStatus, Task[]>>(
      (accumulator, column) => {
        accumulator[column.key] = tasks.filter(
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

  function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
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

    setTasks((currentTasks) => [newTask, ...currentTasks]);
    closeModal();
  }

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">PROJECT WORKSPACE</p>
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

      <section className="board">
        {columns.map((column) => {
          const columnTasks = tasksByColumn[column.key];

          return (
            <div className="column" key={column.key}>
              <div className="column-header">
                <h2>{column.title}</h2>
                <span>{columnTasks.length}</span>
              </div>

              <div className="task-list">
                {columnTasks.length === 0 ? (
                  <div className="empty-state">
                    <p>{column.emptyTitle}</p>
                    <span>{column.emptyText}</span>
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <article className="task-card" key={task.id}>
                      <div className="task-card-top">
                        <span
                          className={`priority-badge priority-${task.priority}`}
                        >
                          {task.priority}
                        </span>
                      </div>

                      <h3>{task.title}</h3>

                      {task.description && <p>{task.description}</p>}

                      {task.dueDate && (
                        <div className="task-date">
                          Due {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString()}
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </section>

      {isModalOpen && (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <section
            className="task-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-task-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">NEW TASK</p>
                <h2 id="new-task-title">Add work to your board</h2>
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
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Build onboarding screen"
                  autoFocus
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
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
                      setPriority(event.target.value as Priority)
                    }
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </label>

                <label>
                  Due date
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
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

                <button type="submit" className="primary-button">
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