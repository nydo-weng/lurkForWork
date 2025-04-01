import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl } from './helpers.js';

console.log('Let\'s go!');

// Function to show error popup with a custom message
function showErrorPopup(errorLabel, errorMessage) {
    // Get the modal and the element where the error message will be displayed
    // 获取模态框元素
    const modal = new bootstrap.Modal(document.getElementById('errorPopup'));

    const modalLabel = document.getElementById('errorPopupLabel');
    // 获取模态框里的 message 元素
    const modalMessage = document.getElementById('errorPopupMessage');

    modalLabel.textContent = errorLabel;
    // Set the message inside the modal
    // 设置错误信息
    modalMessage.textContent = errorMessage;

    // Show the modal
    modal.show();
}

let token = localStorage.getItem('lurkforwork_token')

function apiCall(path, method, data) {
    return new Promise((resolve, reject) => {
        fetch(`http://localhost:5005/${path}`, {
            method: method,
            body: method === 'GET' ? undefined : JSON.stringify(data),
            headers: {
                'Content-type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : undefined,
            }
        }).then((response) => {
            response.json().then((data) => { 
                if (response.status === 200) {
                    resolve(data)
                } else {
                    // if reach here, catch will not be run.
                    reject(new Error(data.error || 'Responsed some errors'))
                }
            });
        }).catch((error) => {
            reject(new Error('Network error: ' + error.message))
        })
    })
}

document.getElementById('btn-register').addEventListener('click', () => {
    const email = document.getElementById('register-email').value
    const name = document.getElementById('register-name').value
    const password = document.getElementById('register-password').value
    const passwordConfirm = document.getElementById('register-password-confirm').value

    if (password !== passwordConfirm) {
        showErrorPopup('Error', "The two passwords don't match, please check!")
    } else {
        apiCall(
            'auth/register',
            'POST',
            {
                email: email,
                name: name,
                password: password,
            }
        ).then((data) => {
            localStorage.setItem('lurkforwork_token', data.token)
            token = localStorage.getItem('lurkforwork_token')
            showPage('feed')
        }).catch((error) => {
            showErrorPopup('Error', error.message)
        });
    }
});

document.getElementById('btn-login').addEventListener('click', () => {
    const email = document.getElementById('login-email').value
    const password = document.getElementById('login-password').value
    apiCall(
        'auth/login',
        'POST',
        {
            email: email,
            password: password,
        },
    ).then((data) => {
        localStorage.setItem('lurkforwork_token', data.token)
        token = localStorage.getItem('lurkforwork_token')
        showPage('feed')
    }).catch((error) => {
        showErrorPopup('Error', error.message)
    });
});

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('lurkforwork_token');
    showPage('register')
})

const showPage = (pageName) => {
    const pages = document.querySelectorAll('.page')
    for (const page of pages) {
        page.classList.add('hide')
    }
    document.getElementById(`page-${pageName}`).classList.remove('hide')
    if (pageName === 'feed') {
        loadFeed()
    }
}

const loadFeed = () => {
    // 在这里 load feed
    // document.getElementById('feed-content').innerText = 'things'
    apiCall(
        'job/feed?start=0',
        'GET',
        {}
    ).then((data) => {
        let jobDescription = '';
        for (const job of data) {
            jobDescription += job.description
            jobDescription += ' || '
        }
        document.getElementById('feed-content').innerText = jobDescription
        console.log(data)
    }).catch((error) => {
        showErrorPopup('Error', error.message)
    });
}

// Do it when the page loads
for (const atag of document.querySelectorAll('a')) {
    if (atag.hasAttribute('internal-link')) {
        atag.addEventListener('click', () => {
            const pageName = atag.getAttribute('internal-link')
            showPage(pageName)
        })
    }
}


if (token) {
    showPage('feed')
} else {
    showPage('register')
}