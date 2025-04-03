import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl } from './helpers.js';

console.log('Let\'s go!');

// Function to show error popup with a custom message
function showErrorPopup(errorLabel, errorMessage, color = 'red') {
    const modalElement = document.getElementById('errorPopup');

    const modal = new bootstrap.Modal(modalElement, {
        backdrop: true,
        keyboard: true
    });

    const modalLabel = document.getElementById('errorPopupLabel')

    const modalMessage = document.getElementById('errorPopupMessage')

    modalLabel.textContent = errorLabel
    modalLabel.style.color = color
    // Set the message inside the modal
    modalMessage.textContent = errorMessage
    // Show the modal
    modal.show()
}

let token = localStorage.getItem('lurkforwork_token')
let currentUserId = localStorage.getItem('lurkforwork_userId')

let currentPage = 'feed'
let currentProfileId = 11111

// use for load feed, 2.3.4
let isLoading = false   // to control the flow, if is loading next 5 jobs, do nothing just return
let hasMoreJobs = true  // if there is no more jobs on server, do nothing just return

let debouncedScrollHandler  // used for infinite scroll

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
        });
    });
}

document.getElementById('btn-register').addEventListener('click', () => {
    const email = document.getElementById('register-email').value
    const name = document.getElementById('register-name').value
    const password = document.getElementById('register-password').value
    const passwordConfirm = document.getElementById('register-password-confirm').value

    // need to comment back
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    const nameRegex = /^[A-Za-z' -]+$/

    if (!emailRegex.test(email)) {
        showErrorPopup('Error', "Please enter a valid email address.")
    } else if (!nameRegex.test(name)) {
        showErrorPopup('Error', 'Please enter a valid name.')
    } else if (password.length < 6) {
        showErrorPopup('Error', 'The password must be at least 6 characters.')
    } else if (password !== passwordConfirm) {
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
            localStorage.setItem('lurkforwork_userId', data.userId)
            token = localStorage.getItem('lurkforwork_token')
            currentUserId = localStorage.getItem('lurkforwork_userId')
            currentPage = showPage('feed')
        }).catch((error) => {
            showErrorPopup('Error', error.message)
        });
    }
});

document.getElementById('btn-login').addEventListener('click', () => {
    const email = document.getElementById('login-email').value
    const password = document.getElementById('login-password').value

    // need to comment back
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

    if (!emailRegex.test(email)) {
        showErrorPopup('Error', "Please enter a valid email address.")
    } else if (password.length < 6) {
        showErrorPopup('Error', 'The password must be at least 6 characters.')
    } else {
        apiCall(
            'auth/login',
            'POST',
            {
                email: email,
                password: password,
            }
        ).then((data) => {
            localStorage.setItem('lurkforwork_token', data.token)
            localStorage.setItem('lurkforwork_userId', data.userId)
            token = localStorage.getItem('lurkforwork_token')
            currentUserId = localStorage.getItem('lurkforwork_userId')
            currentPage = showPage('feed')
        }).catch((error) => {
            showErrorPopup('Error', error.message)
        });
    }
});

// clear feed-container while leaveing feed page/home page
const clearFeed = () => {
    const feedContainer = document.getElementById('feed-container')
    const cards = feedContainer.querySelectorAll('.card')

    cards.forEach(card => {
        feedContainer.removeChild(card)
    });
}

// adding click event listener to buttons
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-logout')) {
        clearFeed()
        localStorage.removeItem('lurkforwork_token');
        localStorage.removeItem('lurkforwork_userId');
        currentPage = showPage('login');
    }

    // clciking "Profile" btn, go to my profile
    if (e.target.id === 'btn-my-profile') {
        clearFeed()
        currentPage = showPage('my-profile')
        // load my profile, so use 'my-profile-container' and current id
        const profileContainer = document.getElementById('my-profile-container');
        currentProfileId = loadProfile(profileContainer, currentUserId)
    }

    if (e.target.classList.contains('btn-back-home')) {
        clearFeed()
        currentPage = showPage('feed')
    }

    if (e.target.classList.contains('btn-search-user')) {
        showSearchUserModal()
    }

    if (e.target.classList.contains('btn-add-job')) {
        showAddJobModal()
    }
});

// pop up a modal for add job usage
const showAddJobModal = () => {
    const modal = new bootstrap.Modal(document.getElementById('addJobModal'))
    modal.show();

    const addJobButton = document.getElementById('btn-add-job')
    const newAddJobButtonButton = addJobButton.cloneNode(true);
    // use the clone replace with the original one, which will remove all eventListener
    addJobButton.replaceWith(newAddJobButtonButton);

    newAddJobButtonButton.addEventListener('click', () => {
        addJob()
    });
}

