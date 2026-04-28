(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('CourseRegistrationController', CourseRegistrationController);

    CourseRegistrationController.$inject = [
        '$scope', '$location', '$routeParams',
        'AuthService', 'EnrollmentService', 'DepartmentService'
    ];

    function CourseRegistrationController($scope, $location, $routeParams, AuthService, EnrollmentService, DepartmentService) {
        var vm = this;

        // Shared state
        vm.isLoading = true;
        vm.error = null;
        vm.currentUser = AuthService.getCurrentUser();

        // Verify student role
        vm.isStudent = (function() {
            if (!vm.currentUser) return false;
            return String(vm.currentUser.role).toLowerCase() === 'student';
        })();

        // View state
        vm.availableCourses = [];
        vm.myEnrollments = [];
        vm.departments = [];
        vm.terms = [];
        vm.filters = {
            termId: '',
            departmentId: ''
        };
        vm.isEnrolling = false;
        vm.enrollingCourseId = null;

        // Public methods
        vm.loadAvailableCourses = loadAvailableCourses;
        vm.loadMyEnrollments = loadMyEnrollments;
        vm.enrollInCourse = enrollInCourse;
        vm.dropCourse = dropCourse;
        vm.filterCourses = filterCourses;
        vm.navigateTo = navigateTo;
        vm.formatDate = formatDate;

        // Initialization
        init();

        function init() {
            if (!vm.currentUser) {
                $location.path('/login');
                return;
            }

            if (!vm.isStudent) {
                $location.path('/dashboard');
                return;
            }

            loadDepartments();
            loadMyEnrollments();
            loadAvailableCourses();
        }

        function loadDepartments() {
            DepartmentService.list({ limit: 100 })
                .then(function(response) {
                    vm.departments = response.data || [];
                });
        }

        function loadAvailableCourses() {
            vm.isLoading = true;
            vm.error = null;

            var params = {};
            if (vm.filters.termId) params.termId = vm.filters.termId;
            if (vm.filters.departmentId) params.departmentId = vm.filters.departmentId;

            EnrollmentService.getAvailable(params)
                .then(function(response) {
                    vm.availableCourses = response.data || [];
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load available courses';
                });
        }

        function loadMyEnrollments() {
            EnrollmentService.getMyEnrollments()
                .then(function(response) {
                    vm.myEnrollments = response.data || [];
                })
                .catch(function(error) {
                    console.error('Failed to load enrollments:', error);
                });
        }

        function enrollInCourse(offeringId, courseName) {
            if (vm.isEnrolling) return;

            Swal.fire({
                title: 'Enroll in ' + courseName + '?',
                text: 'Are you sure you want to enroll in this course?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, enroll me',
                confirmButtonColor: '#3b82f6',
                background: '#0f1425',
                color: '#F5F7FF'
            }).then(function(result) {
                if (!result.isConfirmed) return;

                vm.isEnrolling = true;
                vm.enrollingCourseId = offeringId;

                EnrollmentService.selfEnroll(offeringId)
                    .then(function() {
                        vm.isEnrolling = false;
                        vm.enrollingCourseId = null;
                        Swal.fire({
                            icon: 'success',
                            title: 'Enrolled!',
                            text: 'You have been successfully enrolled.',
                            timer: 2000,
                            showConfirmButton: false,
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                        loadMyEnrollments();
                        loadAvailableCourses();
                    })
                    .catch(function(error) {
                        vm.isEnrolling = false;
                        vm.enrollingCourseId = null;
                        var errorMsg = (error && error.data && error.data.message) || 'Enrollment failed';
                        Swal.fire({
                            icon: 'error',
                            title: 'Enrollment Failed',
                            text: errorMsg,
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                    });
            });
        }

        function dropCourse(enrollmentId, courseName) {
            Swal.fire({
                title: 'Drop ' + courseName + '?',
                text: 'Are you sure you want to drop this course?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Drop Course',
                confirmButtonColor: '#ef4444',
                background: '#0f1425',
                color: '#F5F7FF'
            }).then(function(result) {
                if (!result.isConfirmed) return;

                EnrollmentService.remove(enrollmentId)
                    .then(function() {
                        Swal.fire({
                            icon: 'success',
                            title: 'Course Dropped',
                            text: 'You have dropped the course.',
                            timer: 2000,
                            showConfirmButton: false,
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                        loadMyEnrollments();
                        loadAvailableCourses();
                    })
                    .catch(function(error) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Failed',
                            text: (error && error.data && error.data.message) || 'Could not drop course',
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                    });
            });
        }

        function filterCourses() {
            loadAvailableCourses();
        }

        function navigateTo(path) {
            $location.path(path);
        }

        function formatDate(dateValue) {
            if (!dateValue) return '';
            var d = new Date(dateValue);
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }
    }
})();
