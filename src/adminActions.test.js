const { searchStaff, deleteStaff, addStaff, displayStaffList} = require('./adminActions');
const { test, expect } = require('@jest/globals');

global.fetch = jest.fn();

describe('deleteStaff', () => {
    beforeEach(() => {
        // Mock the confirm function
        global.confirm = jest.fn(() => true);
    });

    test('should send a DELETE request to the server', () => {
        const id = 123; // Example ID
        
        // Call the function being tested
        deleteStaff(id);

        // Expect fetch to be called with the correct arguments
        expect(fetch).toHaveBeenCalledWith(`/staff/${id}`, {
            method: 'DELETE'
        });
    });

    test('should update DOM after successful deletion', async () => {
        const id = 123; // Example ID
        const listItemID = 'staff-123'; // Example listItemID

        // Mock a successful response from the server
        fetch.mockResolvedValueOnce({ ok: true });

        // Call the function being tested
        await deleteStaff(id, listItemID);

        // Assert that the deleted staff member is removed from the DOM
        expect(document.getElementById(listItemID)).toBeNull();
    });

    test('should handle errors during deletion', async () => {
        const id = 123; // Example ID
        const listItemID = 'staff-123'; // Example listItemID

        // Mock an error response from the server
        fetch.mockRejectedValueOnce(new Error('Failed to delete staff member'));

        // Call the function being tested
        await deleteStaff(id, listItemID);
    });

    test('should delete staff member without listItemID', async () => {
        const id = 123;
    
        fetch.mockResolvedValueOnce({ ok: true });
    
        await deleteStaff(id);
    
        expect(fetch).toHaveBeenCalledWith(`/staff/${id}`, { method: 'DELETE' });
    });

    test('should show confirmation dialog before deleting', () => {
        // Call the function being tested
        deleteStaff(123);

        // Assert that the confirmation dialog is shown
        expect(confirm).toHaveBeenCalled();
    });

    test('should not delete staff member if confirmation is cancelled', async () => {
        global.confirm = jest.fn(() => false);
        await deleteStaff(123, 'staff-123');
        expect(fetch).not.toHaveBeenCalled();
    });

    test('should handle non-200 response during deletion', async () => {
        fetch.mockResolvedValueOnce({ ok: false, status: 400 });
        console.error = jest.fn();
        await deleteStaff(123, 'staff-123');
        expect(console.error).toHaveBeenCalledWith('Error deleting staff member:', 400);
    });

    test('should handle network error during deletion', async () => {
        const id = 123;
        const listItemID = 'staff-123';
        
        // Mock a network error response from the server
        fetch.mockRejectedValueOnce(new Error('Network error'));
        
        // Call the function being tested
        await deleteStaff(id, listItemID);
        
        // Assert that the console.error was called
        expect(console.error).toHaveBeenCalledWith('Error deleting staff member:', expect.any(Error));
    });

    test('should not update DOM if deletion is cancelled', async () => {
        const id = 123;
        const listItemID = 'staff-123';
    
        document.body.innerHTML = `<div id="${listItemID}"></div>`;
        global.confirm = jest.fn(() => false);
    
        await deleteStaff(id, listItemID);
        
        expect(document.getElementById(listItemID)).not.toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });

    afterEach(() => {
        jest.resetAllMocks(); // Reset mock usage data after each test
    });

});