const addJob = () => {
    const title = document.getElementById('add-job-title').value

    const dateInput = document.getElementById('add-job-date').value
    if (!dateInput) {
        showErrorPopup('Error', 'Please enter all relevant fields')
        return
    }

    const dateObj = new Date(dateInput)
    // convert to the format server required
    const date = dateObj.toISOString();
    const description = document.getElementById('add-job-description').value
    const imageFile = document.getElementById('add-job-image').files[0]

    const requestBody = {
        title: title,
        start: date,
        description: description
    }

    if (!imageFile) {
        sendAddJobRequest(requestBody)
    } else {
        fileToDataUrl(imageFile).then((dataUrl) => {
            requestBody.image = dataUrl
            sendAddJobRequest(requestBody)
        }).catch((error) => {
            console.log(error)
            showErrorPopup('Error', error.message)
        });
    }
}

const sendAddJobRequest = (requestBody) => {
    apiCall(
        'job',
        'POST',
        requestBody
    ).then(() => {
        // reach here if backend ok with this profile update
        showErrorPopup('Job Added', "Job added successfully", 'blue')

        // empty the form
        document.getElementById('add-job-title').value = ''
        document.getElementById('add-job-date').value = ''
        document.getElementById('add-job-description').value = ''
        document.getElementById('add-job-image').value = ''

        // close the addJobModal after added
        const modal = bootstrap.Modal.getInstance(
            document.getElementById('addJobModal')
        )
        modal.hide()
        // reload page
        reloadPage()
    }).catch((error) => {
        // remain modal open if faild
        showErrorPopup('Error', error.message)
    });
}

// pop up a modal for search user usage
const showSearchUserModal = () => {
    const modal = new bootstrap.Modal(document.getElementById('searchUserModal'))
    modal.show();

    const watchSearchedUserButton = document.getElementById('btn-watch-searched-user')
    const newWatchSearchedUserButton = watchSearchedUserButton.cloneNode(true);
    // use the clone replace with the original one, which will remove all eventListener
    watchSearchedUserButton.replaceWith(newWatchSearchedUserButton);

    newWatchSearchedUserButton.addEventListener('click', () => {
        watchSearchedUser();
    });
}

const watchSearchedUser = () => {
    const email = document.getElementById('search-user-email').value

    apiCall(
        'user/watch',
        'PUT',
        {
            email: email,
            turnon: true
        }
    ).then(() => {
        // reach here if backend ok with this watch
        showErrorPopup('Watching', `You are watching ${email} now!`, 'blue')
        // reload page, up to which current page is
        reloadPage()
        // close the modal
        const modal = bootstrap.Modal.getInstance(
            document.getElementById('searchUserModal')
        )
        modal.hide()
    }).catch((error) => {
        console.log(error)
        const modal = bootstrap.Modal.getInstance(
            document.getElementById('searchUserModal')
        )
        modal.hide()
        showErrorPopup('Error', error.message)
    });

}

const showPage = (pageName) => {
    if (!debouncedScrollHandler) {
        debouncedScrollHandler = debounce(checkScroll, 200)
    }

    // remove jobs from profile while page change
    const jobContainers = document.getElementsByClassName('profile-job-container')

    for (const jobContainer of jobContainers) {
        const cards = jobContainer.querySelectorAll('.card')

        cards.forEach(card => {
            jobContainer.removeChild(card)
        });
    }

    const pages = document.querySelectorAll('.page')
    for (const page of pages) {
        page.classList.add('hide')
    }
    document.getElementById(`page-${pageName}`).classList.remove('hide')

    if (pageName === 'feed') {
        // reset about load, since it could be back from logout than login
        hasMoreJobs = true
        const noMoreElement = document.getElementById('feed-no-more');
        noMoreElement.style.display = 'none';
        loadFeed(0)

        window.removeEventListener('scroll', debouncedScrollHandler);
        window.addEventListener('scroll', debouncedScrollHandler);
    } else {
        window.removeEventListener('scroll', debouncedScrollHandler);
    }
    return pageName
}

