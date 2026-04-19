(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('NavigationController', NavigationController);

    NavigationController.$inject = ['$location', '$http', '$q', 'APP_CONFIG'];

    function NavigationController($location, $http, $q, APP_CONFIG) {
        var vm = this;
        var path = $location.path();

        var sectionMeta = {
            '/departments': { title: 'Departments', icon: 'fas fa-building' },
            '/courses': { title: 'Courses', icon: 'fas fa-book' },
            '/terms': { title: 'Terms', icon: 'fas fa-calendar-alt' },
            '/course-offerings': { title: 'Course Offerings', icon: 'fas fa-layer-group' },
            '/sessions': { title: 'Sessions', icon: 'fas fa-calendar-check' },
            '/students': { title: 'Students', icon: 'fas fa-user-graduate' },
            '/faculty': { title: 'Faculty', icon: 'fas fa-chalkboard-teacher' },
            '/enrollments': { title: 'Enrollments', icon: 'fas fa-clipboard-check' },
            '/attendance': { title: 'Attendance', icon: 'fas fa-user-check' },
            '/reports': { title: 'Reports', icon: 'fas fa-chart-bar' },
            '/audit-logs': { title: 'Audit Logs', icon: 'fas fa-history' },
            '/settings': { title: 'Settings', icon: 'fas fa-cog' }
        };

        vm.section = getCurrentSection();
        vm.currentPath = path;
        vm.quickAction = getQuickAction();
        vm.clearQuickAction = clearQuickAction;
        vm.quickForms = {
            attendance: {
                loading: false,
                submitting: false,
                error: null,
                sessions: [],
                students: [],
                selectedSessionId: '',
                selectedStudentId: '',
                status: 'present',
                remarks: ''
            },
            enrollment: {
                loading: false,
                submitting: false,
                error: null,
                offerings: [],
                students: [],
                selectedOfferingId: '',
                selectedStudentId: ''
            }
        };

        vm.loadAttendanceQuickData = loadAttendanceQuickData;
        vm.submitQuickAttendance = submitQuickAttendance;
        vm.loadEnrollmentQuickData = loadEnrollmentQuickData;
        vm.submitQuickEnrollment = submitQuickEnrollment;
        vm.isQuickActionActive = isQuickActionActive;

        init();

        function init() {
            if (path === '/attendance' && isQuickActionActive('mark-attendance')) {
                loadAttendanceQuickData();
            }
            if (path === '/enrollments' && isQuickActionActive('create-enrollment')) {
                loadEnrollmentQuickData();
            }
        }

        function getCurrentSection() {
            var path = $location.path();
            var section = sectionMeta[path];

            if (section) {
                return section;
            }

            return {
                title: 'Module',
                icon: 'fas fa-puzzle-piece'
            };
        }

        function getQuickAction() {
            var action = $location.search().quickAction;
            if (action === 'mark-attendance') {
                return {
                    title: 'Quick Attendance Mark',
                    description: 'Start attendance marking for the nearest session. This shortcut came from Dashboard.',
                    actionText: 'Open Attendance Marking',
                    icon: 'fas fa-user-check'
                };
            }

            if (action === 'create-enrollment') {
                return {
                    title: 'Quick Enrollment',
                    description: 'Start a new enrollment flow from the dashboard shortcut.',
                    actionText: 'Open Enrollment Form',
                    icon: 'fas fa-layer-group'
                };
            }

            return null;
        }

        function clearQuickAction() {
            $location.search('quickAction', null);
            $location.search('from', null);
        }

        function isQuickActionActive(expected) {
            var action = $location.search().quickAction;
            return action === expected;
        }

        function loadAttendanceQuickData() {
            vm.quickForms.attendance.loading = true;
            vm.quickForms.attendance.error = null;

            var today = new Date();
            var dateFrom = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
            var dateTo = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14).toISOString();

            $q.all([
                safeGet(APP_CONFIG.API_BASE_URL + '/sessions', { page: 1, limit: 50, dateFrom: dateFrom, dateTo: dateTo }),
                safeGet(APP_CONFIG.API_BASE_URL + '/students', { page: 1, limit: 100 })
            ]).then(function(results) {
                var sessionsResp = results[0];
                var studentsResp = results[1];

                vm.quickForms.attendance.sessions = extractArray(sessionsResp);
                vm.quickForms.attendance.students = extractArray(studentsResp);

                if (!vm.quickForms.attendance.selectedSessionId && vm.quickForms.attendance.sessions.length > 0) {
                    vm.quickForms.attendance.selectedSessionId = vm.quickForms.attendance.sessions[0]._id;
                }
                if (!vm.quickForms.attendance.selectedStudentId && vm.quickForms.attendance.students.length > 0) {
                    vm.quickForms.attendance.selectedStudentId = vm.quickForms.attendance.students[0]._id;
                }
            }).catch(function(error) {
                vm.quickForms.attendance.error = getErrorMessage(error, 'Unable to load quick attendance data');
            }).finally(function() {
                vm.quickForms.attendance.loading = false;
            });
        }

        function submitQuickAttendance() {
            var form = vm.quickForms.attendance;
            if (!form.selectedSessionId || !form.selectedStudentId) {
                form.error = 'Session and student are required.';
                return;
            }

            form.submitting = true;
            form.error = null;

            $http.post(APP_CONFIG.API_BASE_URL + '/attendance', {
                sessionId: form.selectedSessionId,
                studentId: form.selectedStudentId,
                status: form.status || 'present',
                remarks: form.remarks || ''
            }).then(function() {
                Swal.fire({
                    icon: 'success',
                    title: 'Attendance marked',
                    text: 'Quick attendance entry created successfully.'
                });
                form.remarks = '';
                clearQuickAction();
            }).catch(function(error) {
                form.error = getErrorMessage(error, 'Failed to mark attendance');
            }).finally(function() {
                form.submitting = false;
            });
        }

        function loadEnrollmentQuickData() {
            vm.quickForms.enrollment.loading = true;
            vm.quickForms.enrollment.error = null;

            $q.all([
                safeGet(APP_CONFIG.API_BASE_URL + '/offerings', { page: 1, limit: 100 }),
                safeGet(APP_CONFIG.API_BASE_URL + '/students', { page: 1, limit: 100 })
            ]).then(function(results) {
                var offeringsResp = results[0];
                var studentsResp = results[1];

                vm.quickForms.enrollment.offerings = extractArray(offeringsResp);
                vm.quickForms.enrollment.students = extractArray(studentsResp);

                if (!vm.quickForms.enrollment.selectedOfferingId && vm.quickForms.enrollment.offerings.length > 0) {
                    vm.quickForms.enrollment.selectedOfferingId = vm.quickForms.enrollment.offerings[0]._id;
                }
                if (!vm.quickForms.enrollment.selectedStudentId && vm.quickForms.enrollment.students.length > 0) {
                    vm.quickForms.enrollment.selectedStudentId = vm.quickForms.enrollment.students[0]._id;
                }
            }).catch(function(error) {
                vm.quickForms.enrollment.error = getErrorMessage(error, 'Unable to load quick enrollment data');
            }).finally(function() {
                vm.quickForms.enrollment.loading = false;
            });
        }

        function submitQuickEnrollment() {
            var form = vm.quickForms.enrollment;
            if (!form.selectedOfferingId || !form.selectedStudentId) {
                form.error = 'Offering and student are required.';
                return;
            }

            form.submitting = true;
            form.error = null;

            $http.post(APP_CONFIG.API_BASE_URL + '/enrollments', {
                offeringId: form.selectedOfferingId,
                studentId: form.selectedStudentId
            }).then(function() {
                Swal.fire({
                    icon: 'success',
                    title: 'Enrollment created',
                    text: 'Student enrolled successfully via quick action.'
                });
                clearQuickAction();
            }).catch(function(error) {
                form.error = getErrorMessage(error, 'Failed to create enrollment');
            }).finally(function() {
                form.submitting = false;
            });
        }

        function safeGet(url, params) {
            return $http.get(url, { params: params }).then(function(response) {
                return response.data;
            });
        }

        function extractArray(payload) {
            if (!payload) return [];
            if (Array.isArray(payload.data)) return payload.data;
            if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
            if (payload.data && Array.isArray(payload.data.users)) return payload.data.users;
            return [];
        }

        function getErrorMessage(error, fallback) {
            if (error && error.data && error.data.message) return error.data.message;
            if (error && error.data && error.data.error) return error.data.error;
            if (error && error.message) return error.message;
            return fallback;
        }
    }
})();
