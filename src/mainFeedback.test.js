const { 
    updateTotalIssues, 
    saveFeedback, 
    openFeedbackModal,
    fetchTotalIssues
} = require('./mainFeedback');
const { test, expect } = require('@jest/globals');

// Mocking the global fetch function
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ issues: ['Issue 1', 'Issue 2'], ids: [1, 2] })
    })
);

describe('fetchTotalIssues', () => {
    test('fetches and updates total issues', async () => {
        document.body.innerHTML = '<ul id="feedback-list"></ul>';
        await fetchTotalIssues();

        const observerCallback = (mutationsList, observer) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    expect(document.getElementById('issue-1').textContent).toBe('Issue 1Write Feedback');
                    expect(document.getElementById('issue-2').textContent).toBe('Issue 2Write Feedback');
                    observer.disconnect(); // Stop observing once the elements are found
                }
            }
        };

        const observer = new MutationObserver(observerCallback);
        observer.observe(document.getElementById('feedback-list'), { childList: true });
    });

});

describe('updateTotalIssues', () => {
    test('should clear previous issues before adding new ones', () => {
        const issues = ['Issue 1', 'Issue 2'];
        const ids = [1, 2];
        const initialIssues = ['Initial Issue'];
        const initialIds = [789];

        updateTotalIssues(initialIssues, initialIds);
        updateTotalIssues(issues, ids);

        const list = document.getElementById('feedback-list');
        expect(list.children.length).toBe(2);
    });

    test('updates the feedback list with issues', () => {
        document.body.innerHTML = '<ul id="feedback-list"></ul>';
        const issues = ['Issue 1', 'Issue 2'];
        const ids = [1, 2];
        updateTotalIssues(issues, ids);
        expect(document.getElementById('issue-1').textContent).toBe('Issue 1Write Feedback');
        expect(document.getElementById('issue-2').textContent).toBe('Issue 2Write Feedback');
    });

});

describe('openFeedbackModal', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="feedbackModal" style="display: none;">
                <textarea id="feedbackTextArea"></textarea>
                <select id="feedbackMonth">
                    <option value="January">January</option>
                    <option value="February">February</option>
                    <option value="March">March</option>
                    <option value="April">April</option>
                    <option value="May">May</option>
                </select>
                <button id="saveFeedbackButton"></button>
            </div>
        `;
        console.log = jest.fn();
    });

    test('opens the feedback modal and sets up save button event listener', () => {
        openFeedbackModal(1);
        const modal = document.getElementById('feedbackModal');
        const saveButton = document.getElementById('saveFeedbackButton');
        const textArea = document.getElementById('feedbackTextArea');
        const dropdown = document.getElementById('feedbackMonth');

        expect(modal.style.display).toBe('block');

        textArea.value = 'Test feedback';
        dropdown.value = 'May';
        saveButton.click();

        expect(console.log).toHaveBeenCalledWith('Feedback:', 'Test feedback');
        expect(console.log).toHaveBeenCalledWith('Month:', 'May');
    });
});

describe('saveFeedback', () => {
    beforeEach(() => {
        global.fetch.mockClear();
        global.fetch.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ message: 'Feedback saved successfully' })
            })
        );
    });

    test('saves feedback and handles success', async () => {
        console.log = jest.fn();
        await saveFeedback(1, 'Test feedback');
        expect(fetch).toHaveBeenCalledWith('/update-feedback/1', expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedback: 'Test feedback' })
        }));
        expect(console.log).toHaveBeenCalledWith('Feedback saved successfully:', 'Feedback saved successfully');
    });

    test('handles save feedback error', async () => {
        global.fetch.mockImplementationOnce(() => Promise.reject(new Error('Failed to save feedback')));
        console.error = jest.fn();
        await expect(saveFeedback(1, 'Test feedback')).rejects.toThrow('Failed to save feedback');
        expect(console.error).toHaveBeenCalledWith('Error saving feedback:', expect.any(Error));
    });
});