// for given job info, create a job card element, add to feed-container
const createCard = (job, container) => {
    const cardContainer = container

    const card = document.createElement('div')
    card.classList.add('card', 'mb-3', 'count-job-card')
    card.style.width = '100%'

    const cardBody = document.createElement('div')
    cardBody.style.border = "1px solid #E7E7E7";
    cardBody.style.borderRadius = "5px";
    cardBody.style.margin = "5px"
    cardBody.classList.add('card-body')

    // An image to describe the job (jpg in base64 format) - can be any aspect ratio
    const img = document.createElement('img')
    img.src = job.image
    img.classList.add('card-img-top')
    img.alt = "Job Image"
    img.style.width = "100px"
    img.style.objectFit = "cover"
    img.style.margin = "10px"
    card.appendChild(img)

    // A title for the new job
    const cardTitle = document.createElement('h1')
    cardTitle.classList.add('card-title')
    cardTitle.textContent = job.title
    cardBody.appendChild(cardTitle)

    apiCall(
        `user?userId=${job.creatorId}`,
        'GET',
        {},
    ).then((data) => {
        // Name of the author who made the job post
        const cardAuthor = document.createElement('p')
        cardAuthor.classList.add('card-text', 'text-muted')
        cardAuthor.textContent = `Author: ${data.name}`
        cardBody.appendChild(cardAuthor)

        const cardAuthorId = job.creatorId
        // add listener to cardAuthor
        cardAuthor.addEventListener('click', () => {
            // if go to the user profile with same id with currentuserid, go my profile
            if (parseInt(cardAuthorId) === parseInt(currentUserId)) {
                // show my profile
                currentPage = showPage('my-profile')
                // load my profile, so use 'others-profile-container' and currentUserId
                const profileContainer = document.getElementById('my-profile-container');
                currentProfileId = loadProfile(profileContainer, currentUserId)
            } else {
                // show others profile
                currentPage = showPage('others-profile')
                // load others profile, so use 'others-profile-container' and cardAuthorId
                const profileContainer = document.getElementById('others-profile-container');
                currentProfileId = loadProfile(profileContainer, cardAuthorId)
            }
        });

        // add curosor interacting style
        cardAuthor.style.cursor = 'pointer'
        cardAuthor.style.display = 'inline-block'
        // smooth the annimation
        cardAuthor.style.transition = 'transform 0.3s ease'

        // curosor on, bigger, change color
        cardAuthor.addEventListener('mouseenter', () => {
            cardAuthor.style.transform = 'scale(1.15)'
            cardAuthor.style.color = '#004182'
            cardAuthor.style.fontWeight = 'bold'
        });

        // cursor leave, back to normal, default color
        cardAuthor.addEventListener('mouseleave', () => {
            cardAuthor.style.transform = 'scale(1)'
            cardAuthor.style.color = ''
            cardAuthor.style.fontWeight = ''
        });

        // When it was posted
        const cardTime = document.createElement('p')
        cardTime.classList.add('card-text', 'text-muted')

        const postDate = new Date(job.createdAt)
        const now = new Date()
        const diffMs = now - postDate
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        if (diffHours < 24) {
            cardTime.textContent = `Posted ${diffHours} hours ${diffMinutes} minutes ago`
        } else {
            cardTime.textContent = `Posted at ${postDate.toLocaleDateString('en-AU')}`
        }
        cardBody.appendChild(cardTime)

        // The job description text
        const cardDescriptionBody = document.createElement('div')

        const cardDescriptionHeader = document.createElement('h5')
        cardDescriptionHeader.classList.add('card-text')
        cardDescriptionHeader.textContent = 'Job description:'

        const cardDescription = document.createElement('p')
        cardDescription.classList.add('card-text')
        cardDescription.textContent = '"' + job.description + '"'
        cardDescription.style.fontStyle = "italic"

        cardDescriptionBody.appendChild(cardDescriptionHeader)
        cardDescriptionBody.appendChild(cardDescription)

        cardDescriptionBody.style.backgroundColor = "#F8F8FF"
        cardDescriptionBody.style.borderRadius = "15px"
        cardDescriptionBody.style.marginBottom = "10px"
        cardDescriptionBody.style.padding = "10px"

        cardBody.appendChild(cardDescriptionBody)

        // A starting date for the job (in the format DD/MM/YYYY) - it can't be earlier than today
        const cardStartDate = document.createElement('p')
        cardStartDate.classList.add('card-text', 'text-muted')

        const jobStartDate = new Date(job.start)
        const jobStartTimeDiff = now - jobStartDate

        const minutesAgo = Math.floor(jobStartTimeDiff / (1000 * 60))
        const hoursAgo = Math.floor(minutesAgo / 60)
        const daysAgo = Math.floor(hoursAgo / 24)

        if (jobStartDate < now) {
            if (daysAgo > 0) {
                cardStartDate.textContent = `Started ${daysAgo} days ago`
            } else if (hoursAgo > 0) {
                cardStartDate.textContent = `Started ${hoursAgo} hours ago`
            } else {
                cardStartDate.textContent = `Started ${minutesAgo} minutes ago`
            }
            cardBody.appendChild(cardStartDate)
            cardStartDate.classList.remove('text-muted')
            cardStartDate.style.color = "red"
        } else {
            cardStartDate.textContent = `Starting date: ${jobStartDate.toLocaleDateString('en-AU')}`
            cardBody.appendChild(cardStartDate)
        }

        // How many likes it has (or none)
        const cardLikesButton = document.createElement('button')
        cardLikesButton.classList.add('btn', 'btn-link', 'p-0')
        cardLikesButton.textContent = `💖 ${job.likes.length || 'none'} likes`
        cardLikesButton.addEventListener('click', () => {
            checkLikesList(job)
        });
        cardBody.appendChild(cardLikesButton)

        // 2.3.3 like a job
        const likeJobButton = document.createElement('button')
        likeJobButton.classList.add('btn', 'btn-link', 'p-0')

        const likedJobAlready = () => {     // check if current user already liked the job
            for (const like of job.likes) {
                if (parseInt(like.userId) === parseInt(currentUserId)) {
                    return true
                }
            }
            return false
        }

        const handleUnlikeClick = () => unlikeJob(job.id, likeJobButton);
        const handleLikeClick = () => likeJob(job.id, likeJobButton);

        if (likedJobAlready()) {
            likeJobButton.textContent = `Unlike the job 💔`
            likeJobButton.addEventListener('click', handleUnlikeClick)
        } else {
            likeJobButton.textContent = `Like the job ❤️ `
            likeJobButton.addEventListener('click', handleLikeClick)
        }
        likeJobButton.style.marginLeft = "56px"
        cardBody.appendChild(likeJobButton)

        const breakLine = document.createElement('br')
        cardBody.appendChild(breakLine)

        // How many comments the job post has
        const cardCommentsButton = document.createElement('button')
        cardCommentsButton.classList.add('btn', 'btn-link', 'p-0')
        cardCommentsButton.textContent = `💬 ${job.comments.length || 'no'} comments`
        cardCommentsButton.addEventListener('click', () => {
            checkCommentsList(job)
        });
        cardBody.appendChild(cardCommentsButton)

        // 2.5.3 leaving comments
        const leaveCommentButton = document.createElement('button')
        leaveCommentButton.classList.add('btn', 'btn-link', 'p-0')
        leaveCommentButton.textContent = `Leave your comments 🖋`
        leaveCommentButton.style.marginLeft = "30px"
        cardBody.appendChild(leaveCommentButton)

        leaveCommentButton.addEventListener('click', () => {
            showLeaveCommentModal(job)
        })

        // delete & updating 
        // job belong current user, show update and delet button
        if (parseInt(job.creatorId) === parseInt(currentUserId)) {
            const breakLine2 = document.createElement('br')
            cardBody.appendChild(breakLine2)

            const updateJobButton = document.createElement('button')
            updateJobButton.classList.add('btn', 'btn-primary')
            updateJobButton.id = `btn-update-job-${job.id}`
            updateJobButton.textContent = `Update Job`
            cardBody.appendChild(updateJobButton)
            updateJobButton.style.marginTop = "20px"

            const deleteJobButton = document.createElement('button')
            // make the button red
            deleteJobButton.classList.add('btn', 'btn-danger')
            deleteJobButton.id = `btn-delete-job-${job.id}`
            deleteJobButton.textContent = `Delete Job`
            cardBody.appendChild(deleteJobButton)
            deleteJobButton.style.marginTop = "20px"
            deleteJobButton.style.marginLeft = "80px"

            updateJobButton.addEventListener('click', () => {
                showUpdateJobModal(job)
            });

            deleteJobButton.addEventListener('click', () => {
                deleteJob(job)
            });
        }
        card.appendChild(cardBody)
        cardContainer.appendChild(card)
    }).catch((error) => {
        showErrorPopup('Error', error.message)
    });
}

