(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('FacultyController', FacultyController);

    FacultyController.$inject = [
        '$scope', '$location', '$routeParams',
        'AuthService', 'FacultyService', 'DepartmentService'
    ];

    function FacultyController($scope, $location, $routeParams, AuthService, FacultyService, DepartmentService) {
        var vm = this;

        // ── Shared state ──────────────────────────────────────
        vm.isLoading = true;
        vm.error = null;
        vm.currentUser = AuthService.getCurrentUser();
        vm.departments = [];

        // Role-based permission: only admin roles can create/edit/delete
        vm.canManage = (function() {
            if (!vm.currentUser) return false;
            var role = String(vm.currentUser.role).toLowerCase();
            return role === 'admin' || role === 'super_admin' || role === 'admin' || role === 'dept_head';
        })();

        // ── List view state ───────────────────────────────────
        vm.facultyList = [];
        vm.searchQuery = '';
        vm.filterDept = '';
        vm.sortField = 'name';
        vm.sortDirection = 'asc';
        vm.pagination = {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0
        };

        // ── Form view state ───────────────────────────────────
        vm.faculty = {
            userId: {
                name: '',
                email: '',
                password: ''
            },
            departmentId: '',
            specialization: '',
            designation: 'Assistant Professor'
        };
        vm.isEditing = false;
        vm.isSaving = false;

        // ── Public methods ────────────────────────────────────
        vm.search = search;
        vm.changePage = changePage;
        vm.sortBy = sortBy;
        vm.confirmDelete = confirmDelete;
        vm.save = save;
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

            // Redirect students from faculty management
            var role = String(vm.currentUser.role).toLowerCase();
            if (role === 'student') {
                $location.path('/dashboard');
                return;
            }

            loadDepartments();

            var path = $location.path();

            if (path === '/faculty/create') {
                vm.isEditing = false;
                vm.isLoading = false;
            } else if ($routeParams.id && path.indexOf('/edit') !== -1) {
                vm.isEditing = true;
                loadFacultyForEdit($routeParams.id);
            } else if ($routeParams.id) {
                loadFacultyDetail($routeParams.id);
            } else {
                loadFaculty();
            }
        }

        // ── Lookups ───────────────────────────────────────────

        function loadDepartments() {
            DepartmentService.list({ limit: 100 })
                .then(function(response) {
                    vm.departments = response.data || [];
                });
        }

        // ── List ──────────────────────────────────────────────

        function loadFaculty() {
            vm.isLoading = true;
            vm.error = null;

            var params = {
                page: vm.pagination.page,
                limit: vm.pagination.limit,
                sortBy: vm.sortField,
                sortOrder: vm.sortDirection
            };

            if (vm.searchQuery) params.search = vm.searchQuery.trim();
            if (vm.filterDept) params.departmentId = vm.filterDept;

            FacultyService.list(params)
                .then(function(response) {
                    vm.facultyList = response.data || [];
                    if (response.pagination) {
                        vm.pagination.total = response.pagination.total || 0;
                        vm.pagination.totalPages = response.pagination.totalPages || 0;
                        vm.pagination.page = response.pagination.page || 1;
                    }
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load faculty members';
                });
        }

        function search() {
            vm.pagination.page = 1;
            loadFaculty();
        }

        function changePage(newPage) {
            if (newPage < 1 || newPage > vm.pagination.totalPages) return;
            vm.pagination.page = newPage;
            loadFaculty();
        }

        function sortBy(field) {
            if (vm.sortField === field) {
                vm.sortDirection = vm.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                vm.sortField = field;
                vm.sortDirection = 'asc';
            }
            vm.pagination.page = 1;
            loadFaculty();
        }

        // ── Detail ────────────────────────────────────────────

        function loadFacultyDetail(id) {
            vm.isLoading = true;
            vm.error = null;

            FacultyService.getById(id)
                .then(function(response) {
                    vm.faculty = response.data || {};
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load faculty details';
                });
        }

        // ── Form (Create / Edit) ─────────────────────────────

        function loadFacultyForEdit(id) {
            vm.isLoading = true;
            vm.error = null;

            FacultyService.getById(id)
                .then(function(response) {
                    var f = response.data || {};
                    vm.faculty = {
                        userId: {
                            name: f.userId.name || '',
                            email: f.userId.email || ''
                        },
                        departmentId: f.departmentId._id || f.departmentId || '',
                        specialization: f.specialization || '',
                        designation: f.designation || 'Assistant Professor'
                    };
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load faculty member';
                });
        }

        function save() {
            if (vm.isSaving) return;
            vm.isSaving = true;
            vm.error = null;

            var promise;
            if (vm.isEditing) {
                // For update, we usually don't send nested user data in the same way or it's handled by backend
                var updateData = {
                    name: vm.faculty.userId.name,
                    departmentId: vm.faculty.departmentId,
                    specialization: vm.faculty.specialization,
                    designation: vm.faculty.designation
                };
                promise = FacultyService.update($routeParams.id, updateData);
            } else {
                var createData = {
                    name: vm.faculty.userId.name,
                    email: vm.faculty.userId.email,
                    password: vm.faculty.userId.password,
                    departmentId: vm.faculty.departmentId,
                    specialization: vm.faculty.specialization,
                    designation: vm.faculty.designation
                };
                promise = FacultyService.create(createData);
            }

            promise
                .then(function() {
                    vm.isSaving = false;
                    Swal.fire({
                        icon: 'success',
                        title: vm.isEditing ? 'Faculty updated' : 'Faculty created',
                        text: 'Faculty member "' + vm.faculty.userId.name + '" saved successfully.',
                        timer: 2000,
                        showConfirmButton: false,
                        background: '#0f1425',
                        color: '#F5F7FF'
                    });
                    $location.path('/faculty');
                })
                .catch(function(error) {
                    vm.isSaving = false;
                    var errorMsg = (error && error.data && error.data.error) || (error && error.data && error.data.message) || 'Failed to save faculty member';
                    vm.error = errorMsg;
                    Swal.fire({
                        icon: 'error',
                        title: 'Registration Failed',
                        text: errorMsg,
                        background: '#0f1425',
                        color: '#F5F7FF'
                    });
                });
        }

        // ── Delete ────────────────────────────────────────────

        function confirmDelete(id, name) {
            if (!id && vm.faculty) {
                id = vm.faculty._id;
                name = vm.faculty.userId.name;
            }
            if (!id) return;

            Swal.fire({
                title: 'Delete faculty member?',
                text: 'Are you sure you want to remove "' + (name || 'this member') + '"? This will also affect their associated user account.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Delete',
                confirmButtonColor: '#ef4444',
                cancelButtonText: 'Cancel',
                background: '#0f1425',
                color: '#F5F7FF'
            }).then(function(result) {
                if (!result.isConfirmed) return;

                FacultyService.remove(id)
                    .then(function() {
                        Swal.fire({
                            icon: 'success',
                            title: 'Removed',
                            text: 'Faculty member removed successfully.',
                            timer: 2000,
                            showConfirmButton: false,
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                        if ($routeParams.id) {
                            $location.path('/faculty');
                            $scope.$apply();
                        } else {
                            loadFaculty();
                        }
                    })
                    .catch(function(error) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Delete failed',
                            text: (error && error.data && error.data.message) || 'Could not remove faculty member.',
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                    });
            });
        }

        // ── Helpers ───────────────────────────────────────────

        function navigateBack() {
            $location.path('/faculty');
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
