const submitForm = require('./addNewTenant');
const { test, expect } = require('@jest/globals');

describe('submitForm', () => {
    let fetchMock;
    let alertMock;

    beforeEach(() => {
        document.body.innerHTML = `
            <form>
                <input type="text" id="name" value="John Doe">
                <input type="email" id="email" value="john.doe@example.com">
                <input type="password" id="password" value="password123">
                <input type="password" id="confirmPassword" value="password123">
                <button id="addNewTenant">Submit</button>
            </form>
        `;

        fetchMock = jest.fn().mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ message: 'User created successfully' }),
            })
        );
        global.fetch = fetchMock;

        alertMock = jest.fn();
        global.alert = alertMock;

        Object.defineProperty(window, 'location', {
            value: {
                href: '',
                assign: jest.fn().mockImplementation((url) => {
                    window.location.href = url;
                }),
            },
            writable: true,
        }); 
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should alert if passwords do not match', async () => {
        document.getElementById('password').value = 'password123';
        document.getElementById('confirmPassword').value = 'password321';

        submitForm();

        expect(alertMock).toHaveBeenCalledWith('Passwords do not match');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('should alert if password is too short', async () => {
        document.getElementById('password').value = 'short';
        document.getElementById('confirmPassword').value = 'short';

        submitForm();

        expect(alertMock).toHaveBeenCalledWith('password too short');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('should fetch with form data if validation passes', async () => {
        document.getElementById('password').value = 'password123';
        document.getElementById('confirmPassword').value = 'password123';

        await submitForm();

        expect(fetchMock).toHaveBeenCalledWith('/submitTenant', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'John Doe',
                email: 'john.doe@example.com',
                password: 'password123',
                confirmPassword: 'password123',
            }),
        });
    });

    test('should re-enable submit button after failed submission', async () => {
        fetchMock.mockImplementationOnce(() =>
            Promise.resolve({
                ok: false,
                json: () => Promise.resolve({ message: 'Error occurred' }),
            })
        );

        await submitForm();

        expect(document.getElementById('addNewTenant').disabled).toBe(false);
    });

    test('should re-enable submit button after network error', async () => {
        fetchMock.mockImplementationOnce(() => Promise.reject(new Error('Network error')));

        await submitForm();

        expect(document.getElementById('addNewTenant').disabled).toBe(false);
    });
});


