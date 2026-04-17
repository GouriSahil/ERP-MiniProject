(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('AuthController', AuthController);

    AuthController.$inject = ['$scope', '$location', '$window', '$routeParams', 'AuthService', 'APP_CONFIG'];

    function AuthController($scope, $location, $window, $routeParams, AuthService, APP_CONFIG) {
        var vm = this;

        // Initialize Remember Me
        var rememberedEmail = $window.localStorage.getItem('erp_remembered_email');

        // Login data
        vm.loginData = {
            email: rememberedEmail || '',
            password: '',
            rememberMe: !!rememberedEmail
        };

        // Register data
        vm.registerData = {
            fullName: '',
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            role: 'student',
            agreeTerms: false
        };

        // Reset data
        vm.resetData = {
            password: '',
            confirmPassword: '',
            token: $routeParams.token || ''
        };

        // Error states
        vm.loginError = null;
        vm.registerError = null;
        vm.forgotPasswordError = null;
        vm.resetError = null;
        vm.loginSuccessMessage = null;
        vm.registerSuccessMessage = null;
        vm.forgotPasswordSuccessMessage = null;
        vm.resetSuccessMessage = null;

        // Password visibility toggles
        vm.showPassword = {
            login: false,
            register: false,
            reset: false
        };

        // Password strength indicator
        vm.passwordStrength = {
            class: '',
            percent: 0,
            text: ''
        };

        // Roles available for registration
        vm.roles = [
            { value: 'student', label: 'Student' },
            { value: 'faculty', label: 'Faculty' }
        ];

        vm.login = login;
        vm.register = register;
        vm.forgotPassword = forgotPassword;
        vm.resetPassword = resetPassword;
        vm.isLoginPage = isLoginPage;
        vm.isRegisterPage = isRegisterPage;
        vm.togglePasswordVisibility = togglePasswordVisibility;
        vm.updatePasswordStrength = updatePasswordStrength;
        vm.loginWithGoogle = loginWithGoogle;
        vm.loginWithMicrosoft = loginWithMicrosoft;
        vm.loginWithApple = loginWithApple;
        vm.registerWithGoogle = registerWithGoogle;
        vm.registerWithMicrosoft = registerWithMicrosoft;
        vm.registerWithApple = registerWithApple;
        vm.isLoading = false;

        // Watch password changes to update strength indicator
        $scope.$watch(function() {
            return vm.registerData.password;
        }, function(newPassword) {
            if (newPassword && $location.path() === '/register') {
                vm.updatePasswordStrength(newPassword);
            } else if (!newPassword && $location.path() === '/register') {
                vm.passwordStrength = { class: '', percent: 0, text: '' };
            }
        });

        $scope.$watch(function() {
            return vm.resetData.password;
        }, function(newPassword) {
            if (newPassword && $location.path().indexOf('/reset-password') === 0) {
                vm.updatePasswordStrength(newPassword);
            } else if (!newPassword && $location.path().indexOf('/reset-password') === 0) {
                vm.passwordStrength = { class: '', percent: 0, text: '' };
            }
        });

        function togglePasswordVisibility(form) {
            vm.showPassword[form] = !vm.showPassword[form];
        }

        function updatePasswordStrength(password) {
            var strength = 0;

            // Length check
            if (password.length >= 8) strength += 25;
            if (password.length >= 12) strength += 15;

            // Character variety checks
            if (/[a-z]/.test(password)) strength += 15;
            if (/[A-Z]/.test(password)) strength += 15;
            if (/[0-9]/.test(password)) strength += 15;
            if (/[^a-zA-Z0-9]/.test(password)) strength += 15;

            if (strength < 40) {
                vm.passwordStrength = { class: 'weak', percent: Math.min(strength, 33), text: 'Weak' };
            } else if (strength < 70) {
                vm.passwordStrength = { class: 'medium', percent: Math.min(strength, 66), text: 'Medium' };
            } else {
                vm.passwordStrength = { class: 'strong', percent: strength, text: 'Strong' };
            }
        }

        function loginWithGoogle() {
            vm.loginError = 'Google login is coming soon!';
        }

        function loginWithMicrosoft() {
            vm.loginError = 'Microsoft login is coming soon!';
        }

        function loginWithApple() {
            vm.loginError = 'Apple login is coming soon!';
        }

        function registerWithGoogle() {
            vm.registerError = 'Google registration is coming soon!';
        }

        function registerWithMicrosoft() {
            vm.registerError = 'Microsoft registration is coming soon!';
        }

        function registerWithApple() {
            vm.registerError = 'Apple registration is coming soon!';
        }

        function login() {
            // Clear previous messages
            vm.loginError = null;
            vm.loginSuccessMessage = null;

            // Validate form
            if (!vm.loginData.email || !vm.loginData.password) {
                vm.loginError = 'Please fill in all required fields';
                return;
            }

            // Basic email validation
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(vm.loginData.email)) {
                vm.loginError = 'Please enter a valid email address';
                return;
            }

            vm.isLoading = true;

            AuthService.login(vm.loginData)
                .then(function(response) {
                    // Handle remember email
                    if (vm.loginData.rememberMe) {
                        $window.localStorage.setItem('erp_remembered_email', vm.loginData.email);
                    } else {
                        $window.localStorage.removeItem('erp_remembered_email');
                    }

                    vm.isLoading = false;
                    vm.loginSuccessMessage = 'Welcome back, ' + response.user.name + '!';
                    $scope.$applyAsync(function() {
                        $location.path('/dashboard');
                    });
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    // Handle validation errors from backend
                    if (error.data && error.data.errors && Array.isArray(error.data.errors)) {
                        var validationErrors = error.data.errors
                            .map(function(err) { return err.message; })
                            .join(', ');
                        vm.loginError = validationErrors || 'Validation failed. Please check your input.';
                    } else if (error.data && error.data.details && Array.isArray(error.data.details)) {
                        var validationErrors = error.data.details
                            .map(function(err) { return err.msg || err.message; })
                            .join(', ');
                        vm.loginError = validationErrors || 'Validation failed. Please check your input.';
                    } else {
                        vm.loginError = error.data?.message || 'Invalid email or password';
                    }
                    $scope.$applyAsync();
                });
        }

        function register() {
            // Clear previous messages
            vm.registerError = null;
            vm.registerSuccessMessage = null;

            // Validate form - check fullName first
            if (!vm.registerData.fullName || !vm.registerData.email ||
                !vm.registerData.password || !vm.registerData.confirmPassword) {
                vm.registerError = 'Please fill in all required fields';
                return;
            }

            // Validate name
            if (vm.registerData.fullName.trim().length < 2) {
                vm.registerError = 'Name must be at least 2 characters long';
                return;
            }

            // Basic email validation
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(vm.registerData.email)) {
                vm.registerError = 'Please enter a valid email address';
                return;
            }

            // Validate password match
            if (vm.registerData.password !== vm.registerData.confirmPassword) {
                vm.registerError = 'Passwords do not match';
                return;
            }

            // Validate password strength
            if (vm.registerData.password.length < 8) {
                vm.registerError = 'Password must be at least 8 characters long';
                return;
            }

            // Validate terms agreement
            if (!vm.registerData.agreeTerms) {
                vm.registerError = 'Please agree to the Terms of Service and Privacy Policy';
                return;
            }

            // Validate role selection
            if (!vm.registerData.role) {
                vm.registerError = 'Please select your role';
                return;
            }

            vm.isLoading = true;

            // Prepare registration data - use fullName as name for API
            var registrationData = {
                name: vm.registerData.fullName.trim(),
                email: vm.registerData.email.trim().toLowerCase(),
                password: vm.registerData.password,
                role: vm.registerData.role
            };

            AuthService.register(registrationData)
                .then(function(result) {
                    vm.isLoading = false;
                    // Use the backend's success message which includes approval status
                    vm.registerSuccessMessage = result.message || 'Your account has been created! Redirecting to login...';
                    setTimeout(function() {
                        $scope.$applyAsync(function() {
                            $location.path('/login');
                        });
                    }, 3000);
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    // Handle validation errors from backend
                    if (error.data && error.data.errors && Array.isArray(error.data.errors)) {
                        var validationErrors = error.data.errors
                            .map(function(err) { return err.message; })
                            .join(', ');
                        vm.registerError = validationErrors || 'Validation failed. Please check your input.';
                    } else if (error.data && error.data.details && Array.isArray(error.data.details)) {
                        var validationErrors = error.data.details
                            .map(function(err) { return err.msg || err.message; })
                            .join(', ');
                        vm.registerError = validationErrors || 'Validation failed. Please check your input.';
                    } else {
                        vm.registerError = error.data?.message || 'Failed to create account. Please try again.';
                    }
                    $scope.$applyAsync();
                });
        }

        function forgotPassword() {
            // Clear previous messages
            vm.forgotPasswordError = null;
            vm.forgotPasswordSuccessMessage = null;

            // Validate form
            if (!vm.loginData.email) {
                vm.forgotPasswordError = 'Please enter your email address';
                return;
            }

            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(vm.loginData.email)) {
                vm.forgotPasswordError = 'Please enter a valid email address';
                return;
            }

            vm.isLoading = true;

            AuthService.forgotPassword(vm.loginData.email)
                .then(function(response) {
                    vm.isLoading = false;
                    vm.forgotPasswordSuccessMessage = 'Password reset instructions have been sent to ' + vm.loginData.email;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.forgotPasswordError = error.data?.message || 'Failed to process request. Please try again.';
                    $scope.$applyAsync();
                });
        }

        function resetPassword() {
            // Clear previous messages
            vm.resetError = null;
            vm.resetSuccessMessage = null;

            // Validate form
            if (!vm.resetData.password || !vm.resetData.confirmPassword) {
                vm.resetError = 'Please fill in all fields';
                return;
            }

            if (vm.resetData.password !== vm.resetData.confirmPassword) {
                vm.resetError = 'Passwords do not match';
                return;
            }

            if (vm.resetData.password.length < 8) {
                vm.resetError = 'Password must be at least 8 characters long';
                return;
            }

            if (!vm.resetData.token) {
                vm.resetError = 'Invalid reset token. Please try requesting a new link.';
                return;
            }

            vm.isLoading = true;

            AuthService.resetPassword(vm.resetData.token, vm.resetData.password)
                .then(function(response) {
                    vm.isLoading = false;
                    vm.resetSuccessMessage = 'Your password has been reset successfully. Redirecting to login...';
                    setTimeout(function() {
                        $scope.$applyAsync(function() {
                            $location.path('/login');
                        });
                    }, 2000);
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.resetError = error.data?.message || 'Failed to reset password. The link might be expired or invalid.';
                    $scope.$applyAsync();
                });
        }

        function isLoginPage() {
            return $location.path() === '/login';
        }

        function isRegisterPage() {
            return $location.path() === '/register';
        }
    }
})();
