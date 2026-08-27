import { createSchedulerTask, fetchSchedulerToday } from './experience-api.js';

export function renderSchedulerDashboard() {
  return `
    <div class="experience-page anim-fade-up">
      <header class="experience-hero">
        <div>
          <p class="experience-kicker">Scheduler Dashboard</p>
          <h1>Daily and Weekly Planning</h1>
          <p>Manage today tasks, create new items, and align revision reminders with interview preparation.</p>
        </div>
      </header>

      <div class="experience-shell single-main">
        <main class="experience-main">
          <div class="scheduler-grid">
            <section class="card experience-panel">
              <h3>Today Tasks</h3>
              <div id="scheduler-tasks" class="scheduler-task-list">
                <p class="experience-muted">Loading tasks...</p>
              </div>
            </section>

            <section class="card experience-panel">
              <h3>Create Task</h3>
              <label class="input-group">
                <span class="experience-label">Title</span>
                <input class="input" id="scheduler-task-title" placeholder="Revise OS: deadlocks" />
              </label>
              <label class="input-group">
                <span class="experience-label">Due Date</span>
                <input class="input" type="date" id="scheduler-task-date" />
              </label>
              <button class="btn btn-primary" id="scheduler-create-btn">Create Task</button>
              <div id="scheduler-create-status" class="experience-muted"></div>
            </section>
          </div>
        </main>
      </div>
    </div>
  `;
}

export async function initSchedulerDashboard() {
  const taskList = document.getElementById('scheduler-tasks');
  const titleEl = document.getElementById('scheduler-task-title');
  const dateEl = document.getElementById('scheduler-task-date');
  const createBtn = document.getElementById('scheduler-create-btn');
  const statusEl = document.getElementById('scheduler-create-status');

  const renderTasks = (tasks) => {
    if (!taskList) return;
    if (!Array.isArray(tasks) || !tasks.length) {
      taskList.innerHTML = '<p class="experience-muted">No tasks for today.</p>';
      return;
    }

    taskList.innerHTML = tasks
      .map((task) => {
        if (typeof task === 'string') {
          return `<div class="scheduler-task-item"><strong>${task}</strong><small class="experience-muted">legacy</small></div>`;
        }

        const title = task?.title || 'Untitled task';
        const taskType = task?.taskType || task?.task_type || 'study';
        const dueDate = task?.dueDate || task?.due_date || 'n/a';
        const status = task?.status || 'pending';

        return `
          <div class="scheduler-task-item">
            <strong>${title}</strong>
            <small class="experience-muted">${taskType} · due ${dueDate} · ${status}</small>
          </div>
        `;
      })
      .join('');
  };

  if (dateEl && !dateEl.value) {
    dateEl.value = new Date().toISOString().split('T')[0];
  }

  try {
    const today = await fetchSchedulerToday();
    renderTasks(today?.tasks || []);
  } catch (error) {
    if (taskList) taskList.innerHTML = `<p class="experience-muted">Unable to load tasks: ${error.message}</p>`;
  }

  if (createBtn && titleEl && dateEl && statusEl) {
    createBtn.addEventListener('click', async () => {
      const title = titleEl.value.trim();
      const dueDate = dateEl.value;
      if (!title || !dueDate) {
        statusEl.textContent = 'Title and due date are required.';
        return;
      }

      statusEl.textContent = 'Creating task...';
      try {
        await createSchedulerTask({
          title,
          dueDate,
          taskType: 'study',
        });
        statusEl.textContent = 'Task created.';
        titleEl.value = '';
        const today = await fetchSchedulerToday();
        renderTasks(today?.tasks || []);
      } catch (error) {
        statusEl.textContent = `Failed: ${error.message}`;
      }
    });
  }

  window.lucide?.createIcons();
}