// show leave comment modal
const showLeaveCommentModal = (job) => {
    const modal = new bootstrap.Modal(document.getElementById('leaveCommentsModal'))
    modal.show();

    const confirmCommentButton = document.getElementById('btn-comment')
    const newConfirmCommentButton = confirmCommentButton.cloneNode(true);
    // use the clone replace with the original one, which will remove all eventListener
    confirmCommentButton.replaceWith(newConfirmCommentButton);

    newConfirmCommentButton.addEventListener('click', () => {
        leaveComments(job);
    });
}

const leaveComments = (job) => {
    const text = document.getElementById('comments-text').value

    const requestBody = {
        id: job.id,
        comment: text
    }
    sendLeaveCommentsRequest(requestBody)
}

const sendLeaveCommentsRequest = (requestBody) => {
    apiCall(
        'job/comment',
        'POST',
        requestBody
    ).then(() => {
        // reach here if backend ok with this job update
        showErrorPopup('Comments leaved', "Thanks for your comments!", 'blue')

        // empty the form
        document.getElementById('comments-text').value = ''

        // close the leaveCommentsModal after comment
        const modal = bootstrap.Modal.getInstance(
            document.getElementById('leaveCommentsModal')
        )
        modal.hide()
        // reload page
        reloadPage()
    }).catch((error) => {
        // remain modal open if faild
        showErrorPopup('Error', error.message)
    });
}

// delete the given job
const deleteJob = (job) => {
    apiCall(
        'job',
        'DELETE',
        {
            id: job.id
        }
    ).then((data) => {
        showErrorPopup('Job Deleted', "Job deleted successfully", 'blue')
        // reload page
        reloadPage()
    }).catch((error) => {
        showErrorPopup('Error', error.message)
    });
}

// show updatejob modal
const showUpdateJobModal = (job) => {
    const modal = new bootstrap.Modal(document.getElementById('updateJobModal'))
    modal.show();

    const confirmUpdateJobButton = document.getElementById('btn-update-job')
    const newConfirmUpdateJobButton = confirmUpdateJobButton.cloneNode(true);
    // use the clone replace with the original one, which will remove all eventListener
    confirmUpdateJobButton.replaceWith(newConfirmUpdateJobButton);

    newConfirmUpdateJobButton.addEventListener('click', () => {
        updateJob(job);
    });
}

