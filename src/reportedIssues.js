document.addEventListener('DOMContentLoaded', fetchReportedIssues);

function fetchReportedIssues() {
    fetch('/reported-issues')
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Failed to fetch reported issues');
            }
        })
        .then(data => {
            const { issues, ids } = data;
            fetchMaintenancePeople()
                .then(maintenancePeople => {
                    updateNotificationsWidget(issues, ids, maintenancePeople);
                })
                .catch(error => {
                    console.error('Error fetching maintenance people:', error);
                });
        })
        .catch(error => {
            console.error('Error fetching reported issues:', error);
        });
}

function fetchMaintenancePeople() {
    return fetch('/get-maintanance')
        .then(response => response.json())
        .catch(error => {
            console.error('Error fetching maintenance:', error);
            throw error;
        });
}

function updateNotificationsWidget(issues, ids, maintenancePeople) {
    const notificationsTableBody = document.querySelector('#notifications-table tbody');
    notificationsTableBody.innerHTML = ''; // Clear existing rows

    issues.forEach((issue, index) => {
        const newRow = document.createElement('tr');
        newRow.dataset.issueId = ids[index]; // Add data attribute for issue ID

        // Description column
        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = issue;
        descriptionCell.style.width = '1000px';
        newRow.appendChild(descriptionCell);

        // Action column
        const actionCell = document.createElement('td');
        const actionButtons = document.createElement('div');
        actionButtons.className = 'action-buttons';

        // Dropdown for maintenance people
        const dropdown = document.createElement('select');
        dropdown.className = 'drop-down';

        // Populate the dropdown with maintenance people
        const defaultOption = document.createElement('option');
        defaultOption.textContent = 'Select Maintenance';
        defaultOption.value = '';
        dropdown.appendChild(defaultOption);

        maintenancePeople.forEach(maintenance => {
            const option = document.createElement('option');
            option.value = maintenance.id;
            option.textContent = maintenance.name;
            dropdown.appendChild(option);
        });

        actionButtons.appendChild(dropdown);

        // Assign button
        const assignButton = document.createElement('button');
        assignButton.textContent = 'Assign';
        assignButton.className = 'assign-button';
        assignButton.onclick = function() {
            const selectedMaintenanceID = dropdown.value;
            if (selectedMaintenanceID) {
                assignMaintenance(issue, assignButton, ids[index], selectedMaintenanceID);
            } else {
                alert('Please select a maintenance person');
            }
        };
        actionButtons.appendChild(assignButton);

        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete-button';
        deleteButton.onclick = function() {
            deleteIssue(ids[index]);
        };
        actionButtons.appendChild(deleteButton);

        actionCell.appendChild(actionButtons);
        newRow.appendChild(actionCell);

        notificationsTableBody.appendChild(newRow);

        updateButtonState(assignButton, ids[index]);
    });
}

function updateButtonState(button, issueId) {
    const assigned = localStorage.getItem(`issue-${issueId}`);
    if (assigned === 'true') {
        button.innerHTML = 'Assigned';
        button.style.backgroundColor = 'green';
        button.disabled = true;
    } else {
        button.innerHTML = 'Assign';
        button.style.backgroundColor = '';
        button.disabled = false;
    }
}

function updateAssignedStateInStorage(issueId, assigned) {
    localStorage.setItem(`issue-${issueId}`, assigned);
}

function assignMaintenance(issue, assignButton, issueId, selectedMaintenanceID) {
    if (assignButton.disabled) {
        return;
    }
    fetch('/assign-to-maintanace', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ issue, issueId, selectedMaintenanceID })
    })
    .then(response => {
        if (response.ok) {
            console.log('Issue is sent to the database');
            setTimeout(() => {
                if (assignButton) {
                    assignButton.innerHTML = 'Assigned';
                    assignButton.style.backgroundColor = 'green';
                    assignButton.disabled = true;
                    updateAssignedStateInStorage(issueId, true);
                }
            }, 5000);
        } else {
            throw new Error('Failed to assign maintenance');
        }
    })
    .catch(error => {
        console.error('Error assigning maintenance:', error);
        assignButton.disabled = false;
    });
}

function deleteIssue(issueId) {
    fetch(`/delete-issue/${issueId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            const itemToRemove = document.querySelector(`tr[data-issue-id='${issueId}']`);
            if (itemToRemove) {
                itemToRemove.parentNode.removeChild(itemToRemove);
            }
            console.log(`Issue with ID ${issueId} deleted successfully.`);
        } else {
            throw new Error('Failed to delete issue');
        }
    })
    .catch(error => {
        console.error('Error deleting issue:', error);
    });
}
