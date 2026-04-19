(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('StudentController', StudentController);

    StudentController.$inject = [
        '$scope', '$location', '$routeParams',
        'AuthService', 'StudentService', 'DepartmentService'
    ];

    function StudentController($scope, $location, $routeParams, AuthService, StudentService, DepartmentService) {
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
            return role === 'admin' || role === 'super_admin' || role === 'admin';
        })();

        // ── List view state ───────────────────────────────────
        vm.students = [];
        vm.searchQuery = '';
        vm.filterDept = '';
        vm.filterBatch = '';
        vm.sortField = 'userId.name';
        vm.sortDirection = 'asc';
        vm.pagination = {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0
        };

        // ── Form view state ───────────────────────────────────
        vm.student = {
            userId: {
                name: '',
                email: '',
                password: ''
            },
            rollNumber: '',
            departmentId: '',
            batch: '',
            semester: 1
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

            // Redirect students from student management
            var role = String(vm.currentUser.role).toLowerCase();
            if (role === 'student') {
                $location.path('/dashboard');
                return;
            }

            loadDepartments();

            var path = $location.path();

            if (path === '/students/create') {
                vm.isEditing = false;
                vm.isLoading = false;
            } else if ($routeParams.id && path.indexOf('/edit') !== -1) {
                vm.isEditing = true;
                loadStudentForEdit($routeParams.id);
            } else if ($routeParams.id) {
                loadStudentDetail($routeParams.id);
            } else {
                loadStudents();
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

        function loadStudents() {
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
            if (vm.filterBatch) params.batch = vm.filterBatch;

            StudentService.list(params)
                .then(function(response) {
                    vm.students = response.data || [];
                    if (response.pagination) {
                        vm.pagination.total = response.pagination.total || 0;
                        vm.pagination.totalPages = response.pagination.totalPages || 0;
                        vm.pagination.page = response.pagination.page || 1;
                    }
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load students';
                });
        }

        function search() {
            vm.pagination.page = 1;
            loadStudents();
        }

        function changePage(newPage) {
            if (newPage < 1 || newPage > vm.pagination.totalPages) return;
            vm.pagination.page = newPage;
            loadStudents();
        }

        function sortBy(field) {
            if (vm.sortField === field) {
                vm.sortDirection = vm.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                vm.sortField = field;
                vm.sortDirection = 'asc';
            }
            vm.pagination.page = 1;
            loadStudents();
        }

        // ── Detail ────────────────────────────────────────────

        function loadStudentDetail(id) {
            vm.isLoading = true;
            vm.error = null;

            StudentService.getById(id)
                .then(function(response) {
                    vm.student = response.data || {};
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load student details';
                });
        }

        // ── Form (Create / Edit) ─────────────────────────────

        function loadStudentForEdit(id) {
            vm.isLoading = true;
            vm.error = null;

            StudentService.getById(id)
                .then(function(response) {
                    var s = response.data || {};
                    vm.student = {
                        userId: {
                            name: s.userId.name || '',
                            email: s.userId.email || ''
                        },
                        rollNumber: s.rollNumber || '',
                        departmentId: s.departmentId._id || s.departmentId || '',
                        batch: s.batch || '',
                        semester: s.semester || 1
                    };
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load student';
                });
        }

        function save() {
            if (vm.isSaving) return;
            vm.isSaving = true;
            vm.error = null;

            var promise;
            if (vm.isEditing) {
                var updateData = {
                    name: vm.student.userId.name,
                    rollNumber: vm.student.rollNumber,
                    departmentId: vm.student.departmentId,
                    batch: vm.student.batch,
                    semester: vm.student.semester
                };
                promise = StudentService.update($routeParams.id, updateData);
            } else {
                promise = StudentService.create(vm.student);
            }

            promise
                .then(function() {
                    vm.isSaving = false;
                    Swal.fire({
                        icon: 'success',
                        title: vm.isEditing ? 'Student updated' : 'Student registered',
                        text: 'Student "' + vm.student.userId.name + '" saved successfully.',
                        timer: 2000,
                        showConfirmButton: false,
                        background: '#0f1425',
                        color: '#F5F7FF'
                    });
                    $location.path('/students');
                })
                .catch(function(error) {
                    vm.isSaving = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to save student';
                });
        }

        // ── Delete ────────────────────────────────────────────

        function confirmDelete(id, name) {
            if (!id && vm.student) {
                id = vm.student._id;
                name = vm.student.userId.name;
            }
            if (!id) return;

            Swal.fire({
                title: 'Delete student records?',
                text: 'Are you sure you want to remove "' + (name || 'this student') + '"? This will also affect their associated user account and enrollment history.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Delete',
                confirmButtonColor: '#ef4444',
                cancelButtonText: 'Cancel',
                background: '#0f1425',
                color: '#F5F7FF'
            }).then(function(result) {
                if (!result.isConfirmed) return;

                StudentService.remove(id)
                    .then(function() {
                        Swal.fire({
                            icon: 'success',
                            title: 'Removed',
                            text: 'Student records removed successfully.',
                            timer: 2000,
                            showConfirmButton: false,
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                        if ($routeParams.id) {
                            $location.path('/students');
                            $scope.$apply();
                        } else {
                            loadStudents();
                        }
                    })
                    .catch(function(error) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Delete failed',
                            text: (error && error.data && error.data.message) || 'Could not remove student.',
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                    });
            });
        }

        // ── Helpers ───────────────────────────────────────────

        function navigateBack() {
            $location.path('/students');
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
