(() => {
  const taskForm = document.getElementById('taskForm');
  const taskList = document.getElementById('taskList');
  const filterButtons = document.querySelectorAll('.filters button');

  let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
  let currentFilter = 'all';

  const saveTasks = () => localStorage.setItem('tasks', JSON.stringify(tasks));

  const formatDateTime = (dateString) => {
    if (!dateString) return 'No due date';
    const dt = new Date(dateString);
    return dt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const renderTasks = () => {
    taskList.innerHTML = '';
    let filtered = [...tasks];
    const now = Date.now();

    switch (currentFilter) {
      case 'active':
        filtered = filtered.filter(t => !t.completed);
        break;
      case 'completed':
        filtered = filtered.filter(t => t.completed);
        break;
      case 'due-soon':
        filtered = filtered.filter(t => {
          if (!t.due) return false;
          const dueTime = new Date(t.due).getTime();
          return dueTime > now && dueTime - now <= 24 * 60 * 60 * 1000;
        });
        break;
    }

    if (filtered.length === 0) {
      taskList.innerHTML = '<p style="text-align:center; color:#777; margin-top: 2rem;">No tasks found.</p>';
      return;
    }

    filtered.forEach(task => {
      const taskEl = document.createElement('article');
      taskEl.className = 'task' + (task.completed ? ' completed' : '');
      taskEl.dataset.id = task.id;
      taskEl.setAttribute('role', 'listitem');
      taskEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; flex:1; flex-wrap: wrap;">
          <div class="checkbox${task.completed ? ' checked' : ''}" role="checkbox" tabindex="0" aria-checked="${task.completed}" aria-label="Mark '${task.title}' as ${task.completed ? 'incomplete' : 'complete'}"></div>
          <div style="flex-grow:1; min-width: 150px;">
            <div class="title" title="${task.desc || ''}">${task.title}</div>
            ${task.desc ? `<div class="desc">${task.desc}</div>` : ''}
          </div>
          <time class="due-date" datetime="${task.due || ''}" title="Due date">${formatDateTime(task.due)}</time>
        </div>
        <button class="btn" aria-label="Delete task '${task.title}'">&times;</button>
      `;
      taskList.appendChild(taskEl);
    });
  };

  const addTask = (task) => {
    tasks.push(task);
    saveTasks();
    renderTasks();
  };

  const toggleTaskCompleted = (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
  };

  const deleteTask = (id) => {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
  };

  taskForm.addEventListener('submit', e => {
    e.preventDefault();

    const title = taskForm.title.value.trim();
    if (!title) {
      alert('Please enter a task title');
      return;
    }
    const due = taskForm.due.value || null;
    const desc = taskForm.desc.value.trim() || '';

    const newTask = {
      id: crypto.randomUUID(),
      title,
      desc,
      due,
      completed: false,
      notified: false,
      createdAt: new Date().toISOString()
    };

    addTask(newTask);
    taskForm.reset();
    taskForm.title.focus();
  });

  taskList.addEventListener('click', e => {
    const target = e.target;
    const taskEl = target.closest('.task');
    if (!taskEl) return;
    const id = taskEl.dataset.id;

    if (target.classList.contains('checkbox')) {
      toggleTaskCompleted(id);
    } else if (target.classList.contains('btn')) {
      if (confirm('Are you sure you want to delete this task?')) {
        deleteTask(id);
      }
    }
  });

  taskList.addEventListener('keydown', e => {
    if ((e.key === ' ' || e.key === 'Enter') && e.target.classList.contains('checkbox')) {
      e.preventDefault();
      const taskEl = e.target.closest('.task');
      if (!taskEl) return;
      toggleTaskCompleted(taskEl.dataset.id);
    }
  });

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
        b.setAttribute('tabindex', '-1');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      btn.setAttribute('tabindex', '0');
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  // Reminder notifications
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setInterval(() => {
      const now = Date.now();
      tasks.forEach(task => {
        if (task.completed || task.notified || !task.due) return;

        const dueTime = new Date(task.due).getTime();
        const reminderTime = dueTime - 60 * 60 * 1000; // 1 hour before due time

        if (now >= reminderTime && now < dueTime) {
          new Notification('Task Reminder', {
            body: `Task "${task.title}" is due soon.`,
            icon: 'https://cdn-icons-png.flaticon.com/512/2921/2921222.png'
          });
          task.notified = true;
          saveTasks();
        }
      });
    }, 60000);
  }

  renderTasks();
})();
