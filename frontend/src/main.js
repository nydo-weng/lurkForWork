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
    modalLabel.style.color = 'red';
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

    // need to comment back
    // const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    // const nameRegex = /^[A-Za-z' -]+$/;
    
    // if (!emailRegex.test(email)) {
    //     showErrorPopup('Error', "Please enter a valid email address.")
    // } else if (!nameRegex.test(name)) {
    //     showErrorPopup('Error', 'Please enter a valid name.');
    // } else if (password.length < 6) {
    //     showErrorPopup('Error', 'The password must be at least 6 characters.');
    // } else if (password !== passwordConfirm) {
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

    // need to comment back
    // const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

    // if (!emailRegex.test(email)) {
    //     showErrorPopup('Error', "Please enter a valid email address.")
    // } else if (password.length < 6) {
    //     showErrorPopup('Error', 'The password must be at least 6 characters.');
    // } else {
    if (true) {
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
    }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    const feedContainer = document.getElementById('feed-container');
    const cards = feedContainer.querySelectorAll('.card');

    cards.forEach(card => {
        feedContainer.removeChild(card);
    });

    localStorage.removeItem('lurkforwork_token');
    showPage('login')
});

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

const createCard = (job) => {
    const cardContainer = document.getElementById('feed-container');

    const card = document.createElement('div');
    card.classList.add('card', 'mb-3');
    card.style.width = '100%';

    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body');

    // Name of the author who made the job post
    const cardAuthor = document.createElement('p');
    cardAuthor.classList.add('card-text', 'text-muted');
    cardAuthor.textContent = `author: ${job.creatorId}`;

    // When it was posted
    const cardTime = document.createElement('p');
    cardTime.classList.add('card-text', 'text-muted');
    cardTime.textContent = `Posted time: ${job.createdAt}`;

    // An image to describe the job (jpg in base64 format) - can be any aspect ratio
    const img = document.createElement('img');
    img.src = job.image;
    img.classList.add('card-img-top');
    img.alt = "Job Image";
    img.style.width = "100px";
    img.style.objectFit = "cover";
    img.style.margin = "10px"

    // A title for the new job
    const cardTitle = document.createElement('h3');
    cardTitle.classList.add('card-title');
    cardTitle.textContent = job.title;

    // A starting date for the job (in the format DD/MM/YYYY) - it can't be earlier than today
    const cardStartDate = document.createElement('p');
    cardTime.classList.add('card-text', 'text-muted');
    cardTime.textContent = `Starting date: ${job.start}`;

    // How many likes it has (or none)
    const cardLikes = document.createElement('p');
    cardLikes.classList.add('card-text');
    cardLikes.textContent = `👍 ${job.likes.length || 'none'} likes`;

    // The job description text
    const cardDescriptionBody = document.createElement('div');

    const cardDescriptionHeader = document.createElement('h4');
    cardDescriptionHeader.classList.add('card-text');
    cardDescriptionHeader.textContent = 'Job description:'

    const cardDescription = document.createElement('p');
    cardDescription.classList.add('card-text');
    cardDescription.textContent = '"' + job.description + '"';

    cardDescriptionBody.appendChild(cardDescriptionHeader)
    cardDescriptionBody.appendChild(cardDescription)

    cardDescriptionBody.style.backgroundColor = "#F8F8FF"
    cardDescriptionBody.style.borderRadius = "15px"
    cardDescriptionBody.style.marginBottom = "10px"
    cardDescriptionBody.style.padding = "10px"

    // How many comments the job post has
    const cardComments = document.createElement('p');
    cardComments.classList.add('card-text');
    cardComments.textContent = `💬 ${job.comments.length || 'no'} comments`;

    cardBody.appendChild(cardTitle);
    cardBody.appendChild(cardAuthor);
    cardBody.appendChild(cardTime);
    cardBody.appendChild(cardStartDate);
    cardBody.appendChild(cardDescriptionBody);
    cardBody.appendChild(cardLikes);
    cardBody.appendChild(cardComments);
    card.appendChild(img);
    card.appendChild(cardBody);

    cardContainer.appendChild(card);
};

const loadFeed = () => {
    apiCall(
        'job/feed?start=0',
        'GET',
        {}
    ).then((data) => {
        let jobDescription = '';
        for (const job of data) {
            jobDescription += job.description
            jobDescription += ' || '
            console.log(job)
            // createCard(job.title, job.description)
            createCard(job)
        }        
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
    showPage('login')
}