const updateJob = (job) => {
    const title = document.getElementById('update-job-title').value

    const dateInput = document.getElementById('update-job-date').value
    let date
    if (!date) {
        date = undefined
    } else {
        const dateObj = new Date(dateInput)
        date = dateObj.toISOString();
    }

    const description = document.getElementById('update-job-description').value
    const imageFile = document.getElementById('update-job-image').files[0]

    const requestBody = {
        id: job.id,
        title: title || undefined,
        start: date || undefined,
        description: description || undefined
    }

    if (!imageFile) {
        sendUpdateJobRequest(requestBody)
    } else {
        fileToDataUrl(imageFile).then((dataUrl) => {
            requestBody.image = dataUrl
            sendUpdateJobRequest(requestBody)
        }).catch((error) => {
            console.log(error)
            showErrorPopup('Error', error.message)
        });
    }
}

const sendUpdateJobRequest = (requestBody) => {
    apiCall(
        'job',
        'PUT',
        requestBody
    ).then(() => {
        // reach here if backend ok with this job update
        showErrorPopup('Job Updated', "Job updated successfully", 'blue')

        // empty the form
        document.getElementById('update-job-title').value = ''
        document.getElementById('update-job-date').value = ''
        document.getElementById('update-job-description').value = ''
        document.getElementById('update-job-image').value = ''

        // close the updateJobModal after updated
        const modal = bootstrap.Modal.getInstance(
            document.getElementById('updateJobModal')
        )
        modal.hide()
        // reload page
        reloadPage()
    }).catch((error) => {
        // remain modal open if faild
        showErrorPopup('Error', error.message)
    });
}


const reloadPage = () => {
    clearFeed()
    if (currentPage === 'feed') {   // reload feed
        clearFeed()
        currentPage = showPage('feed')
    } else if (currentPage === 'my-profile') {  // reload my-profile
        // show my profile
        currentPage = showPage('my-profile')
        // load my profile, so use 'others-profile-container' and currentUserId
        const profileContainer = document.getElementById('my-profile-container');
        currentProfileId = loadProfile(profileContainer, currentUserId)
    } else if (currentPage === 'others-profile') {  // reload others-profile
        // show others profile
        currentPage = showPage('others-profile')
        // load others profile, so use 'others-profile-container' and 
        const profileContainer = document.getElementById('others-profile-container');
        currentProfileId = loadProfile(profileContainer, currentProfileId)
    }
}

const unlikeJob = (jobId, likeJobButton) => {
    apiCall(
        'job/like',
        'PUT',
        {
            id: jobId,
            turnon: false,
        }
    ).then((data) => {
        // deep clone the element
        const newlikeJobButton = likeJobButton.cloneNode(true);
        // use the clone replace with the original one, which will remove all eventListener
        likeJobButton.replaceWith(newlikeJobButton);

        const handleLikeClick = () => likeJob(jobId, newlikeJobButton);
        newlikeJobButton.textContent = `Like the job ❤️ `
        newlikeJobButton.addEventListener('click', handleLikeClick)
        reloadPage()
    }).catch((error) => {
        showErrorPopup('Error', error.message)
    });
}

const likeJob = (jobId, likeJobButton) => {
    apiCall(
        'job/like',
        'PUT',
        {
            id: jobId,
            turnon: true,
        }
    ).then((data) => {
        // deep clone the element
        const newlikeJobButton = likeJobButton.cloneNode(true);
        // use the clone replace with the original one, which will remove all eventListener
        likeJobButton.replaceWith(newlikeJobButton);

        const handleUnlikeClick = () => unlikeJob(jobId, newlikeJobButton);
        newlikeJobButton.textContent = `Unlike the job 💔`
        newlikeJobButton.addEventListener('click', handleUnlikeClick)
        reloadPage()
    }).catch((error) => {
        showErrorPopup('Error', error.message)
    });
}

const checkLikesList = (job) => {
    const modalContent = document.getElementById('jobLikesContent')
    // remove content of modal
    while (modalContent.firstChild) {
        modalContent.removeChild(modalContent.firstChild)
    }

    // adding like for current job
    for (const like of job.likes) {
        const likedUserName = like.userName
        // used to go user profile
        const likedUserId = like.userId

        const likeBlock = document.createElement('div')
        likeBlock.classList.add('job-modal-block')

        const userNameElement = document.createElement('p')
        userNameElement.classList.add('job-modal-text')

        const userNameSpan = document.createElement('span');
        userNameSpan.textContent = likedUserName;
        userNameSpan.classList.add('username-modal-style');
        const likedText = document.createTextNode(' liked this job ❤️');

        // add listener to userNameSpan
        userNameSpan.addEventListener('click', () => {
            // close jobLikesModal
            const modal = bootstrap.Modal.getInstance(document.getElementById('jobLikesModal'));
            modal.hide();

            // if go to the user profile with same id with currentuserid, go my profile
            if (parseInt(likedUserId) === parseInt(currentUserId)) {
                // show my profile
                currentPage = showPage('my-profile')
                // load my profile, so use 'others-profile-container' and currentUserId
                const profileContainer = document.getElementById('my-profile-container');
                currentProfileId = loadProfile(profileContainer, currentUserId)
            } else {
                // show others profile
                currentPage = showPage('others-profile')
                // load others profile, so use 'others-profile-container' and likedUserId
                const profileContainer = document.getElementById('others-profile-container');
                currentProfileId = loadProfile(profileContainer, likedUserId)
            }
        });

        // add curosor interacting style
        userNameSpan.style.cursor = 'pointer'
        userNameSpan.style.display = 'inline-block'
        // smooth the annimation
        userNameSpan.style.transition = 'transform 0.3s ease'

        // curosor on, bigger, change color
        userNameSpan.addEventListener('mouseenter', () => {
            userNameSpan.style.transform = 'scale(1.15)'
            userNameSpan.style.color = '#004182'
            userNameSpan.style.fontWeight = 'bold'
        });

        // cursor leave, back to normal, default color
        userNameSpan.addEventListener('mouseleave', () => {
            userNameSpan.style.transform = 'scale(1)'
            userNameSpan.style.color = ''
            userNameSpan.style.fontWeight = ''
        });

        userNameElement.appendChild(userNameSpan);
        userNameElement.appendChild(likedText);

        likeBlock.appendChild(userNameElement)

        modalContent.appendChild(likeBlock)
    }


    const modal = new bootstrap.Modal(document.getElementById('jobLikesModal'))
    modal.show()
}

