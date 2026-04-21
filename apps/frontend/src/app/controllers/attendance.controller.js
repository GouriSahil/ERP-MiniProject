(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('AttendanceController', AttendanceController);

    AttendanceController.$inject = [
        '$scope', '$location', '$routeParams',
        'AuthService', 'AttendanceService', 'SessionService', 'EnrollmentService'
    ];

    function AttendanceController($scope, $location, $routeParams, AuthService, AttendanceService, SessionService, EnrollmentService) {
        var vm = this;

        // ── Shared state ──────────────────────────────────────
        vm.isLoading = true;
        vm.error = null;
        vm.currentUser = AuthService.getCurrentUser();

        // Access control
        vm.canMark = (function() {
            if (!vm.currentUser) return false;
            var role = String(vm.currentUser.role).toLowerCase();
            return role === 'faculty' || role === 'admin' || role === 'super_admin' || role === 'dept_head' || role === 'admin';
        })();

        // ── Mark View state ───────────────────────────────────
        vm.session = null;
        vm.enrolledStudents = [];
        vm.attendanceRecords = {}; // studentId -> { status, remarks }
        vm.isSaving = false;

        // ── History View state ────────────────────────────────
        vm.history = [];
        vm.filterSession = '';
        vm.filterDate = null;

        // ── Dashboard state ───────────────────────────────────
        vm.stats = {
            percentage: 0,
            presentCount: 0,
            absentCount: 0,
            totalCount: 0
        };
        vm.trends = [];

        // ── Public methods ────────────────────────────────────
        vm.markAll = markAll;
        vm.saveAttendance = saveAttendance;
        vm.navigateBack = navigateBack;
        vm.formatDate = formatDate;
        vm.formatTime = formatTime;

        // ── Initialization ────────────────────────────────────
        init();

        function init() {
            if (!vm.currentUser) {
                $location.path('/login');
                return;
            }

            var path = $location.path();

            if (path.indexOf('/attendance/mark/') !== -1 && $routeParams.sessionId) {
                loadMarkingView($routeParams.sessionId);
            } else if (path === '/attendance/history') {
                loadHistory();
            } else if (path === '/attendance/my') {
                loadStudentDashboard();
            } else {
                vm.isLoading = false;
            }
        }

        // ── Mark Attendance ───────────────────────────────────

        function loadMarkingView(sessionId) {
            vm.isLoading = true;
            vm.error = null;

            // 1. Load Session Info
            SessionService.getById(sessionId)
                .then(function(response) {
                    vm.session = response.data;
                    
                    // 2. Load Enrolled Students for this Offering
                    return EnrollmentService.getByOffering(vm.session.offeringId._id || vm.session.offeringId);
                })
                .then(function(response) {
                    var allEnrollments = response.data || [];
                    
                    if (vm.currentUser.role === 'faculty' && vm.currentUser.departmentId) {
                        var facDeptId = typeof vm.currentUser.departmentId === 'object' ? vm.currentUser.departmentId._id : vm.currentUser.departmentId;
                        
                        vm.enrolledStudents = allEnrollments.filter(function(enrollment) {
                            var stuDeptId = null;
                            if (enrollment.studentId && enrollment.studentId.departmentId) {
                                stuDeptId = typeof enrollment.studentId.departmentId === 'object' ? enrollment.studentId.departmentId._id : enrollment.studentId.departmentId;
                            }
                            return String(stuDeptId) === String(facDeptId);
                        });
                    } else {
                        vm.enrolledStudents = allEnrollments;
                    }
                    
                    // 3. Check for existing attendance
                    return AttendanceService.getBySession(sessionId);
                })
                .then(function(response) {
                    var existing = response.data || [];
                    
                    // Initialize records
                    vm.enrolledStudents.forEach(function(enrollment) {
                        var studentId = enrollment.studentId._id || enrollment.studentId;
                        var existingRecord = existing.find(function(r) { 
                            return (r.studentId._id || r.studentId) === studentId; 
                        });
                        
                        vm.attendanceRecords[studentId] = {
                            status: existingRecord ? existingRecord.status : 'present',
                            remarks: existingRecord ? existingRecord.remarks : ''
                        };
                    });
                    
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to initialize marking view';
                });
        }

        function markAll(status) {
            vm.enrolledStudents.forEach(function(enrollment) {
                var studentId = enrollment.studentId._id || enrollment.studentId;
                vm.attendanceRecords[studentId].status = status;
            });
        }

        function saveAttendance() {
            if (vm.isSaving) return;
            vm.isSaving = true;

            var records = vm.enrolledStudents.map(function(enrollment) {
                var studentId = enrollment.studentId._id || enrollment.studentId;
                return {
                    studentId: studentId,
                    status: vm.attendanceRecords[studentId].status,
                    remarks: vm.attendanceRecords[studentId].remarks
                };
            });

            var payload = {
                sessionId: vm.session._id,
                records: records
            };

            AttendanceService.markBulk(payload)
                .then(function() {
                    vm.isSaving = false;
                    Swal.fire({
                        icon: 'success',
                        title: 'Attendance Saved',
                        text: 'Participation records updated successfully.',
                        timer: 2000,
                        showConfirmButton: false,
                        background: '#0f1425',
                        color: '#F5F7FF'
                    });
                    $location.path('/sessions');
                })
                .catch(function(error) {
                    vm.isSaving = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to save attendance';
                });
        }

        // ── History ───────────────────────────────────────────

        function loadHistory() {
            vm.isLoading = true;
            AttendanceService.list({ limit: 100 })
                .then(function(response) {
                    vm.history = response.data || [];
                    vm.isLoading = false;
                });
        }

        // ── Student Dashboard ────────────────────────────────

        function loadStudentDashboard() {
            vm.isLoading = true;
            // Assuming current user is a student or we have their student ID
            // For now, let's just get generic stats if studentId isn't available
            AttendanceService.getStats()
                .then(function(response) {
                    vm.stats = response.data || vm.stats;
                    return AttendanceService.getTrends();
                })
                .then(function(response) {
                    vm.trends = response.data || [];
                    vm.isLoading = false;
                })
                .catch(function() {
                    vm.isLoading = false;
                });
        }

        // ── Helpers ───────────────────────────────────────────

        function navigateBack() {
            $location.path('/sessions');
        }

        function formatDate(dateValue) {
            if (!dateValue) return '';
            var d = new Date(dateValue);
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }

        function formatTime(timeValue) {
            return timeValue || '---';
        }
    }
})();
