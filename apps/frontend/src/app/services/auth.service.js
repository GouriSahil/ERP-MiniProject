(function() {
    'use strict';

    angular
        .module('erpApp')
        .factory('AuthService', AuthService);

    AuthService.$inject = ['$http', '$q', '$cookies', '$window', 'APP_CONFIG'];
    
    function AuthService($http, $q, $cookies, $window, APP_CONFIG) {
        var service = {
            login: login,
            register: register,
            logout: logout,
            isAuthenticated: isAuthenticated,
            getCurrentUser: getCurrentUser,
            refreshToken: refreshToken,
            updateProfile: updateProfile,
            changePassword: changePassword
        };

        return service;

        function login(credentials) {
            return $http.post(APP_CONFIG.API_BASE_URL + '/auth/login', credentials)
                .then(function(response) {
                    var data = response.data.data;
                    
                    // Store tokens
                    var expires = new Date();
                    expires.setDate(expires.getDate() + 30); // 30 days
                    
                    $cookies.put(APP_CONFIG.TOKEN_KEY, data.accessToken, { expires: expires });
                    $cookies.put(APP_CONFIG.REFRESH_TOKEN_KEY, data.refreshToken, { expires: expires });
                    $cookies.put(APP_CONFIG.USER_KEY, JSON.stringify(data.user), { expires: expires });
                    
                    return data;
                })
                .catch(handleError);
        }

        function register(userData) {
            return $http.post(APP_CONFIG.API_BASE_URL + '/auth/register', userData)
                .then(function(response) {
                    return response.data.data;
                })
                .catch(handleError);
        }

        function logout() {
            return $http.post(APP_CONFIG.API_BASE_URL + '/auth/logout')
                .then(function(response) {
                    // Clear all auth cookies
                    $cookies.remove(APP_CONFIG.TOKEN_KEY);
                    $cookies.remove(APP_CONFIG.REFRESH_TOKEN_KEY);
                    $cookies.remove(APP_CONFIG.USER_KEY);
                    return response.data;
                })
                .catch(function(error) {
                    // Clear cookies even if API call fails
                    $cookies.remove(APP_CONFIG.TOKEN_KEY);
                    $cookies.remove(APP_CONFIG.REFRESH_TOKEN_KEY);
                    $cookies.remove(APP_CONFIG.USER_KEY);
                    return $q.reject(error);
                });
        }

        function isAuthenticated() {
            var token = $cookies.get(APP_CONFIG.TOKEN_KEY);
            return !!token;
        }

        function getCurrentUser() {
            var userStr = $cookies.get(APP_CONFIG.USER_KEY);
            if (userStr) {
                try {
                    return JSON.parse(userStr);
                } catch (e) {
                    return null;
                }
            }
            return null;
        }

        function refreshToken() {
            var refreshToken = $cookies.get(APP_CONFIG.REFRESH_TOKEN_KEY);
            if (!refreshToken) {
                return $q.reject({ message: 'No refresh token available' });
            }

            return $http.post(APP_CONFIG.API_BASE_URL + '/auth/refresh-token', {
                refreshToken: refreshToken
            })
            .then(function(response) {
                var data = response.data.data;
                
                var expires = new Date();
                expires.setDate(expires.getDate() + 30);
                
                $cookies.put(APP_CONFIG.TOKEN_KEY, data.accessToken, { expires: expires });
                $cookies.put(APP_CONFIG.REFRESH_TOKEN_KEY, data.refreshToken, { expires: expires });
                
                return data;
            })
            .catch(function(error) {
                // Clear tokens on refresh failure
                logout();
                return $q.reject(error);
            });
        }

        function updateProfile(profileData) {
            return $http.put(APP_CONFIG.API_BASE_URL + '/auth/profile', profileData)
                .then(function(response) {
                    var user = response.data.data;
                    $cookies.put(APP_CONFIG.USER_KEY, JSON.stringify(user));
                    return user;
                })
                .catch(handleError);
        }

        function changePassword(passwordData) {
            return $http.post(APP_CONFIG.API_BASE_URL + '/auth/change-password', passwordData)
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function handleError(error) {
            // Preserve the full error data from backend
            var errorResponse = {
                data: {},
                status: error.status || 500
            };

            if (error.data) {
                // If backend sends validation details, preserve them
                if (error.data.details) {
                    errorResponse.data.details = error.data.details;
                }

                // Extract message from various possible formats
                if (error.data.message) {
                    errorResponse.data.message = error.data.message;
                } else if (error.data.error) {
                    errorResponse.data.message = error.data.error;
                } else if (typeof error.data === 'string') {
                    errorResponse.data.message = error.data;
                } else {
                    errorResponse.data.message = 'An unexpected error occurred';
                }
            } else {
                errorResponse.data.message = error.message || 'Network error. Please check your connection.';
            }

            return $q.reject(errorResponse);
        }
    }
})();