const checkCommentsList = (job) => {
    const modalContent = document.getElementById('jobCommentsContent')
    // remove content of modal
    while (modalContent.firstChild) {
        modalContent.removeChild(modalContent.firstChild)
    }

    // adding comment for current job
    for (const commentData of job.comments) {
        const commentContent = commentData.comment
        const commentBy = commentData.userName
        // used to go user profile
        const commentUserId = commentData.userId

        const commentBlock = document.createElement('div')
        commentBlock.classList.add('job-modal-block')

        const userNameSpan = document.createElement('span')
        userNameSpan.textContent = '💬 ' + commentBy + ':'
        userNameSpan.classList.add('username-modal-style')

        const commentContentElement = document.createElement('p')
        commentContentElement.textContent = '"' + commentContent + '"'
        commentContentElement.classList.add('job-modal-text')

        // add listener to userNameSpan
        userNameSpan.addEventListener('click', () => {
            // close jobCommentsModal
            const modal = bootstrap.Modal.getInstance(document.getElementById('jobCommentsModal'));
            modal.hide();

            // if go to the user profile with same id with currentuserid, go my profile
            if (parseInt(commentUserId) === parseInt(currentUserId)) {
                // show my profile
                currentPage = showPage('my-profile')
                // load my profile, so use 'others-profile-container' and currentUserId
                const profileContainer = document.getElementById('my-profile-container');
                currentProfileId = loadProfile(profileContainer, currentUserId)
            } else {
                // show others profile
                currentPage = showPage('others-profile')
                // load others profile, so use 'others-profile-container' and commentUserId
                const profileContainer = document.getElementById('others-profile-container');
                currentProfileId = loadProfile(profileContainer, commentUserId)
            }

        });

        // add curosor interacting style
        userNameSpan.style.cursor = 'pointer'
        userNameSpan.style.display = 'inline-block'
        // smooth the annimation
        userNameSpan.style.transition = 'transform 0.3s ease'

        // curosor on, bigger, change color
        userNameSpan.addEventListener('mouseenter', () => {
            userNameSpan.style.transform = 'scale(1.15)'
            userNameSpan.style.color = '#004182'
            userNameSpan.style.fontWeight = 'bold'
        });

        // cursor leave, back to normal, default color
        userNameSpan.addEventListener('mouseleave', () => {
            userNameSpan.style.transform = 'scale(1)'
            userNameSpan.style.color = ''
            userNameSpan.style.fontWeight = ''
        });

        commentBlock.appendChild(userNameSpan)
        commentBlock.appendChild(commentContentElement)

        modalContent.appendChild(commentBlock)
    }
    

    const modal = new bootstrap.Modal(document.getElementById('jobCommentsModal'))
    modal.show()
}

const loadFeed = (start = 0) => {
    if (isLoading || !hasMoreJobs) { return }

    isLoading = true    // avoid this function called multiple time at same time
    // show loading message
    const loadingIndicator = document.getElementById('feed-loading');
    loadingIndicator.style.display = 'block';

    apiCall(
        `job/feed?start=${start}`,
        'GET',
        {}
    ).then((data) => {
        // loading from server finished, hide the loading message
        loadingIndicator.style.display = 'none';
        isLoading = false;  // allow this function to do next loading
        // there is no more job on server
        if (data.length === 0) {
            hasMoreJobs = false
            // show no job message at bottom of the page
            const noMoreElement = document.getElementById('feed-no-more');
            noMoreElement.style.display = 'block';
            return
        }
        for (const job of data) {
            const container = document.getElementById('feed-container')
            createCard(job, container)
        }
    }).catch((error) => {
        loadingIndicator.style.display = 'none';
        isLoading = false;
        showErrorPopup('Error', error.message)
    });
}

// load profile for give userid to given container
const loadProfile = (container, userId) => {
    apiCall(
        `user?userId=${userId}`,
        'GET',
        {}
    ).then((data) => {
        displayProfileData(container, data)

    }).catch((error) => {
        showErrorPopup('Error', error.message)
    });
    return userId
}

