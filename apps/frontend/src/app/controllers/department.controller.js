(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('DepartmentController', DepartmentController);

    DepartmentController.$inject = [
        '$scope', '$location', '$routeParams',
        'AuthService', 'DepartmentService'
    ];

    function DepartmentController($scope, $location, $routeParams, AuthService, DepartmentService) {
        var vm = this;

        // ── Shared state ──────────────────────────────────────
        vm.isLoading = true;
        vm.error = null;
        vm.currentUser = AuthService.getCurrentUser();

        // Role-based permission: only admin / super_admin can create/edit/delete
        vm.canManage = (function() {
            if (!vm.currentUser) return false;
            var role = String(vm.currentUser.role).toLowerCase();
            return role === 'admin' || role === 'super_admin' || role === 'admin';
        })();

        // ── List view state ───────────────────────────────────
        vm.departments = [];
        vm.searchQuery = '';
        vm.sortField = 'name';
        vm.sortDirection = 'asc';
        vm.pagination = {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0
        };

        // ── Form view state ───────────────────────────────────
        vm.department = { name: '', code: '' };
        vm.isEditing = false;
        vm.isSaving = false;

        // ── Detail view state ─────────────────────────────────
        vm.faculty = [];
        vm.courses = [];

        // ── Public methods ────────────────────────────────────
        vm.search = search;
        vm.changePage = changePage;
        vm.sortBy = sortBy;
        vm.confirmDelete = confirmDelete;
        vm.save = save;
        vm.navigateBack = navigateBack;
        vm.navigateTo = navigateTo;
        vm.uppercaseCode = uppercaseCode;
        vm.formatDate = formatDate;

        // ── Initialization ────────────────────────────────────
        init();

        function init() {
            if (!vm.currentUser) {
                $location.path('/login');
                return;
            }

            // Restrict view access: Hide from student and faculty roles
            var role = String(vm.currentUser.role).toLowerCase();
            if (role === 'student' || role === 'faculty') {
                $location.path('/dashboard');
                return;
            }

            var path = $location.path();

            if (path === '/departments/create') {
                // Create mode
                vm.isEditing = false;
                vm.isLoading = false;
            } else if ($routeParams.id && path.indexOf('/edit') !== -1) {
                // Edit mode
                vm.isEditing = true;
                loadDepartmentForEdit($routeParams.id);
            } else if ($routeParams.id) {
                // Detail mode
                loadDepartmentDetail($routeParams.id);
            } else {
                // List mode
                loadDepartments();
            }
        }

        // ── List ──────────────────────────────────────────────

        function loadDepartments() {
            vm.isLoading = true;
            vm.error = null;

            var params = {
                page: vm.pagination.page,
                limit: vm.pagination.limit,
                sortBy: vm.sortField,
                sortOrder: vm.sortDirection
            };

            if (vm.searchQuery && vm.searchQuery.trim()) {
                params.search = vm.searchQuery.trim();
            }

            DepartmentService.list(params)
                .then(function(response) {
                    vm.departments = response.data || [];
                    if (response.pagination) {
                        vm.pagination.total = response.pagination.total || 0;
                        vm.pagination.totalPages = response.pagination.totalPages || 0;
                        vm.pagination.page = response.pagination.page || 1;
                    }
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load departments';
                });
        }

        function search() {
            vm.pagination.page = 1;
            loadDepartments();
        }

        function changePage(newPage) {
            if (newPage < 1 || newPage > vm.pagination.totalPages) return;
            vm.pagination.page = newPage;
            loadDepartments();
        }

        function sortBy(field) {
            if (vm.sortField === field) {
                vm.sortDirection = vm.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                vm.sortField = field;
                vm.sortDirection = 'asc';
            }
            vm.pagination.page = 1;
            loadDepartments();
        }

        // ── Detail ────────────────────────────────────────────

        function loadDepartmentDetail(id) {
            vm.isLoading = true;
            vm.error = null;

            DepartmentService.getById(id)
                .then(function(response) {
                    vm.department = response.data || {};
                    vm.isLoading = false;
                    // Load related data in parallel
                    loadFaculty(id);
                    loadCourses(id);
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load department';
                });
        }

        function loadFaculty(id) {
            DepartmentService.getFaculty(id)
                .then(function(response) {
                    vm.faculty = response.data || [];
                })
                .catch(function() {
                    vm.faculty = [];
                });
        }

        function loadCourses(id) {
            DepartmentService.getCourses(id)
                .then(function(response) {
                    vm.courses = response.data || [];
                })
                .catch(function() {
                    vm.courses = [];
                });
        }

        // ── Form (Create / Edit) ─────────────────────────────

        function loadDepartmentForEdit(id) {
            vm.isLoading = true;
            vm.error = null;

            DepartmentService.getById(id)
                .then(function(response) {
                    var dept = response.data || {};
                    vm.department = {
                        name: dept.name || '',
                        code: dept.code || ''
                    };
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load department';
                });
        }

        function save() {
            if (vm.isSaving) return;
            vm.isSaving = true;
            vm.error = null;

            var data = {
                name: vm.department.name,
                code: (vm.department.code || '').toUpperCase()
            };

            var promise;
            if (vm.isEditing) {
                promise = DepartmentService.update($routeParams.id, data);
            } else {
                promise = DepartmentService.create(data);
            }

            promise
                .then(function() {
                    vm.isSaving = false;
                    Swal.fire({
                        icon: 'success',
                        title: vm.isEditing ? 'Department updated' : 'Department created',
                        text: 'Department "' + data.name + '" has been ' + (vm.isEditing ? 'updated' : 'created') + ' successfully.',
                        timer: 2000,
                        showConfirmButton: false,
                        background: '#0f1425',
                        color: '#F5F7FF'
                    });
                    $location.path('/departments');
                })
                .catch(function(error) {
                    vm.isSaving = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to save department';
                });
        }

        function uppercaseCode() {
            if (vm.department.code) {
                vm.department.code = vm.department.code.toUpperCase();
            }
        }

        // ── Delete ────────────────────────────────────────────

        function confirmDelete(id, name) {
            // For detail page: use vm.department
            if (!id && vm.department) {
                id = vm.department._id;
                name = vm.department.name;
            }
            if (!id) return;

            Swal.fire({
                title: 'Delete department?',
                html: 'Are you sure you want to delete <strong>' + (name || 'this department') + '</strong>?<br>This action cannot be undone.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Delete',
                confirmButtonColor: '#ef4444',
                cancelButtonText: 'Cancel',
                background: '#0f1425',
                color: '#F5F7FF'
            }).then(function(result) {
                if (!result.isConfirmed) return;

                DepartmentService.remove(id)
                    .then(function() {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted',
                            text: '"' + (name || 'Department') + '" has been removed.',
                            timer: 2000,
                            showConfirmButton: false,
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                        // If on detail page, navigate back to list
                        if ($routeParams.id) {
                            $location.path('/departments');
                            $scope.$apply();
                        } else {
                            loadDepartments();
                        }
                    })
                    .catch(function(error) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Delete failed',
                            text: (error && error.data && error.data.message) || 'Could not delete department. It may have associated records.',
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                    });
            });
        }

        // ── Navigation helpers ────────────────────────────────

        function navigateBack() {
            $location.path('/departments');
        }

        function navigateTo(path) {
            $location.path(path);
        }

        function formatDate(dateValue) {
            if (!dateValue) return '';
            var d = new Date(dateValue);
            if (isNaN(d.getTime())) return '';
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    }
})();
