import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl } from './helpers.js';

console.log('Let\'s go!');

// Function to show error popup with a custom message
function showErrorPopup(errorLabel, errorMessage) {
    // Get the modal and the element where the error message will be displayed
    const modal = new bootstrap.Modal(document.getElementById('errorPopup'))

    const modalLabel = document.getElementById('errorPopupLabel')

    const modalMessage = document.getElementById('errorPopupMessage')

    modalLabel.textContent = errorLabel
    modalLabel.style.color = 'red'
    // Set the message inside the modal
    modalMessage.textContent = errorMessage
    // Show the modal
    modal.show()
}

let token = localStorage.getItem('lurkforwork_token')
let currentUserId = localStorage.getItem('lurkforwork_userId')

// use for load feed, 2.3.4
let isLoading = false   // to control the flow, if is loading next 5 jobs, do nothing just return
let hasMoreJobs = true  // if there is no more jobs on server, do nothing just return

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
    // const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    // const nameRegex = /^[A-Za-z' -]+$/

    // if (!emailRegex.test(email)) {
    //     showErrorPopup('Error', "Please enter a valid email address.")
    // } else if (!nameRegex.test(name)) {
    //     showErrorPopup('Error', 'Please enter a valid name.')
    // } else if (password.length < 6) {
    //     showErrorPopup('Error', 'The password must be at least 6 characters.')
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
            localStorage.setItem('lurkforwork_userId', data.userId)
            token = localStorage.getItem('lurkforwork_token')
            currentUserId = localStorage.getItem('lurkforwork_userId')
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
    //     showErrorPopup('Error', 'The password must be at least 6 characters.')
    // } else {
    if (true) {
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
            showPage('feed')
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
        showPage('login');
    }

    // clciking "Profile" btn, go to my profile
    if (e.target.id === 'btn-my-profile') {
        clearFeed()
        showPage('my-profile')
        // load my profile, so use 'my-profile-container' and current id
        const profileContainer = document.getElementById('my-profile-container');
        loadProfile(profileContainer, currentUserId)
    }

    if (e.target.classList.contains('btn-back-home')) {
        clearFeed()
        showPage('feed')
    }
});

const showPage = (pageName) => {
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
        window.addEventListener('scroll', debounce(checkScroll, 200));
    } else {
        window.removeEventListener('scroll', debounce(checkScroll, 200));
    }
}

// for given job info, create a job card element, add to feed-container
const createCard = (job, container) => {
    // const cardContainer = document.getElementById('feed-container')
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
                showPage('my-profile')
                // load my profile, so use 'others-profile-container' and currentUserId
                const profileContainer = document.getElementById('my-profile-container');
                loadProfile(profileContainer, currentUserId)
            } else {
                // show others profile
                showPage('others-profile')
                // load others profile, so use 'others-profile-container' and cardAuthorId
                const profileContainer = document.getElementById('others-profile-container');
                loadProfile(profileContainer, cardAuthorId)
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
            console.log(`this job is ${job.id}`)
        });
        cardBody.appendChild(cardLikesButton)

        // add space between likes and like a job
        const spaceSpan = document.createElement('span')
        spaceSpan.style.display = 'inline-block'
        spaceSpan.style.width = 'clamp(5px, 5vw, 25px)'
        cardBody.appendChild(spaceSpan)

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

        cardBody.appendChild(likeJobButton)

        const breakLine = document.createElement('br')
        cardBody.appendChild(breakLine)

        // How many comments the job post has
        const cardCommentsButton = document.createElement('button')
        cardCommentsButton.classList.add('btn', 'btn-link', 'p-0')
        cardCommentsButton.textContent = `💬 ${job.comments.length || 'no'} comments`
        cardCommentsButton.addEventListener('click', () => {
            checkCommentsList(job)
            console.log(`this job is ${job.id}`)
        });
        cardBody.appendChild(cardCommentsButton)

        card.appendChild(cardBody)

        cardContainer.appendChild(card)

    }).catch((error) => {
        showErrorPopup('Error', error.message)
    });
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
        console.log(data)
        // deep clone the element
        const newlikeJobButton = likeJobButton.cloneNode(true);
        // use the clone replace with the original one, which will remove all eventListener
        likeJobButton.replaceWith(newlikeJobButton);

        const handleLikeClick = () => likeJob(jobId, newlikeJobButton);
        newlikeJobButton.textContent = `Like the job ❤️ `
        newlikeJobButton.addEventListener('click', handleLikeClick)
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
        console.log(data)
        // deep clone the element
        const newlikeJobButton = likeJobButton.cloneNode(true);
        // use the clone replace with the original one, which will remove all eventListener
        likeJobButton.replaceWith(newlikeJobButton);

        const handleUnlikeClick = () => unlikeJob(jobId, newlikeJobButton);
        newlikeJobButton.textContent = `Unlike the job 💔`
        newlikeJobButton.addEventListener('click', handleUnlikeClick)
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
    let repeat = 5
    while (repeat > 0) {
        repeat = repeat - 1
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
                    showPage('my-profile')
                    // load my profile, so use 'others-profile-container' and currentUserId
                    const profileContainer = document.getElementById('my-profile-container');
                    loadProfile(profileContainer, currentUserId)
                } else {
                    // show others profile
                    showPage('others-profile')
                    // load others profile, so use 'others-profile-container' and likedUserId
                    const profileContainer = document.getElementById('others-profile-container');
                    loadProfile(profileContainer, likedUserId)
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
    }

    const modal = new bootstrap.Modal(document.getElementById('jobLikesModal'))
    modal.show()
    // console.log(`calling checkLikesList for job ${job.id}`)
}