const displayProfileData = (container, userData) => {
    // clear the container
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // adding things to container
    // create a profileCard
    const profileCard = document.createElement('div');
    profileCard.className = 'profile-card';

    // create a header which contain name and email
    const profileHeader = document.createElement('div');
    profileHeader.className = 'profile-header';

    // Create avatar container (leftmost element)
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'profile-avatar';

    const avatarImg = document.createElement('img');
    avatarImg.className = 'avatar-image';
    // Set avatar source, use default if not available
    avatarImg.src = userData.image || 'https://odin-project-google-homepage-clone.vercel.app/images/google-account.png';
    avatarImg.alt = `${userData.name}'s avatar`;

    avatarContainer.appendChild(avatarImg);

    // Create text content (name and email)
    const textContent = document.createElement('div');
    textContent.className = 'profile-text-content';

    const userName = document.createElement('h2');
    userName.className = 'profile-name';
    userName.textContent = `Name: ${userData.name}`;

    const userEmail = document.createElement('p');
    userEmail.className = 'profile-email';
    userEmail.textContent = `Email: ${userData.email}`;

    textContent.appendChild(userName);
    textContent.appendChild(userEmail);

    // Create the profile button
    const profileButton = document.createElement('button');
    profileButton.className = 'btn btn-primary profile-buttons';

    if (parseInt(currentUserId) === parseInt(userData.id)) {
        profileButton.id = 'btn-update-profile';
        profileButton.textContent = 'Update my profile';
        profileButton.addEventListener('click', () => {
            showUpdateProfileModal()
        })
    } else {
        profileButton.id = 'btn-watch-profile';
        let watchFlag = true

        if (userData.usersWhoWatchMeUserIds.length === 0) {
            // // no one waching, not watch yet, watching this user
            // watchByEmail(userData, true)
            watchFlag = true
        } else {
            for (const userId of userData.usersWhoWatchMeUserIds) {
                if (parseInt(currentUserId) === parseInt(userId)) {
                    // // already watching this user, unwatch this
                    // watchByEmail(userData, false)
                    watchFlag = false
                    break
                }
                // not go inside if true, watchFlag remain true
                // // not watch yet, watching this user
            }
        }
        if (watchFlag) {
            profileButton.textContent = 'Watch this profile 👀';
        } else {
            profileButton.textContent = 'Unwatch this profile 🙈';
        }
        profileButton.addEventListener('click', () => {
            watchByEmail(userData, watchFlag)
        });
    }

    profileHeader.appendChild(avatarContainer);
    profileHeader.appendChild(textContent);
    profileHeader.appendChild(profileButton);

    // create a container to contain job created by this user
    const jobContainer = document.createElement('div');
    jobContainer.className = 'profile-job-container';

    // create a section for watcher who watching this profile
    const watcherSection = document.createElement('div');
    watcherSection.className = 'watcher-section';

    const watcherNumber = document.createElement('span');
    watcherNumber.className = 'watcher-number';
    watcherNumber.textContent = `Watched by ${userData.usersWhoWatchMeUserIds.length} users:`

    const watcherContainer = document.createElement('div');
    watcherContainer.className = 'profile-watcher-container';

    watcherSection.appendChild(watcherNumber)
    watcherSection.appendChild(watcherContainer)

    // use to display job and watcher side by side
    const contentContainer = document.createElement('div');
    contentContainer.className = 'profile-content';

    contentContainer.appendChild(watcherSection);
    contentContainer.appendChild(jobContainer);

    profileCard.appendChild(profileHeader);
    profileCard.appendChild(contentContainer);

    container.appendChild(profileCard);

    // adding job
    for (const job of userData.jobs) {
        createCard(job, jobContainer)
    }

    // adding watchers
    for (const watcherId of userData.usersWhoWatchMeUserIds) {
        addWatcher(watcherId, watcherContainer)
    }
}

const watchByEmail = (userData, watchFlag) => {
    apiCall(
        'user/watch',
        'PUT',
        {
            email: userData.email,
            turnon: watchFlag
        }
    ).then(() => {
        // reach here if backend ok with this watch
        if (watchFlag) {
            showErrorPopup('Watching', `You are watching ${userData.name} now!`, 'blue')
        } else {
            showErrorPopup('Unwatched', `You are unwatched ${userData.name} now!`, 'blue')
        }

        // reload the other profile page
        clearFeed()
        currentPage = showPage('others-profile')
        // load other profile, so use 'other-profile-container' and other's id
        const profileContainer = document.getElementById('others-profile-container');
        currentProfileId = loadProfile(profileContainer, userData.id)
    }).catch((error) => {
        console.log(error)
        showErrorPopup('Error', error.message)
    });
}

// pop up a modal for update profile usage
const showUpdateProfileModal = () => {
    const modal = new bootstrap.Modal(document.getElementById('updateProfileModal'))
    modal.show();

    const confirmUpdateProfileButton = document.getElementById('btn-confirm-update')
    const newConfirmUpdateProfileButton = confirmUpdateProfileButton.cloneNode(true);
    // use the clone replace with the original one, which will remove all eventListener
    confirmUpdateProfileButton.replaceWith(newConfirmUpdateProfileButton);

    newConfirmUpdateProfileButton.addEventListener('click', () => {
        updateUserProfile();
    });
}