describe('searchStaff', () => {
    // Mock the necessary DOM elements and fetch function
    beforeEach(() => {
        document.body.innerHTML = `
            <input id="searchInput" type="text">
            <ul id="searchResults"></ul>
        `;
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve([
                    { id: 1, name: 'John Doe', email: 'john@example.com' },
                    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
                ])
            })
        );
    });

    test('should display search results when search is successful', async () => {
        // Set up search input
        document.getElementById('searchInput').value = 'john';
        // Call the searchStaff function
        await searchStaff();
        // Check if search results are displayed
        expect(document.querySelectorAll('.search-result')).toHaveLength(2);
        expect(document.querySelector('.search-result').textContent).toContain('John Doe');
        expect(document.querySelector('.search-result').textContent).toContain('john@example.com');
    });

    test('should log error message when search fails', async () => {
        // Mock the response from the server
        const response = { ok: false, status: 500, statusText: 'Internal Server Error' };
        fetch.mockResolvedValue(response);
        console.error = jest.fn(); // Mock console.error
    
        // Call the function
        await searchStaff();
    
        // Check if console.error was called with the correct error message
        expect(console.error).toHaveBeenCalledWith('Error searching for staff members:', expect.any(Error));
        expect(console.error.mock.calls[0][1].message).toBe('Network response was not ok');
    });

    // Test network error handling
    test('should log error message when network response is not ok', async () => {
        global.fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            })
        );
        console.error = jest.fn(); // Mock console.error
        await searchStaff();
        expect(console.error).toHaveBeenCalledWith('Error searching for staff members:', expect.any(Error));
        expect(console.error.mock.calls[0][1].message).toBe('Network response was not ok');
    });

    test('should handle no results found scenario', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([])
        });
        document.getElementById('searchInput').value = 'nonexistent';
        await searchStaff();
        expect(document.querySelectorAll('.search-result')).toHaveLength(0);
    });

    test('should trim search input before making a request', async () => {
        document.getElementById('searchInput').value = '  john  ';
        await searchStaff();
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/search/staff?query=john'));
    });

    test('should handle empty search input', async () => {
        document.getElementById('searchInput').value = ' ';
        
        // Mock fetch to check if it gets called
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve([]),
            })
        );
        
        await searchStaff();
    
        // Check that fetch was called with the expected trimmed value
        expect(fetch).toHaveBeenCalledWith('/search/staff?query=');
        expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/search/staff?query=%20'));
    });

    test('should clear previous search results', async () => {
        document.getElementById('searchInput').value = 'john';
        document.getElementById('searchResults').innerHTML = '<li>Previous Result</li>';
        await searchStaff();
        expect(document.querySelectorAll('.search-result')).toHaveLength(2);
        expect(document.getElementById('searchResults').innerHTML).not.toContain('Previous Result');
    });

    test('should handle fetch exception during search', async () => {
        document.getElementById('searchInput').value = 'john';
        const error = new Error('Fetch error');
        fetch.mockRejectedValueOnce(error);
    
        console.error = jest.fn();
    
        await searchStaff();
    
        expect(console.error).toHaveBeenCalledWith('Error searching for staff members:', error);
    });

    test('should convert search input to lowercase', async () => {
        document.getElementById('searchInput').value = 'JOHN';
        await searchStaff();
        expect(fetch).toHaveBeenCalledWith('/search/staff?query=john');
    });
});

// Mock the fetch function
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ message: 'Staff member added successfully' }),
  })
);

describe('addStaff', () => {
    test('should add a staff member and show success alert', async () => {
        // Mock the response from the server
        const response = { ok: true, json: () => Promise.resolve({ message: 'Success' }) };
        fetch.mockResolvedValue(response);

        // Mock the DOM elements and functions
        const form = { reset: jest.fn() };
        global.alert = jest.fn();

        // Call the function
        await addStaff(form);

        // Check if fetch was called with the correct URL, method, headers, and body
        expect(fetch).toHaveBeenCalledWith('/add-staff', expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.any(String)
        }));

        // Check if the form is reset and success alert is shown
        expect(form.reset).toHaveBeenCalled();
        expect(global.alert).toHaveBeenCalledWith('Staff member added successfully');
    });

    test('should show alert for short password', async () => {
        const form = {
            reset: jest.fn()
        };
        
        // Set DOM elements for the test
        document.body.innerHTML = `
            <input id="name" value="Test User">
            <input id="email" value="test@example.com">
            <input id="password" value="short">
            <input id="confirmPassword" value="short">
        `;
        
        global.alert = jest.fn();
    
        await addStaff(form);
    
        expect(global.alert).toHaveBeenCalledWith('Password too short');
    });

    test('should handle server-side validation error', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ error: 'Email already exists' })
        });
    
        const form = { reset: jest.fn() };
        global.alert = jest.fn();
    
        await addStaff(form);
    
        expect(global.alert).toHaveBeenCalledWith('Email already exists');
    });

    /*test('should show alert if passwords do not match', async () => {
        const form = { reset: jest.fn() };
        document.body.innerHTML = `
            <input id="name" value="Test User">
            <input id="email" value="test@example.com">
            <input id="password" value="password123">
            <input id="confirmPassword" value="password124">
        `;
        
        global.alert = jest.fn();
    
        await addStaff(form);
    
        expect(global.alert).toHaveBeenCalledWith('Passwords do not match');
    });*/
    test('should show alert if passwords do not match', async () => {
        const form = { reset: jest.fn() };
        document.body.innerHTML = `
            <input id="name" value="Test User">
            <input id="email" value="test@example.com">
            <input id="password" value="password123">
            <input id="confirmPassword" value="password124">
        `;
        
        global.alert = jest.fn();
    
        await addStaff(form);
    
        expect(global.alert).toHaveBeenCalledWith('Passwords do not match');
    });

});

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve([
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      ]),
  })
);

