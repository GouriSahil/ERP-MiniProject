(function() {
    'use strict';

    angular
        .module('erpApp')
        .factory('ReportService', ReportService);

    ReportService.$inject = ['$http', '$q', 'APP_CONFIG'];

    function ReportService($http, $q, APP_CONFIG) {
        var baseUrl = APP_CONFIG.API_BASE_URL + '/reports';

        var service = {
            getCourseEnrollment: getCourseEnrollment,
            getStudentAttendance: getStudentAttendance,
            getFacultyWorkload: getFacultyWorkload,
            getEnrollmentStatus: getEnrollmentStatus,
            getDepartmentSummary: getDepartmentSummary,
            getTermOverview: getTermOverview,
            getLowAttendance: getLowAttendance,
            getChartsData: getChartsData
        };

        return service;

        function getCourseEnrollment(params) {
            return $http.get(baseUrl + '/course-enrollment', { params: params })
                .then(function(response) { return response.data; })
                .catch(handleError);
        }

        function getStudentAttendance(params) {
            return $http.get(baseUrl + '/student-attendance', { params: params })
                .then(function(response) { return response.data; })
                .catch(handleError);
        }

        function getFacultyWorkload(params) {
            return $http.get(baseUrl + '/faculty-workload', { params: params })
                .then(function(response) { return response.data; })
                .catch(handleError);
        }

        function getEnrollmentStatus(params) {
            return $http.get(baseUrl + '/enrollment-status', { params: params })
                .then(function(response) { return response.data; })
                .catch(handleError);
        }

        function getDepartmentSummary(params) {
            return $http.get(baseUrl + '/department/summary', { params: params })
                .then(function(response) { return response.data; })
                .catch(handleError);
        }

        function getTermOverview(termId) {
            return $http.get(baseUrl + '/term/' + termId + '/overview')
                .then(function(response) { return response.data; })
                .catch(handleError);
        }

        function getLowAttendance(params) {
            return $http.get(baseUrl + '/low-attendance', { params: params })
                .then(function(response) { return response.data; })
                .catch(handleError);
        }

        function getChartsData(chartType, params) {
            return $http.get(baseUrl + '/charts/' + chartType, { params: params })
                .then(function(response) { return response.data; })
                .catch(handleError);
        }

        function handleError(error) {
            var errorMessage = 'An error occurred with the report service';
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
