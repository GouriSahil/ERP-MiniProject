(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('AuthController', AuthController);

    AuthController.$inject = ['$scope', '$location', '$window', 'AuthService', 'APP_CONFIG'];
    
    function AuthController($scope, $location, $window, AuthService, APP_CONFIG) {
        var vm = this;
        
        // Login data
        vm.loginData = {
            email: '',
            password: '',
            rememberMe: false
        };

        // Register data
        vm.registerData = {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            role: 'student'
        };

        // Error states
        vm.loginError = null;
        vm.registerError = null;
        vm.loginSuccessMessage = null;
        vm.registerSuccessMessage = null;

        // Roles available for registration
        vm.roles = [
            { value: 'student', label: 'Student' },
            { value: 'faculty', label: 'Faculty' },
            { value: 'admin', label: 'Administrator' }
        ];

        vm.login = login;
        vm.register = register;
        vm.isLoginPage = isLoginPage;
        vm.isRegisterPage = isRegisterPage;
        vm.isLoading = false;

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

            // Validate form
            if (!vm.registerData.name || !vm.registerData.email ||
                !vm.registerData.password || !vm.registerData.confirmPassword) {
                vm.registerError = 'Please fill in all required fields';
                return;
            }

            // Validate name
            if (vm.registerData.name.trim().length < 2) {
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

            // Validate role selection
            if (!vm.registerData.role) {
                vm.registerError = 'Please select your role';
                return;
            }

            vm.isLoading = true;

            // Prepare registration data
            var registrationData = {
                name: vm.registerData.name.trim(),
                email: vm.registerData.email.trim().toLowerCase(),
                password: vm.registerData.password,
                role: vm.registerData.role
            };

            AuthService.register(registrationData)
                .then(function(response) {
                    vm.isLoading = false;
                    vm.registerSuccessMessage = 'Your account has been created! Redirecting to login...';
                    setTimeout(function() {
                        $scope.$applyAsync(function() {
                            $location.path('/login');
                        });
                    }, 2000);
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

        function isLoginPage() {
            return $location.path() === '/login';
        }

        function isRegisterPage() {
            return $location.path() === '/register';
        }
    }
})();