describe('displayStaffList', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="staff-list"></div>';
    });
  
    test('should handle empty staff list', async () => {
      // Mock the fetch response with an empty array
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      );
  
      // Call the function being tested
      await displayStaffList();
  
      // Assert that the staff list is empty
      const staffListElement = document.getElementById('staff-list');
      expect(staffListElement.children.length).toBe(0);
    });

    test('should handle non-200 response when displaying staff list', async () => {
        global.fetch.mockResolvedValueOnce({ ok: false, status: 400 });
        console.error = jest.fn();
        await displayStaffList();
        expect(console.error).toHaveBeenCalledWith('Error displaying staff list:', expect.any(Error));
    });

    test('should display specific staff data correctly', async () => {
        const staffData = [
            { id: 1, name: 'John Doe', email: 'john@example.com' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ];
    
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(staffData)
        });
    
        document.body.innerHTML = '<ul id="searchResults"></ul>';
        await displayStaffList();
    
        const listItems = document.querySelectorAll('.search-result');
        expect(listItems).toHaveLength(2);
        expect(listItems[0].textContent).toContain('John Doe');
        expect(listItems[0].textContent).toContain('john@example.com');
        expect(listItems[1].textContent).toContain('Jane Smith');
        expect(listItems[1].textContent).toContain('jane@example.com');
    });

    test('should handle fetch exception when displaying staff list', async () => {
        const error = new Error('Fetch error');
        fetch.mockRejectedValueOnce(error);
    
        console.error = jest.fn();
    
        await displayStaffList();
    
        expect(console.error).toHaveBeenCalledWith('Error displaying staff list:', error);
    });

    test('should display staff members correctly', async () => {
        const staffData = [
            { id: 1, name: 'John Doe', email: 'john@example.com' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ];
    
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(staffData)
        });
    
        document.body.innerHTML = '<ul id="searchResults"></ul>';
        await displayStaffList();
    
        const listItems = document.querySelectorAll('.search-result');
        expect(listItems).toHaveLength(2);
        expect(listItems[0].textContent).toContain('John Doe');
        expect(listItems[0].textContent).toContain('john@example.com');
        expect(listItems[1].textContent).toContain('Jane Smith');
        expect(listItems[1].textContent).toContain('jane@example.com');
    });

    test('should display staff names with special characters correctly', async () => {
        const staffData = [
            { id: 1, name: 'John O\'Reilly', email: 'john@example.com' },
            { id: 2, name: 'Jane & Co', email: 'jane@example.com' }
        ];
    
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(staffData)
        });
    
        document.body.innerHTML = '<ul id="searchResults"></ul>';
        await displayStaffList();
    
        const listItems = document.querySelectorAll('.search-result');
        expect(listItems).toHaveLength(2);
        expect(listItems[0].textContent).toContain('John O\'Reilly');
        expect(listItems[1].textContent).toContain('Jane & Co');
    });
  });