const checkCommentsList = (job) => {
    const modalContent = document.getElementById('jobCommentsContent')
    // remove content of modal
    while (modalContent.firstChild) {
        modalContent.removeChild(modalContent.firstChild)
    }

    let repeat = 25
    while (repeat > 0) {
        repeat = repeat - 1
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
                    showPage('my-profile')
                    // load my profile, so use 'others-profile-container' and currentUserId
                    const profileContainer = document.getElementById('my-profile-container');
                    loadProfile(profileContainer, currentUserId)
                } else {
                    // show others profile
                    showPage('others-profile')
                    // load others profile, so use 'others-profile-container' and commentUserId
                    const profileContainer = document.getElementById('others-profile-container');
                    loadProfile(profileContainer, commentUserId)
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
    }

    const modal = new bootstrap.Modal(document.getElementById('jobCommentsModal'))
    modal.show()
    // console.log(`calling checkCommentsList for job ${job.id}`)
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
            console.log(job)
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
    console.log("loding my profile")
    apiCall(
        `user?userId=${userId}`,
        'GET',
        {}
    ).then((data) => {
        displayProfileData(container, data)
        
    }).catch((error) => {
        showErrorPopup('Error', error.message)
    });
}

const displayProfileData = (container, userData) => {
    console.log(userData)
    console.log(container)
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
    console.log("here")
    console.log(userData.image)
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
            showUpdateProfileModal(userData.id)
        })
    } else {
        profileButton.id = 'btn-watch-profile';
        profileButton.textContent = 'Watch this profile';
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
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        addWatcher(watcherId, watcherContainer)
        
    }
}

const showUpdateProfileModal = (userId) => {
    console.log('updating')
    console.log(userId)
    const modal = new bootstrap.Modal(document.getElementById('updateProfileModal'));
    modal.show();
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
                showPage('my-profile')
                // load my profile, so use 'others-profile-container' and currentUserId
                const profileContainer = document.getElementById('my-profile-container');
                loadProfile(profileContainer, currentUserId)
            } else {
                // show others profile
                showPage('others-profile')
                // load others profile, so use 'others-profile-container' and watcherId
                const profileContainer = document.getElementById('others-profile-container');
                loadProfile(profileContainer, watcherId)
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
    return function() {
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
        console.log("loadedcount")
        console.log(loadedCount)
        loadFeed(loadedCount);
    }
}

// Do it when the page loads
for (const atag of document.querySelectorAll('a')) {
    if (atag.hasAttribute('internal-link')) {
        atag.addEventListener('click', () => {
            const pageName = atag.getAttribute('internal-link')
            showPage(pageName)
        });
    }
}

if (token) {
    showPage('feed')
} else {
    showPage('login')
}