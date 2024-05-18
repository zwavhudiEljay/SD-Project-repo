const { 
    fetchTotalIssues, 
    updateTotalIssues, 
    updateNotificationsWidget, 
    openFeedbackModal 
} = require('./maintainStaff');
const { test, expect } = require('@jest/globals');

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
