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

document.getElementById('btn-register').addEventListener('click', () => {
    const email = document.getElementById('register-email').value
    const name = document.getElementById('register-name').value
    const password = document.getElementById('register-password').value
    const passwordConfirm = document.getElementById('register-password-confirm').value
    console.log(
        email,
        name,
        password,
        passwordConfirm
    )
    if (password !== passwordConfirm) {
       showErrorPopup("Error", "The two passwords don't match, please check!")
    } else {
        // 密码匹配, 可以提交表单, 待完成...
        console.log("密码匹配")
    }
})