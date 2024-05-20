async function fetchUsers() {
    try {
        const response = await fetch('/get-users');
        if (response.ok) {
            const data = await response.json();
            updateNotificationsWidget(data.names, data.emails, data.ids);
        } else {
            throw new Error('Failed to fetch reported issues');
        }
    } catch (error) {
        console.error('Error fetching reported issues:', error);
    }
}


function updateNotificationsWidget(names, emails, ids) {
    const notificationsList = document.getElementById('notifications-list');
    // Clear existing items in the list
    notificationsList.innerHTML = '';

    // Add each issue to the notifications widget
    names.forEach((name, index) => {
        const newItem = document.createElement('li');
        
        newItem.className = 'notification-item'; // Add a class for styling
        newItem.id = `issue-${ids[index]}`; // Set ID for identifying the issue

        

        // Construct the content of the list item with icons using innerHTML
        newItem.innerHTML = `
            <img src="images/userIcon.jpeg" alt="User Icon" class="icon" style="width: 20px; height: 20px; margin-right: 5px;">
            ${name}
            <br>
            <img src="images/emailIcon.jpg" alt="Email Icon" class="icon" style="width: 20px; height: 20px; margin-left: 50px;">
            ${emails[index]}
        `;

        // Create the "Delete" button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete-button'; // Add a class for styling
        
        // Set up event listener for the delete button
        deleteButton.onclick = function() {
            // Extract the issue ID from the ID of the parent list item
            const Id = newItem.id.split('-')[1];
            console.log("person to be deleted has id: ",Id);
            
            // Call a function to delete the item from the database
            deleteIssue(Id);
        };

        // Append the delete button to the list item
        newItem.appendChild(deleteButton);

        // Append the list item to the notifications list
        notificationsList.appendChild(newItem);
    });
}

function deleteIssue(Id) {
    return fetch(`/delete-user/${Id}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            const element = document.getElementById(`issue-${Id}`);
            if (element) {
                element.parentNode.removeChild(element);
            }
        } else {
            throw new Error('Failed to delete issue');
        }
    })
    .catch(error => {
        console.error('Error deleting issue:', error);
    });
}


module.exports = { fetchUsers, deleteIssue };