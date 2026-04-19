(function() {
    'use strict';

    angular
        .module('erpApp')
        .factory('FacultyService', FacultyService);

    FacultyService.$inject = ['$http', '$q', 'APP_CONFIG'];

    function FacultyService($http, $q, APP_CONFIG) {
        var baseUrl = APP_CONFIG.API_BASE_URL + '/faculty';

        var service = {
            list: list,
            getById: getById,
            create: create,
            update: update,
            remove: remove
        };

        return service;

        function list(params) {
            return $http.get(baseUrl, { params: params })
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function getById(id) {
            return $http.get(baseUrl + '/' + id)
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function create(data) {
            return $http.post(baseUrl, data)
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function update(id, data) {
            return $http.put(baseUrl + '/' + id, data)
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function remove(id) {
            return $http.delete(baseUrl + '/' + id)
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function handleError(error) {
            var errorMessage = 'An error occurred with the faculty service';
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
