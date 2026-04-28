(function() {
    'use strict';

    angular
        .module('erpApp')
        .factory('DepartmentService', DepartmentService);

    DepartmentService.$inject = ['$http', '$q', 'APP_CONFIG'];

    function DepartmentService($http, $q, APP_CONFIG) {
        var service = {
            list: list,
            getById: getById,
            create: create,
            update: update,
            remove: remove,
            getFaculty: getFaculty,
            getCourses: getCourses
        };

        return service;

        /**
         * List departments with pagination & search.
         * @param {Object} params - {page, limit, search, sortBy, sortOrder}
         */
        function list(params) {
            return $http.get(APP_CONFIG.API_BASE_URL + '/departments', { params: params })
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        /**
         * Get a single department by ID (includes stats).
         */
        function getById(id) {
            return $http.get(APP_CONFIG.API_BASE_URL + '/departments/' + id)
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        /**
         * Create a new department.
         * @param {Object} data - {name, code}
         */
        function create(data) {
            return $http.post(APP_CONFIG.API_BASE_URL + '/departments', data)
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        /**
         * Update an existing department.
         * @param {string} id
         * @param {Object} data - {name, code}
         */
        function update(id, data) {
            return $http.put(APP_CONFIG.API_BASE_URL + '/departments/' + id, data)
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        /**
         * Delete a department by ID.
         */
        function remove(id) {
            return $http.delete(APP_CONFIG.API_BASE_URL + '/departments/' + id)
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        /**
         * Get faculty members belonging to a department.
         */
        function getFaculty(id) {
            return $http.get(APP_CONFIG.API_BASE_URL + '/departments/' + id + '/faculty')
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        /**
         * Get courses belonging to a department.
         */
        function getCourses(id) {
            return $http.get(APP_CONFIG.API_BASE_URL + '/departments/' + id + '/courses')
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        /**
         * Normalize HTTP errors for consistent handling.
         */
        function handleError(error) {
            var errorMessage = 'An unexpected error occurred';

            if (error && error.data) {
                if (error.data.message) {
                    errorMessage = error.data.message;
                } else if (error.data.error) {
                    errorMessage = error.data.error;
                } else if (typeof error.data === 'string') {
                    errorMessage = error.data;
                }
            } else if (error && error.message) {
                errorMessage = error.message;
            }

            return $q.reject({
                data: { message: errorMessage },
                status: (error && error.status) || 500
            });
        }
    }
})();
