(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('EnrollmentController', EnrollmentController);

    EnrollmentController.$inject = [
        '$scope', '$location', '$routeParams',
        'AuthService', 'EnrollmentService', 'StudentService', 'OfferingService'
    ];

    function EnrollmentController($scope, $location, $routeParams, AuthService, EnrollmentService, StudentService, OfferingService) {
        var vm = this;

        // ── Shared state ──────────────────────────────────────
        vm.isLoading = true;
        vm.error = null;
        vm.currentUser = AuthService.getCurrentUser();

        // Access control: Admins only
        vm.canManage = (function() {
            if (!vm.currentUser) return false;
            var role = String(vm.currentUser.role).toLowerCase();
            return role === 'admin' || role === 'super_admin' || role === 'admin';
        })();

        // ── List view state ───────────────────────────────────
        vm.enrollments = [];
        vm.searchQuery = '';
        vm.filterOffering = '';
        vm.filterStudent = '';
        vm.filterStatus = '';
        vm.pagination = {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0
        };

        // ── Form view state ───────────────────────────────────
        vm.enrollment = {
            studentId: '',
            offeringId: '',
            status: 'enrolled'
        };
        vm.isSaving = false;
        vm.students = [];
        vm.offerings = [];

        // ── Bulk view state ───────────────────────────────────
        vm.bulk = {
            offeringId: '',
            selectedStudentIds: [],
            results: null
        };

        // ── Public methods ────────────────────────────────────
        vm.search = search;
        vm.changePage = changePage;
        vm.confirmDrop = confirmDrop;
        vm.save = save;
        vm.saveBulk = saveBulk;
        vm.toggleStudentSelection = toggleStudentSelection;
        vm.navigateBack = navigateBack;
        vm.navigateTo = navigateTo;
        vm.formatDate = formatDate;

        // ── Initialization ────────────────────────────────────
        init();

        function init() {
            if (!vm.currentUser) {
                $location.path('/login');
                return;
            }

            // Redirect non-admins from management
            if (!vm.canManage) {
                $location.path('/dashboard');
                return;
            }

            var path = $location.path();

            if (path === '/enrollments/create') {
                loadSelectionData();
                vm.isLoading = false;
            } else if (path === '/enrollments/bulk') {
                loadSelectionData();
                vm.isLoading = false;
            } else if ($routeParams.id) {
                loadEnrollmentDetail($routeParams.id);
            } else {
                loadEnrollments();
                loadSelectionData(); // For filters
            }
        }

        function loadSelectionData() {
            StudentService.list({ limit: 1000 })
                .then(function(response) {
                    vm.students = response.data || [];
                });
            OfferingService.list({ limit: 100 })
                .then(function(response) {
                    vm.offerings = response.data || [];
                });
        }

        // ── List ──────────────────────────────────────────────

        function loadEnrollments() {
            vm.isLoading = true;
            vm.error = null;

            var params = {
                page: vm.pagination.page,
                limit: vm.pagination.limit
            };

            if (vm.filterOffering) params.offeringId = vm.filterOffering;
            if (vm.filterStudent) params.studentId = vm.filterStudent;
            if (vm.filterStatus) params.status = vm.filterStatus;

            EnrollmentService.list(params)
                .then(function(response) {
                    vm.enrollments = response.data || [];
                    if (response.pagination) {
                        vm.pagination.total = response.pagination.total || 0;
                        vm.pagination.totalPages = response.pagination.totalPages || 0;
                        vm.pagination.page = response.pagination.page || 1;
                    }
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load enrollments';
                });
        }

        function search() {
            vm.pagination.page = 1;
            loadEnrollments();
        }

        function changePage(newPage) {
            if (newPage < 1 || newPage > vm.pagination.totalPages) return;
            vm.pagination.page = newPage;
            loadEnrollments();
        }

        // ── Detail ────────────────────────────────────────────

        function loadEnrollmentDetail(id) {
            vm.isLoading = true;
            vm.error = null;

            EnrollmentService.getById(id)
                .then(function(response) {
                    vm.enrollment = response.data || {};
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load enrollment details';
                });
        }

        // ── Form (Create) ─────────────────────────────────────

        function save() {
            if (vm.isSaving) return;
            vm.isSaving = true;
            vm.error = null;

            EnrollmentService.create(vm.enrollment)
                .then(function() {
                    vm.isSaving = false;
                    Swal.fire({
                        icon: 'success',
                        title: 'Enrolled',
                        text: 'Student enrolled successfully.',
                        timer: 2000,
                        showConfirmButton: false,
                        background: '#0f1425',
                        color: '#F5F7FF'
                    });
                    $location.path('/enrollments');
                })
                .catch(function(error) {
                    vm.isSaving = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to enroll student';
                });
        }

        // ── Bulk ──────────────────────────────────────────────

        function saveBulk() {
            if (vm.isSaving) return;
            if (!vm.bulk.offeringId || vm.bulk.selectedStudentIds.length === 0) {
                vm.error = 'Please select an offering and at least one student.';
                return;
            }

            vm.isSaving = true;
            vm.error = null;

            EnrollmentService.bulkCreate(vm.bulk)
                .then(function(response) {
                    vm.isSaving = false;
                    vm.bulk.results = response.data;
                    Swal.fire({
                        icon: 'info',
                        title: 'Bulk Enrollment Complete',
                        text: 'Processed ' + vm.bulk.selectedStudentIds.length + ' students.',
                        background: '#0f1425',
                        color: '#F5F7FF'
                    });
                })
                .catch(function(error) {
                    vm.isSaving = false;
                    vm.error = (error && error.data && error.data.message) || 'Bulk enrollment failed';
                });
        }

        // ── Drop ──────────────────────────────────────────────

        function confirmDrop(id) {
            Swal.fire({
                title: 'Drop enrollment?',
                text: 'Are you sure you want to drop this student from the course?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Drop',
                confirmButtonColor: '#ef4444',
                background: '#0f1425',
                color: '#F5F7FF'
            }).then(function(result) {
                if (!result.isConfirmed) return;

                EnrollmentService.remove(id)
                    .then(function() {
                        Swal.fire({
                            icon: 'success',
                            title: 'Dropped',
                            text: 'Enrollment dropped successfully.',
                            timer: 2000,
                            showConfirmButton: false,
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                        loadEnrollments();
                    })
                    .catch(function(error) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Failed',
                            text: (error && error.data && error.data.message) || 'Could not drop enrollment.',
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                    });
            });
        }

        // ── Helpers ───────────────────────────────────────────

        function navigateBack() {
            $location.path('/enrollments');
        }

        function navigateTo(path) {
            $location.path(path);
        }

        function toggleStudentSelection(studentId) {
            var index = vm.bulk.selectedStudentIds.indexOf(studentId);
            if (index === -1) {
                vm.bulk.selectedStudentIds.push(studentId);
            } else {
                vm.bulk.selectedStudentIds.splice(index, 1);
            }
        }

        function formatDate(dateValue) {
            if (!dateValue) return '';
            var d = new Date(dateValue);
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }
    }
})();