const updateUserProfile = () => {
    const email = document.getElementById('update-email').value
    const password = document.getElementById('update-password').value
    const name = document.getElementById('update-name').value
    const imageFile = document.getElementById('update-image').files[0]

    const requestBody = {
        email: email || undefined,
        password: password || undefined,
        name: name || undefined
    }
    // if there no image, send the put request
    if (!imageFile) {
        // if the request body actually empty
        if (requestBody.email === undefined && requestBody.password === undefined && requestBody.name === undefined) {
            showErrorPopup('Update profile', 'Profile remain unchanged!', 'blue')
            // close the updateprofilemodal
            const modal = bootstrap.Modal.getInstance(
                document.getElementById('updateProfileModal')
            )
            modal.hide()
        } else {
            sendUpdateRequest(requestBody)
        }
    } else {
        fileToDataUrl(imageFile).then((dataUrl) => {
            requestBody.image = dataUrl
            sendUpdateRequest(requestBody)
        }).catch((error) => {
            showErrorPopup('Error', error.message)
        });
    }
}

const sendUpdateRequest = (requestBody) => {
    apiCall(
        'user',
        'PUT',
        requestBody
    ).then(() => {
        // reach here if backend ok with this profile update
        showErrorPopup('Update profile', 'Profile update successful!', 'blue')
        // empty the form
        document.getElementById('update-email').value = ''
        document.getElementById('update-password').value = ''
        document.getElementById('update-name').value = ''
        document.getElementById('update-image').value = ''
        // reload the my profile page
        clearFeed()
        currentPage = showPage('my-profile')
        // load my profile, so use 'my-profile-container' and current id
        const profileContainer = document.getElementById('my-profile-container');
        currentProfileId = loadProfile(profileContainer, currentUserId)

        // close the updateprofilemodal
        const modal = bootstrap.Modal.getInstance(
            document.getElementById('updateProfileModal')
        )
        modal.hide()
    }).catch((error) => {
        showErrorPopup('Error', error.message)
    });
}

// add watcher to profile page base on given watcherId to given container
const addWatcher = (watcherId, container) => {
    apiCall(
        `user?userId=${watcherId}`,
        'GET',
        {}
    ).then((data) => {
        const watcherName = data.name

        const watcherBlock = document.createElement('div')
        watcherBlock.classList.add('profile-watcher-name-block')

        const watcherNameSpan = document.createElement('span')
        watcherNameSpan.textContent = '👀 ' + watcherName
        watcherNameSpan.classList.add('profile-watcher-name-span')

        // add listener so that can go to watchers profile
        watcherBlock.addEventListener('click', () => {

            // if go to the user profile with same id with currentuserid, go my profile
            if (parseInt(watcherId) === parseInt(currentUserId)) {
                // show my profile
                currentPage = showPage('my-profile')
                // load my profile, so use 'others-profile-container' and currentUserId
                const profileContainer = document.getElementById('my-profile-container');
                currentProfileId = loadProfile(profileContainer, currentUserId)
            } else {
                // show others profile
                currentPage = showPage('others-profile')
                // load others profile, so use 'others-profile-container' and watcherId
                const profileContainer = document.getElementById('others-profile-container');
                currentProfileId = loadProfile(profileContainer, watcherId)
            }
        });

        // add curosor interacting style
        watcherBlock.style.cursor = 'pointer';
        // smooth the annimation
        watcherBlock.style.transition = 'transform 0.3s ease';

        // curosor on, bigger
        watcherBlock.addEventListener('mouseenter', () => {
            watcherBlock.style.transform = 'scale(1.05)';
            watcherBlock.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
        });

        // cursor leave, back to normal
        watcherBlock.addEventListener('mouseleave', () => {
            watcherBlock.style.transform = 'scale(1)';
            watcherBlock.style.boxShadow = 'none';
        });

        watcherBlock.appendChild(watcherNameSpan)

        container.appendChild(watcherBlock)

    }).catch((error) => {
        showErrorPopup('Error', error.message)
    });
}

// everytime call this function, it will take a func, and execute it at delay
const debounce = (func, delay) => {
    let timeoutId;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timeoutId);    // clear timeOut if there is one
        timeoutId = setTimeout(() => {  // set new timeOut so that the functioon will execute after dealy
            func.apply(context, args);
        }, delay);
    };
};

const checkScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    // do this while the window scroll to bottom within 100px
    if (scrollTop + clientHeight > scrollHeight - 100) {
        const loadedCount = document.querySelectorAll('.count-job-card').length;
        loadFeed(loadedCount);
    }
}

// Do it when the page loads
for (const atag of document.querySelectorAll('a')) {
    if (atag.hasAttribute('internal-link')) {
        atag.addEventListener('click', () => {
            const pageName = atag.getAttribute('internal-link')
            currentPage = showPage(pageName)
        });
    }
}

if (token) {
    currentPage = showPage('feed')
} else {
    currentPage = showPage('login')
}