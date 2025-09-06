class GlassLoginUI {
    constructor() {
        this.loginContainer = null;
        this.init();
    }

    init() {
        this.createStyles();
        this.createHTML();
        this.bindEvents();
        this.show();
    }

    createStyles() {
        const styles = `
            .glass-login-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 999999;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.5s ease-out;
            }

            .glass-login-overlay::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.05"/><circle cx="10" cy="50" r="0.5" fill="white" opacity="0.05"/><circle cx="90" cy="30" r="0.5" fill="white" opacity="0.05"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
                animation: float 20s ease-in-out infinite;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
            }

            .glass-login-box {
                position: relative;
                z-index: 10;
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                padding: 40px;
                width: 400px;
                max-width: 90vw;
                box-shadow: 0 25px 45px rgba(0, 0, 0, 0.1);
                animation: slideIn 0.6s ease-out;
            }

            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(30px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            .glass-login-box h2 {
                text-align: center;
                margin: 0 0 30px 0;
                color: white;
                font-weight: 300;
                font-size: 28px;
                letter-spacing: 1px;
            }

            .glass-input-group {
                margin-bottom: 25px;
            }

            .glass-input-group label {
                display: block;
                margin-bottom: 8px;
                color: rgba(255, 255, 255, 0.9);
                font-weight: 500;
                font-size: 14px;
            }

            .glass-input-group input {
                width: 100%;
                padding: 15px;
                border: none;
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                font-size: 16px;
                outline: none;
                transition: all 0.3s ease;
                box-sizing: border-box;
            }

            .glass-input-group input::placeholder {
                color: rgba(255, 255, 255, 0.6);
            }

            .glass-input-group input:focus {
                background: rgba(255, 255, 255, 0.2);
                border-color: rgba(255, 255, 255, 0.4);
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
            }

            .glass-login-btn {
                width: 100%;
                padding: 15px;
                border: none;
                border-radius: 12px;
                background: linear-gradient(135deg, #ff6b6b, #ffa726);
                color: white;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                margin-top: 20px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .glass-login-btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 15px 30px rgba(255, 107, 107, 0.4);
                background: linear-gradient(135deg, #ff5252, #ff9800);
            }

            .glass-login-btn:active {
                transform: translateY(-1px);
            }

            .glass-success-message {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                border-radius: 20px;
                padding: 50px;
                text-align: center;
                box-shadow: 0 30px 60px rgba(0, 0, 0, 0.3);
                animation: successPop 0.6s ease-out;
                z-index: 20;
            }

            @keyframes successPop {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.05);
                }
                100% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }

            .glass-checkmark {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: linear-gradient(135deg, #4caf50, #45a049);
                color: white;
                font-size: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                animation: checkmarkBounce 0.6s ease-out 0.3s both;
            }

            @keyframes checkmarkBounce {
                0% {
                    opacity: 0;
                    transform: scale(0);
                }
                50% {
                    transform: scale(1.2);
                }
                100% {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            .glass-success-message h3 {
                color: #333;
                margin: 0 0 10px 0;
                font-size: 24px;
                font-weight: 600;
            }

            .glass-success-message p {
                color: #666;
                font-size: 16px;
                margin: 0;
            }

            .glass-fade-out {
                animation: fadeOut 0.5s ease-out forwards;
            }

            @keyframes fadeOut {
                to {
                    opacity: 0;
                    transform: scale(0.9);
                }
            }

            @media (max-width: 480px) {
                .glass-login-box {
                    width: 90%;
                    padding: 30px 25px;
                    margin: 20px;
                }
                
                .glass-success-message {
                    width: 90%;
                    padding: 40px 30px;
                    margin: 20px;
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    createHTML() {
        const html = `
            <div class="glass-login-overlay" id="glassLoginOverlay">
                <div class="glass-login-box">
                    <h2>Đăng nhập</h2>
                    <form id="glassLoginForm">
                        <div class="glass-input-group">
                            <label for="glassUsername">Tài khoản:</label>
                            <input type="text" id="glassUsername" name="username" placeholder="Nhập tài khoản">
                        </div>
                        <div class="glass-input-group">
                            <label for="glassPassword">Mật khẩu:</label>
                            <input type="password" id="glassPassword" name="password" placeholder="Nhập mật khẩu">
                        </div>
                        <button type="submit" class="glass-login-btn">Tiếp tục</button>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
        this.loginContainer = document.getElementById('glassLoginOverlay');
    }

    bindEvents() {
        const form = document.getElementById('glassLoginForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Thêm hiệu ứng cho inputs
        const inputs = this.loginContainer.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                this.style.animation = 'none';
            });
            
            input.addEventListener('blur', function() {
                if (!this.value) {
                    this.style.animation = 'subtle-pulse 2s ease-in-out infinite';
                }
            });
        });

        // Thêm keyframe cho pulse effect
        const pulseStyle = document.createElement('style');
        pulseStyle.textContent = `
            @keyframes subtle-pulse {
                0%, 100% { border-color: rgba(255, 255, 255, 0.2); }
                50% { border-color: rgba(255, 255, 255, 0.4); }
            }
        `;
        document.head.appendChild(pulseStyle);
    }

    handleLogin() {
        // Hiển thị thông báo thành công
        const successHTML = `
            <div class="glass-success-message">
                <div class="glass-checkmark">✓</div>
                <h3>Đăng nhập thành công!</h3>
                <p>Chào mừng bạn quay trở lại</p>
            </div>
        `;
        
        this.loginContainer.insertAdjacentHTML('beforeend', successHTML);

        // Đóng toàn bộ sau 2 giây
        setTimeout(() => {
            this.close();
        }, 2000);
    }

    show() {
        if (this.loginContainer) {
            this.loginContainer.style.display = 'flex';
        }
    }

    close() {
        if (this.loginContainer) {
            this.loginContainer.classList.add('glass-fade-out');
            setTimeout(() => {
                this.loginContainer.remove();
            }, 500);
        }
    }
}

// Auto-initialize khi import
const glassLogin = new GlassLoginUI();

// Export cho trường hợp cần control manual
export default GlassLoginUI;