(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('CourseController', CourseController);

    CourseController.$inject = [
        '$scope', '$location', '$routeParams',
        'AuthService', 'CourseService', 'DepartmentService'
    ];

    function CourseController($scope, $location, $routeParams, AuthService, CourseService, DepartmentService) {
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
        vm.courses = [];
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
        vm.course = {
            name: '',
            code: '',
            departmentId: '',
            credits: 3,
            description: '',
            level: 'beginner',
            elective: false,
            prerequisites: []
        };
        vm.isEditing = false;
        vm.isSaving = false;
        vm.allCourses = []; // For prerequisite selection

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

            // Load departments for filtering/dropdowns
            loadDepartments();

            var path = $location.path();

            if (path === '/courses/create') {
                vm.isEditing = false;
                loadAllCoursesForPrereqs(); // Need potential prereqs
                vm.isLoading = false;
            } else if ($routeParams.id && path.indexOf('/edit') !== -1) {
                vm.isEditing = true;
                loadCourseForEdit($routeParams.id);
                loadAllCoursesForPrereqs();
            } else if ($routeParams.id) {
                loadCourseDetail($routeParams.id);
            } else {
                loadCourses();
            }
        }

        // ── Lookups ───────────────────────────────────────────

        function loadDepartments() {
            DepartmentService.list({ limit: 100 })
                .then(function(response) {
                    vm.departments = response.data || [];
                });
        }

        function loadAllCoursesForPrereqs() {
            CourseService.list({ limit: 1000 })
                .then(function(response) {
                    vm.allCourses = (response.data || []).filter(function(c) {
                        return c._id !== $routeParams.id; // Exclude self
                    });
                });
        }

        // ── List ──────────────────────────────────────────────

        function loadCourses() {
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

            CourseService.list(params)
                .then(function(response) {
                    vm.courses = response.data || [];
                    if (response.pagination) {
                        vm.pagination.total = response.pagination.total || 0;
                        vm.pagination.totalPages = response.pagination.totalPages || 0;
                        vm.pagination.page = response.pagination.page || 1;
                    }
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load courses';
                });
        }

        function search() {
            vm.pagination.page = 1;
            loadCourses();
        }

        function changePage(newPage) {
            if (newPage < 1 || newPage > vm.pagination.totalPages) return;
            vm.pagination.page = newPage;
            loadCourses();
        }

        function sortBy(field) {
            if (vm.sortField === field) {
                vm.sortDirection = vm.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                vm.sortField = field;
                vm.sortDirection = 'asc';
            }
            vm.pagination.page = 1;
            loadCourses();
        }

        // ── Detail ────────────────────────────────────────────

        function loadCourseDetail(id) {
            vm.isLoading = true;
            vm.error = null;

            CourseService.getById(id)
                .then(function(response) {
                    vm.course = response.data || {};
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load course details';
                });
        }

        // ── Form (Create / Edit) ─────────────────────────────

        function loadCourseForEdit(id) {
            vm.isLoading = true;
            vm.error = null;

            CourseService.getById(id)
                .then(function(response) {
                    var c = response.data || {};
                    vm.course = {
                        name: c.name || '',
                        code: c.code || '',
                        departmentId: c.departmentId || '',
                        credits: c.credits || 3,
                        description: c.description || '',
                        level: c.level || 'beginner',
                        elective: c.elective || false,
                        prerequisites: (c.prerequisites || []).map(function(p) { return typeof p === 'object' ? p._id : p; })
                    };
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load course';
                });
        }

        function save() {
            if (vm.isSaving) return;
            vm.isSaving = true;
            vm.error = null;

            var promise;
            if (vm.isEditing) {
                promise = CourseService.update($routeParams.id, vm.course);
            } else {
                promise = CourseService.create(vm.course);
            }

            promise
                .then(function() {
                    vm.isSaving = false;
                    Swal.fire({
                        icon: 'success',
                        title: vm.isEditing ? 'Course updated' : 'Course created',
                        text: 'Course "' + vm.course.name + '" saved successfully.',
                        timer: 2000,
                        showConfirmButton: false,
                        background: '#0f1425',
                        color: '#F5F7FF'
                    });
                    $location.path('/courses');
                })
                .catch(function(error) {
                    vm.isSaving = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to save course';
                });
        }

        // ── Delete ────────────────────────────────────────────

        function confirmDelete(id, name) {
            if (!id && vm.course) {
                id = vm.course._id;
                name = vm.course.name;
            }
            if (!id) return;

            Swal.fire({
                title: 'Delete course?',
                text: 'Are you sure you want to delete "' + (name || 'this course') + '"?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Delete',
                confirmButtonColor: '#ef4444',
                cancelButtonText: 'Cancel',
                background: '#0f1425',
                color: '#F5F7FF'
            }).then(function(result) {
                if (!result.isConfirmed) return;

                CourseService.remove(id)
                    .then(function() {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted',
                            text: 'Course removed successfully.',
                            timer: 2000,
                            showConfirmButton: false,
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                        if ($routeParams.id) {
                            $location.path('/courses');
                            $scope.$apply();
                        } else {
                            loadCourses();
                        }
                    })
                    .catch(function(error) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Delete failed',
                            text: (error && error.data && error.data.message) || 'Could not delete course.',
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                    });
            });
        }

        // ── Helpers ───────────────────────────────────────────

        function navigateBack() {
            $location.path('/courses');
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
