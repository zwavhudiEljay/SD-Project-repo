const { 
    fetchTotalIssues, 
    updateTotalIssues, 
    updateNotificationsWidget, 
    openFeedbackModal 
} = require('./maintainStaff');
const { test, expect } = require('@jest/globals');

global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ issues: ['Issue 1', 'Issue 2'], ids: [1, 2] })
    })
);

describe('fetchTotalIssues', () => {
    test('fetches and updates total issues', async () => {
        document.body.innerHTML = '<ul id="maintain-list"></ul>';
        await fetchTotalIssues();

        const observerCallback = (mutationsList, observer) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    expect(document.getElementById('issue-1').textContent).toBe('Issue 1');
                    expect(document.getElementById('issue-2').textContent).toBe('Issue 2');
                    observer.disconnect(); // Stop observing once the elements are found
                }
            }
        };

        const observer = new MutationObserver(observerCallback);
        observer.observe(document.getElementById('maintain-list'), { childList: true });
    });
});


describe('updateTotalIssues', () => {
    test('should create list items for each issue', () => {
        document.body.innerHTML = `<div id="maintain-list"></div>`;
        const issues = ['Leaky faucet', 'Broken window'];
        const ids = [101, 102];

        updateTotalIssues(issues, ids);

        const list = document.getElementById('maintain-list');
        expect(list.children.length).toBe(2);
        expect(list.children[0].textContent).toBe('Leaky faucet');
        expect(list.children[1].id).toBe('issue-102');
    });
});


describe('updateNotificationsWidget', () => {
    test('should append issues to feedback list with feedback buttons', () => {
        document.body.innerHTML = `<div id="feedback-list"></div>`;
        const issues = ['Network issue', 'Server downtime'];
        const ids = [201, 202];

        updateNotificationsWidget(issues, ids);

        const list = document.getElementById('feedback-list');
        expect(list.children.length).toBe(2);
        expect(list.children[0].textContent).toContain('Network issue');
        expect(list.children[0].querySelector('button').textContent).toBe('Write Feedback');
    });
});


describe('openFeedbackModal', () => {
    test('should display the modal and set up the correct handlers', () => {
        document.body.innerHTML = `<div id="feedbackModal" style="display: none;"></div>
                                   <textarea id="feedbackTextArea"></textarea>
                                   <button id="saveFeedbackButton"></button>`;
        const modal = document.getElementById('feedbackModal');

        openFeedbackModal(300);
        expect(modal.style.display).toBe('block');
    });
});
