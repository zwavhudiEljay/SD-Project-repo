//Import the function to test
const { fetchUsers, deleteIssue } = require('./deleteUsers');
beforeEach(() => {
    // Mock the DOM element
    document.body.innerHTML = '<ul id="notifications-list"></ul>';
    // Clear fetch mock
    if (!global.fetch) {
        global.fetch = jest.fn();
    }
});

test('fetchUsers should update notifications widget with fetched data', async () => {
    // Mock the fetch response
    const response = {
        names: ['John', 'Alice'],
        emails: ['john@example.com', 'alice@example.com'],
        ids: [1, 2]
    };
    
     // Mock the fetch function to return the response
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(response)
    });

    // Mock the updateNotificationsWidget function
    const notificationsList = document.getElementById('notifications-list');
    const appendChildMock = jest.fn();
    notificationsList.appendChild = appendChildMock;
  
    // Call the function to test
    await fetchUsers();
     // Expectations
     expect(notificationsList.innerHTML).toBe(''); // Check if it was cleared
     expect(appendChildMock).toHaveBeenCalledTimes(2); // Ensure two items were added
   });
  
  test('fetchUsers should log an error if fetching fails', async () => {
        // Mock the fetch function to simulate a failure
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Failed to fetch reported issues'));
  
     // Spy on console.error
     const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  
    // Call the function to test
    await fetchUsers();
  
    // Expectations
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching reported issues:', expect.any(Error));
    consoleErrorSpy.mockRestore();
   });
  
  
 describe('deleteIssue', () => {
     beforeEach(() => {
        // Mock fetch globally
         global.fetch = jest.fn();
    });

     test('should send a DELETE request to the server', () => {
         const id = 123; // Example ID

         // Mock fetch to return a successful response
        fetch.mockResolvedValueOnce({ ok: true });
        
         // Call the function being tested
        deleteIssue(id);

        // Expect fetch to be called with the correct arguments
         expect(fetch).toHaveBeenCalledWith(`/delete-user/${id}`, {
            method: 'DELETE'
         });
     });

    test('should remove the corresponding item from the UI if deletion is successful', async () => {
         const id = 123; // Example ID
         const response = { ok: true };

        // Mock fetch to return a successful response
         fetch.mockResolvedValueOnce(response);

         // Mock DOM manipulation methods
        document.getElementById = jest.fn().mockReturnValue({
            parentNode: {
                removeChild: jest.fn()
             }
        });
        // Call the function being tested
         await deleteIssue(id);

         // Expect the item to be removed from the UI
        expect(document.getElementById).toHaveBeenCalledWith(`issue-${id}`);
        expect(document.getElementById().parentNode.removeChild).toHaveBeenCalled();
     });

     test('should log an error if deletion fails', async () => {
         const id = 123; // Example ID
         const error = new Error('Failed to delete issue');

         // Mock fetch to return an error response
         fetch.mockRejectedValueOnce(error);

         // Spy on console.error to check if it's called with the correct error message
         console.error = jest.fn();

         // Call the function being tested
         await deleteIssue(id);
        // Expect console.error to be called with the correct error message
        expect(console.error).toHaveBeenCalledWith('Error deleting issue:', error);
    });
});

