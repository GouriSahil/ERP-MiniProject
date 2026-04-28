(function() {
    'use strict';

    angular
        .module('erpApp')
        .controller('TermController', TermController);

    TermController.$inject = [
        '$scope', '$location', '$routeParams',
        'AuthService', 'TermService'
    ];

    function TermController($scope, $location, $routeParams, AuthService, TermService) {
        var vm = this;

        // ── Shared state ──────────────────────────────────────
        vm.isLoading = true;
        vm.error = null;
        vm.currentUser = AuthService.getCurrentUser();

        // ── List view state ───────────────────────────────────
        vm.terms = [];

        // ── Form view state ───────────────────────────────────
        vm.term = {
            name: '',
            startDate: null,
            endDate: null,
            status: 'upcoming'
        };
        vm.isEditing = false;
        vm.isSaving = false;

        // ── Public methods ────────────────────────────────────
        vm.confirmDelete = confirmDelete;
        vm.save = save;
        vm.navigateBack = navigateBack;
        vm.formatDate = formatDate;
        vm.getStatusClass = getStatusClass;

        // ── Initialization ────────────────────────────────────
        init();

        function init() {
            if (!vm.currentUser) {
                $location.path('/login');
                return;
            }

            // Term management is for admins only
            var role = String(vm.currentUser.role).toLowerCase();
            if (role !== 'admin' && role !== 'super_admin' && role !== 'admin') {
                $location.path('/dashboard');
                return;
            }

            var path = $location.path();

            if (path === '/terms/create') {
                vm.isEditing = false;
                vm.isLoading = false;
            } else if ($routeParams.id && path.indexOf('/edit') !== -1) {
                vm.isEditing = true;
                loadTermForEdit($routeParams.id);
            } else {
                loadTerms();
            }
        }

        // ── List ──────────────────────────────────────────────

        function loadTerms() {
            vm.isLoading = true;
            vm.error = null;

            TermService.list()
                .then(function(response) {
                    vm.terms = response.data || [];
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load terms';
                });
        }

        // ── Form (Create / Edit) ─────────────────────────────

        function loadTermForEdit(id) {
            vm.isLoading = true;
            vm.error = null;

            TermService.getById(id)
                .then(function(response) {
                    var t = response.data || {};
                    vm.term = {
                        name: t.name || '',
                        startDate: t.startDate ? new Date(t.startDate) : null,
                        endDate: t.endDate ? new Date(t.endDate) : null,
                        status: t.status || 'upcoming'
                    };
                    vm.isLoading = false;
                })
                .catch(function(error) {
                    vm.isLoading = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to load term';
                });
        }

        function save() {
            if (vm.isSaving) return;
            vm.isSaving = true;
            vm.error = null;

            var promise;
            if (vm.isEditing) {
                promise = TermService.update($routeParams.id, vm.term);
            } else {
                promise = TermService.create(vm.term);
            }

            promise
                .then(function() {
                    vm.isSaving = false;
                    Swal.fire({
                        icon: 'success',
                        title: vm.isEditing ? 'Term updated' : 'Term created',
                        text: 'Academic term "' + vm.term.name + '" saved successfully.',
                        timer: 2000,
                        showConfirmButton: false,
                        background: '#0f1425',
                        color: '#F5F7FF'
                    });
                    $location.path('/terms');
                })
                .catch(function(error) {
                    vm.isSaving = false;
                    vm.error = (error && error.data && error.data.message) || 'Failed to save term';
                });
        }

        // ── Delete ────────────────────────────────────────────

        function confirmDelete(id, name) {
            if (!id) return;

            Swal.fire({
                title: 'Delete academic term?',
                text: 'Are you sure you want to delete "' + name + '"? This may affect course offerings and enrollments.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Delete',
                confirmButtonColor: '#ef4444',
                cancelButtonText: 'Cancel',
                background: '#0f1425',
                color: '#F5F7FF'
            }).then(function(result) {
                if (!result.isConfirmed) return;

                TermService.remove(id)
                    .then(function() {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted',
                            text: 'Term removed successfully.',
                            timer: 2000,
                            showConfirmButton: false,
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                        loadTerms();
                    })
                    .catch(function(error) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Delete failed',
                            text: (error && error.data && error.data.message) || 'Could not delete term.',
                            background: '#0f1425',
                            color: '#F5F7FF'
                        });
                    });
            });
        }

        // ── Helpers ───────────────────────────────────────────

        function navigateBack() {
            $location.path('/terms');
        }

        function formatDate(dateValue) {
            if (!dateValue) return '---';
            var d = new Date(dateValue);
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }

        function getStatusClass(status) {
            switch(String(status).toLowerCase()) {
                case 'active': return 'badge-success';
                case 'upcoming': return 'badge-primary';
                case 'completed': return 'badge-secondary';
                case 'cancelled': return 'badge-danger';
                default: return 'badge-light';
            }
        }
    }
})();
