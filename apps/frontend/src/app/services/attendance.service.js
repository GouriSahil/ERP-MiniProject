(function() {
    'use strict';

    angular
        .module('erpApp')
        .factory('AttendanceService', AttendanceService);

    AttendanceService.$inject = ['$http', '$q', 'APP_CONFIG'];

    function AttendanceService($http, $q, APP_CONFIG) {
        var baseUrl = APP_CONFIG.API_BASE_URL + '/attendance';

        var service = {
            markBulk: markBulk,
            list: list,
            getBySession: getBySession,
            getByStudent: getByStudent,
            getStats: getStats,
            getTrends: getTrends,
            getLowAttendance: getLowAttendance,
            exportCsv: exportCsv
        };

        return service;

        function markBulk(data) {
            return $http.post(baseUrl + '/bulk', data)
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function list(params) {
            return $http.get(baseUrl, { params: params })
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function getBySession(sessionId) {
            return $http.get(baseUrl + '/session/' + sessionId)
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

        function getStats(params) {
            return $http.get(baseUrl + '/stats', { params: params })
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function getTrends(params) {
            return $http.get(baseUrl + '/trends', { params: params })
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function getLowAttendance(params) {
            return $http.get(baseUrl + '/low', { params: params })
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function exportCsv(params) {
            return $http.get(baseUrl + '/export', { params: params, responseType: 'blob' })
                .then(function(response) {
                    return response.data;
                })
                .catch(handleError);
        }

        function handleError(error) {
            var errorMessage = 'An error occurred with the attendance service';
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
