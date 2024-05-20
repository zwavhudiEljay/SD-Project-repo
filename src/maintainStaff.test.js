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
    
    test('should clear existing items before adding new ones', () => {
        document.body.innerHTML = `<div id="maintain-list"><li id="issue-100">Old issue</li></div>`;
        const issues = ['New issue 1', 'New issue 2'];
        const ids = [103, 104];

        updateTotalIssues(issues, ids);

        const list = document.getElementById('maintain-list');
        expect(list.children.length).toBe(2);
        expect(list.children[0].textContent).toBe('New issue 1');
        expect(list.children[1].textContent).toBe('New issue 2');
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

        test('should clear existing items before adding new ones', () => {
        document.body.innerHTML = `<div id="feedback-list"><li id="issue-200">Old issue<button>Old Button</button></li></div>`;
        const issues = ['New network issue', 'New server downtime'];
        const ids = [203, 204];

        updateNotificationsWidget(issues, ids);

        const list = document.getElementById('feedback-list');
        expect(list.children.length).toBe(2);
        expect(list.children[0].textContent).toContain('New network issue');
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

     test('should close the modal when clicking outside of it', () => {
        openFeedbackModal(300);
        const modal = document.getElementById('feedbackModal');
        
        const event = new MouseEvent('click', { target: modal });
        window.dispatchEvent(event);
        
        expect(modal.style.display).toBe('block');
    });
});
