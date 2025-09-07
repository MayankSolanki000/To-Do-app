
document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskDueDateInput = document.getElementById('task-due-date');
    const taskDueTimeInput = document.getElementById('task-due-time');
    const taskList = document.getElementById('task-list');
    const completedTaskList = document.getElementById('completed-task-list');
    const trashList = document.getElementById('trash-list');
    const themeToggleButton = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    const body = document.body;
    const undoAlert = document.getElementById('undo-alert');
    const undoMessage = document.getElementById('undo-message');
    const undoBtn = document.getElementById('undo-btn');
    const emptyTrashBtn = document.getElementById('empty-trash-btn');
    const sortDueDateBtn = document.getElementById('sort-due-date-btn');

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let deletedTasks = JSON.parse(localStorage.getItem('deletedTasks')) || [];
    let undoTimeout;
    let sortByDateAsc = true;

    // --- Theme Management ---
    themeToggleButton.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        const isLightMode = body.classList.contains('light-mode');
        localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
        themeIcon.textContent = isLightMode ? '🌙' : '☀️';
        themeToggleButton.setAttribute('aria-label', isLightMode ? 'Switch to dark mode' : 'Switch to light mode');
    });

    const loadTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            body.classList.add('light-mode');
            themeIcon.textContent = '🌙';
            themeToggleButton.setAttribute('aria-label', 'Switch to dark mode');
        }
    };

    // --- Data Persistence ---
    const saveTasks = () => localStorage.setItem('tasks', JSON.stringify(tasks));
    const saveDeletedTasks = () => localStorage.setItem('deletedTasks', JSON.stringify(deletedTasks));

    // --- Undo Functionality (for edits) ---
    const showUndoAlert = (message, undoCallback) => {
        clearTimeout(undoTimeout);
        undoMessage.textContent = message;
        undoAlert.classList.add('show');

        const undoHandler = () => {
            undoCallback();
            hideUndoAlert();
            undoBtn.removeEventListener('click', undoHandler);
        };

        undoBtn.addEventListener('click', undoHandler);
        
        undoTimeout = setTimeout(() => {
            hideUndoAlert();
            undoBtn.removeEventListener('click', undoHandler);
        }, 5000);
    };

    const hideUndoAlert = () => {
        undoAlert.classList.remove('show');
    };

    // --- Task Creation and Rendering ---
    const createTaskElement = (task) => {
        const li = document.createElement('li');
        li.setAttribute('data-id', task.id);
        li.setAttribute('role', 'listitem');

        const taskMainContent = document.createElement('div');
        taskMainContent.className = 'task-main-content';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.id = `task-${task.id}`;
        checkbox.className = 'task-checkbox';
        const checkboxLabelText = `Mark task as ${task.completed ? 'incomplete' : 'complete'}: ${task.text}`;
        checkbox.setAttribute('aria-label', checkboxLabelText);

        const taskDetails = document.createElement('div');
        taskDetails.className = 'task-details';

        const label = document.createElement('label');
        label.htmlFor = `task-${task.id}`;
        label.className = 'task-label';
        
        const taskTextSpan = document.createElement('span');
        taskTextSpan.textContent = task.text;
        taskTextSpan.className = 'task-text';
        label.appendChild(taskTextSpan);
        taskDetails.appendChild(label);
        
        if (task.dueDate) {
            const dueDateSpan = document.createElement('span');
            dueDateSpan.className = 'task-due-date';
            const date = new Date(task.dueDate);

            // Adjust for timezone
            const userTimezoneOffset = date.getTimezoneOffset() * 60000;
            const adjustedDate = new Date(date.getTime() + userTimezoneOffset);

            let displayText = `Due: ${adjustedDate.toLocaleDateString(undefined, {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        })}`;

        if (task.dueTime) {
        displayText += ` at ${task.dueTime}`;
        }

        dueDateSpan.textContent = displayText;
        taskDetails.appendChild(dueDateSpan);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (!task.completed && adjustedDate < today) {
        li.classList.add('overdue');
        }
        }


        taskMainContent.appendChild(checkbox);
        taskMainContent.appendChild(taskDetails);
        li.appendChild(taskMainContent);


        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'task-buttons';

        const editBtn = document.createElement('button');
        editBtn.innerHTML = '&#9998;'; // Pencil icon
        editBtn.className = 'edit-btn';
        editBtn.setAttribute('aria-label', `Edit task: ${task.text}`);
        buttonContainer.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.className = 'delete-btn';
        deleteBtn.setAttribute('aria-label', `Delete task: ${task.text}`);
        buttonContainer.appendChild(deleteBtn);

        li.appendChild(buttonContainer);

        if (task.completed) {
            li.classList.add('completed');
            completedTaskList.appendChild(li);
        } else {
            taskList.appendChild(li);
        }

        // Event listeners
        checkbox.addEventListener('change', () => toggleCompleted(task.id));
        
        taskTextSpan.addEventListener('dblclick', () => enterEditMode(li, taskTextSpan, task));
        
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            enterEditMode(li, taskTextSpan, task);
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
        });
    };

    const renderTasks = () => {
        taskList.innerHTML = '';
        completedTaskList.innerHTML = '';
        tasks.forEach(createTaskElement);
    };

    const renderDeletedTasks = () => {
        trashList.innerHTML = '';
        deletedTasks.forEach(task => {
            const li = document.createElement('li');
            li.setAttribute('data-id', task.id);
            li.innerHTML = `
                <span class="deleted-task-text">${task.text}</span>
                <div class="task-buttons">
                    <button class="restore-btn" aria-label="Restore task: ${task.text}">♻️</button>
                    <button class="perm-delete-btn" aria-label="Permanently delete task: ${task.text}">🗑️</button>
                </div>
            `;
            
            li.querySelector('.restore-btn').addEventListener('click', () => restoreTask(task.id));
            li.querySelector('.perm-delete-btn').addEventListener('click', () => permanentlyDeleteTask(task.id));
            
            trashList.appendChild(li);
        });
    };

    // --- Task Actions ---
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTaskText = taskInput.value.trim();
        const dueDate = taskDueDateInput.value;
        // if (newTaskText) {
        //     const newTask = {
        //         id: Date.now().toString(),
        //         text: newTaskText,
        //         completed: false,
        //         dueDate: dueDate || null
        //     };

        const dueTime = taskDueTimeInput.value;
        const newTask = {
            id: Date.now().toString(),
            text: newTaskText,
            completed: false,
            dueDate: dueDate || null,
            dueTime: dueTime || null
        };

            
            tasks.push(newTask);
            saveTasks();
            renderTasks();
            taskInput.value = '';
            taskDueDateInput.value = '';
            taskDueTimeInput.value = '';
            taskInput.focus();
        // }
    });

    const deleteTask = (id) => {
        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex > -1) {
            const [deletedTask] = tasks.splice(taskIndex, 1);
            deletedTasks.unshift(deletedTask);
            saveTasks();
            saveDeletedTasks();
            renderTasks();
            renderDeletedTasks();
        }
    };
    
    const toggleCompleted = (id) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            saveTasks();
            renderTasks();
        }
    };

    const enterEditMode = (li, span, task) => {
        if (li.isEditing) return;
        li.isEditing = true;
        const originalText = task.text;
        
        const taskDetails = span.closest('.task-details');
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalText;
        input.className = 'edit-input';
        
        const mainContentContainer = li.querySelector('.task-main-content');
        
        taskDetails.style.display = 'none'; // Hide task details
        mainContentContainer.insertBefore(input, taskDetails); // Insert input before details

        input.focus();
        input.select();
        
        const saveEdit = () => {
            const newText = input.value.trim();
            if (newText && newText !== originalText) {
                task.text = newText;
                saveTasks();
                renderTasks();

                showUndoAlert('Task edited', () => {
                    task.text = originalText;
                    saveTasks();
                    renderTasks();
                });
            } else {
                renderTasks(); // Restore original state
            }
            li.isEditing = false;
        };

        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveEdit();
            } else if (e.key === 'Escape') {
                renderTasks(); // Cancel edit
                li.isEditing = false;
            }
        });
    };

    // --- Trash Actions ---
    const restoreTask = (id) => {
        const taskIndex = deletedTasks.findIndex(t => t.id === id);
        if (taskIndex > -1) {
            const [restoredTask] = deletedTasks.splice(taskIndex, 1);
            restoredTask.completed = false; // Always restore as incomplete
            tasks.push(restoredTask);
            saveDeletedTasks();
            saveTasks();
            renderDeletedTasks();
            renderTasks();
        }
    };

    const permanentlyDeleteTask = (id) => {
        const taskIndex = deletedTasks.findIndex(t => t.id === id);
        if (taskIndex > -1) {
            deletedTasks.splice(taskIndex, 1);
            saveDeletedTasks();
            renderDeletedTasks();
        }
    };

    emptyTrashBtn.addEventListener('click', () => {
        if (deletedTasks.length > 0 && confirm('Are you sure you want to permanently delete all items in the trash? This action cannot be undone.')) {
            deletedTasks = [];
            saveDeletedTasks();
            renderDeletedTasks();
        }
    });
    
    // --- Sorting ---
    sortDueDateBtn.addEventListener('click', () => {
        tasks.sort((a, b) => {
            const aHasDate = !!a.dueDate;
            const bHasDate = !!b.dueDate;

            if (aHasDate && !bHasDate) return -1;
            if (!aHasDate && bHasDate) return 1;
            if (!aHasDate && !bHasDate) return 0;

            const dateA = new Date(a.dueDate);
            const dateB = new Date(b.dueDate);

            return sortByDateAsc ? dateA - dateB : dateB - dateA;
        });

        sortByDateAsc = !sortByDateAsc; // Toggle for next click
        saveTasks();
        renderTasks();
    });


    // --- Initial Load ---
    loadTheme();
    renderTasks();
    renderDeletedTasks();
});