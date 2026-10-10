const addStudentForm = document.getElementById('addStudentForm');
const editStudentForm = document.getElementById('editStudentForm');
const studentTable = document.getElementById('studentTable');
const studentCount = document.getElementById('studentCount');
const editDialog = document.getElementById('editDialog');
const notice = document.getElementById('notice');
let editingStudentId = null;
let noticeTimeout;

async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || data.message || `Request failed (${response.status})`);
    }

    return data;
}

function showNotice(message, isError = false) {
    window.clearTimeout(noticeTimeout);
    notice.textContent = message;
    notice.classList.toggle('notice-error', isError);
    notice.hidden = false;

    if (!isError) {
        noticeTimeout = window.setTimeout(() => {
            notice.hidden = true;
        }, 4500);
    }
}

function setButtonBusy(button, isBusy, busyText) {
    if (isBusy) {
        button.dataset.originalContent = button.innerHTML;
        button.textContent = busyText;
        button.disabled = true;
        return;
    }

    button.innerHTML = button.dataset.originalContent || button.textContent;
    button.disabled = false;
    delete button.dataset.originalContent;
}

function addCell(row, value, className) {
    const cell = document.createElement('td');
    cell.textContent = value ?? '';

    if (className) {
        cell.className = className;
    }

    row.append(cell);
    return cell;
}

function renderStudents(students) {
    studentCount.textContent = String(students.length);
    studentTable.replaceChildren();

    if (students.length === 0) {
        const row = document.createElement('tr');
        const cell = addCell(row, 'No students yet. Add one above to get started.', 'table-message');
        cell.colSpan = 6;
        studentTable.append(row);
        return;
    }

    students.forEach((student) => {
        const row = document.createElement('tr');
        addCell(row, student.id, 'student-id');
        addCell(row, student.name, 'student-name');
        addCell(row, student.course);

        const attendanceCell = addCell(row, `${student.attendance}%`);
        const attendanceValue = document.createElement('span');
        attendanceValue.className = 'attendance-value';
        attendanceValue.textContent = `${student.attendance}%`;
        attendanceCell.replaceChildren(attendanceValue);

        addCell(row, student.marks);
        const actionsCell = document.createElement('td');
        const actions = document.createElement('div');
        actions.className = 'row-actions';

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'row-action';
        editButton.textContent = 'Edit';
        editButton.setAttribute('aria-label', `Edit attendance and marks for ${student.name}`);
        editButton.addEventListener('click', () => openEditDialog(student));

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'row-action row-action-delete';
        deleteButton.textContent = 'Delete';
        deleteButton.setAttribute('aria-label', `Delete ${student.name}`);
        deleteButton.addEventListener('click', () => deleteStudent(student.id));

        actions.append(editButton, deleteButton);
        actionsCell.append(actions);
        row.append(actionsCell);
        studentTable.append(row);
    });
}

async function loadStudents() {
    studentTable.innerHTML = '<tr><td class="table-message" colspan="6">Loading students…</td></tr>';

    try {
        const students = await requestJson('/students');

        if (!Array.isArray(students)) {
            throw new Error('The server returned an invalid student list.');
        }

        renderStudents(students);
    } catch (error) {
        studentCount.textContent = '—';
        studentTable.innerHTML = '<tr><td class="table-message" colspan="6">Could not load students. Please try again.</td></tr>';
        showNotice(`Could not load students: ${error.message}`, true);
    }
}

addStudentForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!addStudentForm.reportValidity()) {
        return;
    }

    const button = addStudentForm.querySelector('button[type="submit"]');
    const formData = new FormData(addStudentForm);
    const student = {
        name: formData.get('name').trim(),
        course: formData.get('course').trim(),
        attendance: Number(formData.get('attendance')),
        marks: Number(formData.get('marks'))
    };

    if (!student.name || !student.course) {
        showNotice('Enter a student name and course.', true);
        return;
    }

    setButtonBusy(button, true, 'Adding…');

    try {
        await requestJson('/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(student)
        });

        addStudentForm.reset();
        showNotice('Student added successfully.');
        await loadStudents();
    } catch (error) {
        showNotice(`Could not add student: ${error.message}`, true);
    } finally {
        setButtonBusy(button, false);
    }
});

function openEditDialog(student) {
    editingStudentId = student.id;
    document.getElementById('editStudentName').textContent = student.name;
    document.getElementById('editAttendance').value = student.attendance;
    document.getElementById('editMarks').value = student.marks;
    editDialog.showModal();
}

editStudentForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!editStudentForm.reportValidity() || editingStudentId === null) {
        return;
    }

    const button = editStudentForm.querySelector('button[type="submit"]');
    const attendance = Number(document.getElementById('editAttendance').value);
    const marks = Number(document.getElementById('editMarks').value);
    setButtonBusy(button, true, 'Saving…');

    try {
        await requestJson(`/students/${encodeURIComponent(editingStudentId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attendance, marks })
        });

        editDialog.close();
        showNotice('Student progress updated successfully.');
        await loadStudents();
    } catch (error) {
        showNotice(`Could not update student: ${error.message}`, true);
    } finally {
        setButtonBusy(button, false);
    }
});

async function deleteStudent(id) {
    if (!window.confirm('Are you sure you want to delete this student?')) {
        return;
    }

    try {
        await requestJson(`/students/${encodeURIComponent(id)}`, { method: 'DELETE' });
        showNotice('Student deleted successfully.');
        await loadStudents();
    } catch (error) {
        showNotice(`Could not delete student: ${error.message}`, true);
    }
}

function closeEditDialog() {
    editDialog.close();
    editingStudentId = null;
}

document.getElementById('closeEdit').addEventListener('click', closeEditDialog);
document.getElementById('cancelEdit').addEventListener('click', closeEditDialog);
editDialog.addEventListener('close', () => {
    editingStudentId = null;
});

loadStudents();
