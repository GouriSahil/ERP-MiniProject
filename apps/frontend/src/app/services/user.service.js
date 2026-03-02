(function() {
    'use strict';

    angular
        .module('erpApp')
        .factory('UserService', UserService);

    UserService.$inject = ['$http', '$q', 'APP_CONFIG'];
    
    function UserService($http, $q, APP_CONFIG) {
        var service = {
            getUsers: getUsers,
            getUserById: getUserById,
            createUser: createUser,
            updateUser: updateUser,
            deleteUser: deleteUser,
            getProfile: getProfile,
            updateProfile: updateProfile
        };

        return service;

        function getUsers(params) {
            return $http.get(APP_CONFIG.API_BASE_URL + '/users', { params: params })
                .then(function(response) {
                    return response.data.data;
                })
                .catch(handleError);
        }

        function getUserById(id) {
            return $http.get(APP_CONFIG.API_BASE_URL + '/users/' + id)
                .then(function(response) {
                    return response.data.data;
                })
                .catch(handleError);
        }

        function createUser(userData) {
            return $http.post(APP_CONFIG.API_BASE_URL + '/users', userData)
                .then(function(response) {
                    return response.data.data;
                })
                .catch(handleError);
        }

        function updateUser(id, userData) {
            return $http.put(APP_CONFIG.API_BASE_URL + '/users/' + id, userData)
                .then(function(response) {
                    return response.data.data;
                })
                .catch(handleError);
        }

        function deleteUser(id) {
            return $http.delete(APP_CONFIG.API_BASE_URL + '/users/' + id)
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function getProfile() {
            return $http.get(APP_CONFIG.API_BASE_URL + '/auth/profile')
                .then(function(response) {
                    return response.data.data;
                })
                .catch(handleError);
        }

        function updateProfile(profileData) {
            return $http.put(APP_CONFIG.API_BASE_URL + '/auth/profile', profileData)
                .then(function(response) {
                    return response.data.data;
                })
                .catch(handleError);
        }

        function handleError(error) {
            var errorMessage = 'An error occurred';
            
            if (error.data) {
                if (error.data.message) {
                    errorMessage = error.data.message;
                } else if (error.data.error) {
                    errorMessage = error.data.error;
                }
            }
            
            return $q.reject({
                data: { message: errorMessage },
                status: error.status
            });
        }
    }
})();
