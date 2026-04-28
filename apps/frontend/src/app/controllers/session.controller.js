(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('SessionController', SessionController);

    SessionController.$inject = [
        '$scope', '$location', '$routeParams',
        'AuthService', 'SessionService', 'OfferingService'
    ];

    function SessionController($scope, $location, $routeParams, AuthService, SessionService, OfferingService) {
        var vm = this;

        // ── Shared state ──────────────────────────────────────
        vm.isLoading = true;
        vm.error = null;
        vm.currentUser = AuthService.getCurrentUser();

        // Access control: Faculty and Admin can manage sessions
        vm.canManage = (function() {
            if (!vm.currentUser) return false;
            var role = String(vm.currentUser.role).toLowerCase();
            return role === 'faculty' || role === 'admin' || role === 'super_admin' || role === 'dept_head' || role === 'admin';
        })();

        // Get faculty's department ID for filtering
        vm.facultyDepartmentId = (function() {
            if (!vm.currentUser || !vm.currentUser.departmentId) return null;
            return vm.currentUser.departmentId._id || vm.currentUser.departmentId;
        })();

        // ── List view state ───────────────────────────────────
        vm.sessions = [];
        vm.filterOffering = '';
        vm.pagination = {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0
        };

        // ── Form view state ───────────────────────────────────
        vm.session = {
            offeringId: '',
            date: new Date(),
            startTime: '09:00',
            endTime: '10:00',
            location: '',
            type: 'lecture',
            status: 'scheduled'
        };
        vm.isSaving = false;
        vm.offerings = [];

        // ── Public methods ────────────────────────────────────
        vm.search = search;
        vm.changePage = changePage;
        vm.confirmDelete = confirmDelete;
        vm.save = save;
        vm.navigateBack = navigateBack;
        vm.navigateTo = navigateTo;
        vm.formatDate = formatDate;
        vm.formatTime = formatTime;

        // ── Initialization ────────────────────────────────────
        init();

        function init() {
            if (!vm.currentUser) {
                $location.path('/login');
                return;
            }

            loadOfferings();

            var path = $location.path();

            if (path === '/sessions/create') {
                vm.isLoading = false;
            } else if ($routeParams.id && path.indexOf('/edit') !== -1) {
                loadSessionForEdit($routeParams.id);
            } else {
                loadSessions();
            }
        }

        function loadOfferings() {
            OfferingService.list({ limit: 100 })
                .then(function(response) {
                    vm.offerings = response.data || [];
                });
        }

        // ── List ──────────────────────────────────────────────

        function loadSessions() {
            vm.isLoading = true;
            vm.error = null;

            var params = {
                page: vm.pagination.page,
                limit: vm.pagination.limit
            };

            if (vm.filterOffering) params.offeringId = vm.filterOffering;

            SessionService.list(params)
                .then(function(response) {
                    var allSessions = response.data || [];

                    // Filter sessions by faculty's department (unless admin/super_admin)
                    if (vm.facultyDepartmentId) {
                        var role = String(vm.currentUser.role).toLowerCase();
                        if (role !== 'admin' && role !== 'super_admin') {
                            vm.sessions = allSessions.filter(function(session) {
                                var offeringDeptId = null;
                                if (session.offeringId) {
                                    // Check nested departmentId path: offeringId.courseId.departmentId
                                    if (session.offeringId.courseId && session.offeringId.courseId.departmentId) {
                                        offeringDeptId = session.offeringId.courseId.departmentId._id || session.offeringId.courseId.departmentId;
                                    }
                                    // Also check direct departmentId path (in case backend changes)
                                    else if (session.offeringId.departmentId) {
                                        offeringDeptId = session.offeringId.departmentId._id || session.offeringId.departmentId;
                                    }
                                }
                                return offeringDeptId === vm.facultyDepartmentId;
                            });
                        } else {
                            vm.sessions = allSessions;
                        }
                    } else {
                        vm.sessions = allSessions;
                    }

                    if (response.pagination) {
                        vm.pagination.total = response.pagination.total || 0;
                        vm.pagination.totalPages = response.pagination.totalPages || 0;
                        vm.pagination.page = response.pagination.page || 1;
                    }
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load sessions';
                });
        }

        function search() {
            vm.pagination.page = 1;
            loadSessions();
        }

        function changePage(newPage) {
            if (newPage < 1 || newPage > vm.pagination.totalPages) return;
            vm.pagination.page = newPage;
            loadSessions();
        }

        // ── Form (Create / Edit) ─────────────────────────────

        function loadSessionForEdit(id) {
            vm.isLoading = true;
            vm.error = null;

            SessionService.getById(id)
                .then(function(response) {
                    var s = response.data || {};
                    vm.session = {
                        offeringId: s.offeringId._id || s.offeringId,
                        date: s.date ? new Date(s.date) : new Date(),
                        startTime: s.startTime || '09:00',
                        endTime: s.endTime || '10:00',
                        location: s.location || '',
                        type: s.type || 'lecture',
                        status: s.status || 'scheduled'
                    };
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load session';
                });
        }

        function save() {
            if (vm.isSaving) return;
            vm.isSaving = true;
            vm.error = null;

            var promise;
            if ($routeParams.id) {
                promise = SessionService.update($routeParams.id, vm.session);
            } else {
                promise = SessionService.create(vm.session);
            }

            promise
                .then(function() {
                    vm.isSaving = false;
                    Swal.fire({
                        icon: 'success',
                        title: 'Session Saved',
                        text: 'Class session has been scheduled successfully.',
                        timer: 2000,
                        showConfirmButton: false,
                        background: '#0f1425',
                        color: '#F5F7FF'
                    });
                    $location.path('/sessions');
                })
                .catch(function(error) {
                    vm.isSaving = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to save session';
                });
        }

        // ── Delete ────────────────────────────────────────────

        function confirmDelete(id) {
            Swal.fire({
                title: 'Cancel session?',
                text: 'Are you sure you want to cancel and remove this session? This will delete any associated attendance records.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Cancel Session',
                confirmButtonColor: '#ef4444',
                background: '#0f1425',
                color: '#F5F7FF'
            }).then(function(result) {
                if (!result.isConfirmed) return;

                SessionService.remove(id)
                    .then(function() {
                        Swal.fire({
                            icon: 'success',
                            title: 'Cancelled',
                            text: 'Session has been removed.',
                            timer: 2000,
                            showConfirmButton: false,
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                        loadSessions();
                    })
                    .catch(function(error) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Failed',
                            text: (error && error.data && error.data.message) || 'Could not remove session.',
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                    });
            });
        }

        // ── Helpers ───────────────────────────────────────────

        function navigateBack() {
            $location.path('/sessions');
        }

        function navigateTo(path) {
            $location.path(path);
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
