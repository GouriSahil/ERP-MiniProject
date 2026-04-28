(function() {
    'use strict';

    angular
        .module('erpApp')
        .factory('EnrollmentService', EnrollmentService);

    EnrollmentService.$inject = ['$http', '$q', 'APP_CONFIG'];

    function EnrollmentService($http, $q, APP_CONFIG) {
        var baseUrl = APP_CONFIG.API_BASE_URL + '/enrollments';

        var service = {
            list: list,
            getById: getById,
            create: create,
            bulkCreate: bulkCreate,
            remove: remove,
            getByOffering: getByOffering,
            getByStudent: getByStudent,
            selfEnroll: selfEnroll,
            getAvailable: getAvailable,
            getMyEnrollments: getMyEnrollments
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

        function bulkCreate(data) {
            return $http.post(baseUrl + '/bulk', data)
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

        function getByOffering(offeringId) {
            return $http.get(baseUrl + '/offering/' + offeringId)
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function getByStudent(studentId) {
            return $http.get(baseUrl + '/student/' + studentId)
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function selfEnroll(offeringId) {
            return $http.post(baseUrl + '/self-enroll', { offeringId: offeringId })
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function getAvailable(params) {
            return $http.get(baseUrl + '/available', { params: params })
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function getMyEnrollments() {
            return $http.get(baseUrl + '/my-enrollments')
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function handleError(error) {
            var errorMessage = 'An error occurred with the enrollment service';
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
